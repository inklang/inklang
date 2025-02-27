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

  private _functionScope: Function | undefined;

  private visit (statement: Stmt): string {
    if (statement instanceof Function) {
      let output = "";
      this._functionScope = statement;
      if (statement.exposed) output = "pub ";

      let returnType = statement.returnType instanceof Token
        ? this.type(statement.returnType.lexeme)
        : this.visit(statement.returnType);

      if (statement.async) {
        output += "async ";
      }

      output += `fn ${snakeCase(statement.name.lexeme)} (`;

      output += statement.params.map(
        (param) => `${snakeCase(param.name.lexeme)}: ${
          param.type instanceof Token
            ? this.type(param.type.lexeme)
            : this.visit(param.type)
        }`
      ).join(", ");

      output += `) -> ${returnType} {\n`;

      for (const stmt of statement.body) {
        output += "\t" + this.visit(stmt) + "\n";
      }

      output += "}\n";

      delete this._functionScope;
      return output;
    }
    else if (statement instanceof Variable) {
      let output = `let mut ${snakeCase(statement.name.lexeme)}`;

      if (statement.initializer) {
        output += ` = ${this.visit(statement.initializer)}`;
      }

      return output + ";";
    }
    else if (statement instanceof Expr.Literal) {
      let output = JSON.stringify(statement.value);
      if (typeof statement.value === "string") {
        output = `String::from(${output})`;
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

      let output = "";
      if (statement.exposed) output = "pub ";

      const className = pascalCase(statement.name.lexeme);
      output += `struct ${className} {\n`;

      for (const field of statement.fields) {
        const fieldName = snakeCase(field.name.lexeme);
        output += `\tpub ${fieldName}: ${this.type(field.type.lexeme)},\n`;
      }

      output += "}\n";

      return output;
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
    else if (statement instanceof Expr.Get) {
      const object = this.visit(statement.object);
      const name = statement.name.lexeme;

      return `${object}.${name}`;
    }
    else if (statement instanceof RecordInstanciationExpr) {
      let output = `${pascalCase(statement.name.lexeme)} {`;

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

        output += `${snakeCase(field.name.lexeme)}: ${value}, `;
      }

      // we remove the extra `, ` at the end.
      if (statement.fields.length > 0) {
        output = output.slice(0, -2);
      }

      output += "}";
      return output;
    }

    throw new Error(`cannot translate '${statement.constructor.name}'`);
  }
}
