import { pascalCase, snakeCase } from "change-case";

import Expr, { AnnotationExpr, RecordInstanciationExpr } from "../expression";
import Stmt, { Enum, For, Function, RecordStmt, Variable } from "../statement";
import { Token } from "../token";
import Scope from "./helpers/scope";

enum RustScopeType {
  FUNCTION_TYPE = "fn",
  RECORD_TYPE = "record",
  ENUM_TYPE = "enum",
}

export class TranslatorRust {
  public constructor (
    private readonly statements: Array<Stmt>
  ) {}

  private recordsAndEnums: Set<string> = new Set();

  public translate (): string {
    // We start by translating the statements.
    const statements = this.statements.map(
      (statement) => this.visit(statement)
    )

    return statements.join("\n");
  }

  private scope: Scope = new Scope();

  private type (lexeme: string): string {
    let type: string;

    switch (lexeme) {
      case "i16":
      case "u16":
      case "i32":
      case "u32":
      case "f32":
      case "f64":
      case "u64":
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
        if (this.recordsAndEnums.has(lexeme)) {
          type = pascalCase(lexeme);
        }
        else throw new Error(`unknown variable type '${lexeme}'`);
      }
    }

    return type;
  }

  private typeIdentifierOrAnnotation (type: Token | AnnotationExpr): string {
    return type instanceof Token
      ? this.type(type.lexeme)
      : this.visitAnnotationExpr(type, true);
  }

  private _indentDepth = 0;

  private indent (): string {
    return "\t".repeat(this._indentDepth);
  }

  private appendSemiColon (output: string): string {
    if (output.trim().startsWith("for"))  {
      return output;
    }

    return output + ";";
  }

  private visit (statement: Stmt): string {
    if (statement instanceof Function) {

      const head: string[] = [];

      if (statement.exposed)
        head.push("pub");

      if (statement.async)
        head.push("async");

      const name = snakeCase(statement.name.lexeme);
      this.scope.define(name, RustScopeType.FUNCTION_TYPE);
      this.scope = new Scope(this.scope);
      head.push("fn", name);

      const args = statement.params.map(
        (param) => {
          const name = snakeCase(param.name.lexeme);
          const type = this.typeIdentifierOrAnnotation(param.type);
          this.scope.define(name, this.typeIdentifierOrAnnotation(param.type));

          return `mut ${name}: ${type}`
        }
      ).join(", ");

      const returnType = this.typeIdentifierOrAnnotation(statement.returnType);
      const signature = head.join(" ") + `(${args}) -> ${returnType}`;

      this._indentDepth++;
      const body = statement.body.map(statement => this.appendSemiColon(
        this.indent() + this.visit(statement)
      ));

      this._indentDepth--;
      this.scope = this.scope.parent!;
      return signature + " {\n" + body.join("\n") + "\n}";
    }
    else if (statement instanceof Variable) {
      const name = snakeCase(statement.name.lexeme);
      const type = this.typeIdentifierOrAnnotation(statement.type);

      // We always `mut` the variable, just in case.
      // Anyway, `clippy` will automatically fix it during the `generate` command.
      let output = `let mut ${name}`;
      output += `: ${type}`;

      // We need to keep track of the variables in the function scope.
      this.scope.define(name, type);

      if (statement.initializer)
        output += ` = ${this.visit(statement.initializer)}`;

      return output;
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
        return "return";
      }
      else {
        return `return ${this.visit(statement.value)}`;
      }
    }
    else if (statement instanceof Expr.Binary) {
      const left = this.visit(statement.left);
      const right = this.visit(statement.right);
      const operator = statement.operator.lexeme;

      return `${left} ${operator} ${right}`;
    }
    else if (statement instanceof Expr.Variable) {
      const name = snakeCase(statement.name.lexeme);

      if (this.scope.resolve(name)) {
        const type = this.scope.typeOf(name);

        switch (type) {
          // let mut something = "something".to_string();
          // let mut definition = HelloWorld {
          //   hello: something,
          //   world: something
          // };
          //
          // This is not what we want, because `hello`
          // borrows the value of `something` and we
          // cannot borrow it again.
          //
          // We need to clone the value of `something`.
          case "String":
          case "inklang_json::Value":
            return `${name}.clone()`;
        }
      }

      return name;
    }
    else if (statement instanceof RecordStmt) {
      this.recordsAndEnums.add(statement.name.lexeme);

      const derives = ["Debug", "Clone"];
      const head: string[] = [];

      if (statement.exposed)
        head.push("pub");

      const name = pascalCase(statement.name.lexeme);
      this.scope.define(name, RustScopeType.RECORD_TYPE);
      head.push("struct", name);

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
      return `${snakeCase(statement.name.lexeme)} = ${this.visit(statement.value)}`;
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

      for (const field of statement.fields) {
        const value = this.visit(field.value);
        output += this.indent() + `${snakeCase(field.name.lexeme)}: ${value},\n`;
      }

      this._indentDepth--;
      output += this.indent() + "}";

      return output;
    }
    else if (statement instanceof For) {
      const variableName = snakeCase(statement.identifier.lexeme);
      this.scope = new Scope(this.scope);
      this.scope.define(variableName, this.typeIdentifierOrAnnotation(statement.type));

      const head = `for mut ${variableName} in ${this.visit(statement.iterable)} {`;

      this._indentDepth++;
      const body = statement.body.map(statement => this.appendSemiColon(
        this.indent() + this.visit(statement)
      ));

      this._indentDepth--;
      this.scope = this.scope.parent!;
      return head + "\n" + body.join("\n") + "\n" + this.indent() + "}";
    }
    else if (statement instanceof Stmt.If) {
      const condition = this.visit(statement.condition);

      this._indentDepth++;

      const thenBody = statement.thenBranch.map(statement => this.appendSemiColon(
        this.indent() + this.visit(statement)
      ));

      this._indentDepth--;

      let output = `if ${condition} {\n` + thenBody.join("\n") + "\n" + this.indent() + "}";

      if (statement.elseBranch) {
        this._indentDepth++;

        const elseBody = statement.elseBranch.map(statement => this.appendSemiColon(
          this.indent() + this.visit(statement)
        ));

        this._indentDepth--;

        output += "\n" + this.indent() + "else {\n" + elseBody.join("\n") + "\n" + this.indent() + "}";
      }

      return output;
    }
    else if (statement instanceof Enum) {
      this.recordsAndEnums.add(statement.name.lexeme);

      const derives = ["Debug", "Clone", "PartialEq", "serde::Serialize", "serde::Deserialize"];
      const head: string[] = [];

      if (statement.exposed)
        head.push("pub");

      const name = pascalCase(statement.name.lexeme);
      this.scope.define(name, RustScopeType.ENUM_TYPE);
      head.push("enum", name);

      this._indentDepth++;

      const fields = statement.fields.map(
        (field) => {
          const lines: string[] = [];

          if (field.value instanceof Expr.Literal) {
            lines.push(`#[serde(rename = ${JSON.stringify(field.value.value)})]`);
          } else throw new Error(`unknown field value type '${field.value.constructor.name}'`);

          lines.push(`${pascalCase(field.name.lexeme)}`)

          return lines.map(line => this.indent() + line).join("\n");
        }).join(",\n");

      this._indentDepth--;

      return "#[derive(" + derives.join(", ") + ")]\n" + head.join(" ") + " {\n" + fields + "\n}";
    }

    throw new Error(`cannot translate '${statement.constructor.name}'`);
  }

  private visitAnnotationExpr (statement: AnnotationExpr, isType: boolean): string {
    const namespace = snakeCase(statement.namespace.lexeme);
    const fnOrProperty = isType ? pascalCase(statement.property.lexeme) : snakeCase(statement.property.lexeme);

    let expr = `inklang_${namespace}::${fnOrProperty}`;

    // NOTE: Here we're patching the generated code depending
    //       on the namespace and the property because some
    //       of them needs to be handled differently.
    if (namespace === "json" && fnOrProperty === "get_property") {
      expr += "!"; // Make it a macro call !
    }

    if (!statement.generic) return expr;
    return `${expr}::<${this.typeIdentifierOrAnnotation(statement.generic)}>`;
  }
}
