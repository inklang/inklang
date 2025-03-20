import fs from "node:fs/promises";
import { camelCase } from "change-case";

import Expr from "../expression";
import Stmt, { Function, RecordStmt, Variable } from "../statement";
import { pascalCase } from "change-case";

const tab = "  ";
const newline = "\n";

export class TranslatorKotlin {
  public constructor (private readonly statements: Array<Stmt>) {}

  public translate (): string {
    return this.statements.map(
      (statement) => this.visit(statement)
    ).join('\n');
  }

  private type (lexeme: string): string {
    let type: string;

    switch (lexeme) {
      case "u16":
        type = "UShort";
        break;
      case "u32":
        type = "UInt";
        break;
      case "i16":
        type = "Short";
        break;
      case "i32":
        type = "Int";
        break;
      case "f32":
        type = "Float";
        break;
      case "f64":
        type = "Double";
        break;
      case "string":
        type = "String";
        break;
      case "void":
        type = "Unit";
        break;
      case "boolean":
        type = "Boolean";
        break;
      default:
        throw new Error(`unknown variable type '${lexeme}'`);
    }

    return type;
  }

  private visit (statement: Stmt): string {
    if (statement instanceof Function) {
      let output = `fun ${camelCase(statement.name.lexeme)} (`;

      output += statement.params.map(
        (param) => `${camelCase(param.name.lexeme)}: ${this.type(param.type.lexeme)}`
      ).join(", ");

      output += `): ${this.type(statement.returnType.lexeme)} {` + newline;

      for (const stmt of statement.body) {
        output += tab + this.visit(stmt) + newline;
      }

      output += '}';
      return output;
    }
    else if (statement instanceof Variable) {
      const initialValue = statement.initializer ? this.visit(statement.initializer) : 'null';

      let type = this.type(statement.type.lexeme);
      if (!statement.initializer) {
        type += "?";
      }

      return `var ${camelCase(statement.name.lexeme)}: ${type} = ${initialValue}`;
    }
    else if (statement instanceof Expr.Literal) {
      return JSON.stringify(statement.value);
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
      return camelCase(statement.name.lexeme);
    }
    else if (statement instanceof RecordStmt) {
      let tokens: string[] = [];
      let output: string;

      if (!statement.exposed) tokens.push("internal");
      tokens.push("data", "class", pascalCase(statement.name.lexeme));
      tokens.push("(");
      output = tokens.join(" ") + newline;

      const fields = statement.fields.map(
        (field) => tab + `val ${camelCase(field.name.lexeme)}: ${this.type(field.type.lexeme)}`
      ).join("," + newline);
      output += fields + newline;

      output += ')';
      return output;
    }
    else if (statement instanceof Stmt.Expression) {
      return this.visit(statement.expression);
    }
    else if (statement instanceof Expr.Assign) {
      return `${camelCase(statement.name.lexeme)} = ${this.visit(statement.value)}`;
    }

    throw new Error(`cannot translate '${statement.constructor.name}'`);
  }
}
