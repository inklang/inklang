import { camelCase, pascalCase, snakeCase } from "change-case";

import Expr, { AnnotationExpr, RecordInstanciationExpr } from "../expression";
import Stmt, { Function, RecordField, RecordStmt, Variable } from "../statement";
import { Token } from "../token";

export class TranslatorRust {
  public constructor (
    private readonly statements: Array<Stmt>
  ) {}

  private records: Set<string> = new Set();

  public translate (): string {
    // We start by translating the statements.
    const statements = this.statements.map(
      (statement) => this.visit(statement)
    )

    return statements.join("\n");
  }

  private type (lexeme: string): string {
    let type: string;

    switch (lexeme) {
      case "u16":
      case "u32":
      case "i16":
      case "i32":
      case "f32":
      case "f64":
        type = lexeme;
        break;
      case "boolean":
        type = "bool";
        break;
      case "string":
        type = "String";
        break;
      case "void":
        type = "()";
        break;
      default: {
        if (this.records.has(lexeme)) {
          type = pascalCase(lexeme);
        }
        else throw new Error(`unknown variable type '${lexeme}'`);
      }
    }

    return type;
  }

  private typeIdentifierOrAnnotation (type: Token | AnnotationExpr): string {
    const output = type instanceof Token
      ? this.type(type.lexeme)
      : this.visitAnnotationExpr(type, true);

    return output;
  }

  private _functionScope: Function | undefined;
  // private _isType: boolean | undefined;
  private _indentDepth = 0;

  private indent (): string {
    return "\t".repeat(this._indentDepth);
  }

  private visit (statement: Stmt): string {
    if (statement instanceof Function) {
      this._functionScope = statement;
      const head: string[] = [];

      if (statement.exposed)
        head.push("pub");

      if (statement.async)
        head.push("async");

      head.push("fn", snakeCase(statement.name.lexeme));

      const args = statement.params.map(
        (param) => `${snakeCase(param.name.lexeme)}: ${this.typeIdentifierOrAnnotation(param.type)}`
      ).join(", ");

      const returnType = this.typeIdentifierOrAnnotation(statement.returnType);
      const signature = head.join(" ") + `(${args}) -> ${returnType}`;

      this._indentDepth++;
      const body = statement.body.map(statement => (
        this.indent() + this.visit(statement)
      ));

      delete this._functionScope;
      this._indentDepth--;

      return signature + " {\n" + body.join("\n") + "\n" + "}";
    }
    else if (statement instanceof Variable) {
      // We always `mut` the variable, just in case.
      // Anyway, `clippy` will automatically fix it during the `generate` command.
      let output = `let mut ${snakeCase(statement.name.lexeme)}`;
      output += `: ${this.typeIdentifierOrAnnotation(statement.type)}`;

      if (statement.initializer)
        output += ` = ${this.visit(statement.initializer)}`;

      return output + ";";
    }
    else if (statement instanceof Expr.Literal) {
      let output = JSON.stringify(statement.value);

      // Literal strings are `&str` in Rust,
      // we need to convert them to `String`.
      if (typeof statement.value === "string") {
        output = `${output}.to_string()`;
      }

      return output;
    }
    else if (statement instanceof Stmt.Return) {
      if (statement.value === null) {
        return "return;";
      }
      else {
        return `return ${this.visit(statement.value)};`;
      }
    }
    else if (statement instanceof Expr.Binary) {
      const left = this.visit(statement.left);
      const right = this.visit(statement.right);
      const operator = statement.operator.lexeme;

      return `${left} ${operator} ${right}`;
    }
    else if (statement instanceof Expr.Variable) {
      return snakeCase(statement.name.lexeme);
    }
    else if (statement instanceof RecordStmt) {
      this.records.add(statement.name.lexeme);

      const derives = ["Debug", "Clone"];
      const head: string[] = [];

      if (statement.exposed)
        head.push("pub");

      head.push("struct", pascalCase(statement.name.lexeme));

      this._indentDepth++;

      const fields = statement.fields.map(
        (field) => this.indent() + `pub ${snakeCase(field.name.lexeme)}: ${this.typeIdentifierOrAnnotation(field.type)},`
      ).join("\n");

      this._indentDepth--;

      return "#[derive(" + derives.join(", ") + ")]\n" + head.join(" ") + " {\n" + fields + "\n}";
    }
    else if (statement instanceof Stmt.Expression) {
      return this.visit(statement.expression);
    }
    else if (statement instanceof Expr.Assign) {
      return `let mut ${snakeCase(statement.name.lexeme)} = ${this.visit(statement.value)};`;
    }
    else if (statement instanceof Expr.Call) {
      const callee = this.visit(statement.callee);
      const args = statement.args.map((arg) => this.visit(arg)).join(", ");

      let call = `${callee}(${args})`;
      if (statement.awaited) {
        call = `${call}.await`;
      }

      return call;
    }
    else if (statement instanceof AnnotationExpr) {
      return this.visitAnnotationExpr(statement, false);
    }
    else if (statement instanceof Expr.Get) {
      const object = this.visit(statement.object);
      const name = statement.name.lexeme;

      return `${object}.${name}`;
    }
    else if (statement instanceof RecordInstanciationExpr) {
      let output = pascalCase(statement.name.lexeme) + " {\n";
      this._indentDepth++;

      const fieldsValue = statement.fields.map(field => this.visit(field.value));
      for (const field of statement.fields) {
        let value = fieldsValue.shift()!;

        // We're preventing a very specific case right here.
        //
        // var something: string = "hello";
        // var definition: a_record = a_record {
        //   hello: something,
        //   world: something
        // };
        //
        // In this case, the following code will be generated:
        //
        // let mut something = "hello";
        // let mut definition = ARecord {
        //   hello: something,
        //   world: something
        // };
        //
        // This is not what we want, we want to clone the value
        // because `hello` borrows the value of `something`
        // and we cannot borrow it again.
        //
        // We want to clone the value of `something`.
        //
        if (fieldsValue.includes(value)) {
          value += ".clone()";
        }

        output += this.indent() + `${snakeCase(field.name.lexeme)}: ${value},\n`;
      }

      this._indentDepth--;
      output += this.indent() + "}";

      return output;
    }

    throw new Error(`cannot translate '${statement.constructor.name}'`);
  }

  private visitAnnotationExpr (statement: AnnotationExpr, isType: boolean): string {
    const namespace = snakeCase(statement.namespace.lexeme);
    const fnOrProperty = isType ? pascalCase(statement.property.lexeme) : snakeCase(statement.property.lexeme);

    const call = `inklang_${namespace}::${fnOrProperty}`;
    if (!statement.generic) return call;
    return `${call}::<${this.typeIdentifierOrAnnotation(statement.generic)}>`;
  }
}
