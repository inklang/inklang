import fs from "node:fs/promises";
import { camelCase } from "change-case";

import Expr from "../expression";
import Stmt, { Function, Variable } from "../statement";

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
      default:
        throw new Error(`unknown variable type '${lexeme}'`);
    }

    return type;
  }

  private visit (statement: Stmt): string {
    if (statement instanceof Function) {
      let output = `fun ${camelCase(statement.name.lexeme)}(`;
      for (let i = 0; i < statement.params.length; i++) {
        const param = statement.params[i];
        output += `${param.name.lexeme}: ${this.type(param.type.lexeme)}${i !== statement.params.length - 1 ? ", " : ""}`;
      }

      output += `): ${this.type(statement.returnType.lexeme)} {` + newline;

      for (const stmt of statement.body) {
        output += tab + this.visit(stmt) + newline;
      }

      output += '}';
      return output;
    }
    else if (statement instanceof Variable) {
      return `val ${statement.name.lexeme} = ${statement.initializer ? this.visit(statement.initializer) : 'void 0'};`;
    }
    else if (statement instanceof Expr.Literal) {
      return statement.value!.toString();
    }

    throw new Error(`cannot translate '${statement.constructor.name}'`);
  }

  public async execute (): Promise<void> {
    await fs.mkdir(`target/kotlin`, { recursive: true });
    await fs.writeFile("target/kotlin/lib.kt", this.translate());
  }
}
