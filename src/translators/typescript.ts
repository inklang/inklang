import fs from "node:fs/promises";
import { camelCase } from "change-case";

import Expr from "../expression";
import Stmt, { Function, Variable } from "../statement";

const noop = "";
const newline = "\n";

export class TranslatorTS {
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
      case "u32":
      case "i16":
      case "i32":
      case "f32":
      case "f64":
        type = "number";
        break;
      case "string":
      case "void":
        type = lexeme;
        break;
      default:
        throw new Error(`unknown variable type '${lexeme}'`);
    }

    return type;
  }

  private visit (statement: Stmt): string {
    if (statement instanceof Function) {
      if (!statement.exposed) return noop;

      let output = `export function ${camelCase(statement.name.lexeme)} (`; // function name
      for (let i = 0; i < statement.params.length; i++) {
        const param = statement.params[i];

        // we don't need the type because JS is dynamically typed
        output += `${param.name.lexeme}: ${this.type(param.type.lexeme)}${i !== statement.params.length - 1 ? ", " : ""}`;
      }

      output += `): ${this.type(statement.returnType.lexeme)};` + newline;

      return output;
    }
    else if (statement instanceof Variable) {
      return noop;
    }
    else if (statement instanceof Expr.Literal) {
      return noop;
    }

    throw new Error(`cannot translate '${statement.constructor.name}'`);
  }

  public async execute (): Promise<void> {
    await fs.mkdir(`target/javascript`, { recursive: true });
    await fs.writeFile("target/javascript/lib.d.ts", this.translate());
  }
}
