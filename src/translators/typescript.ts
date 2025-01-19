import fs from "node:fs/promises";
import { camelCase } from "change-case";

import Expr from "../expression";
import Stmt, { Function, Record, Variable } from "../statement";
import { pascalCase } from "change-case";

const tab = "  ";
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
        output += `${camelCase(param.name.lexeme)}: ${this.type(param.type.lexeme)}${i !== statement.params.length - 1 ? ", " : ""}`;
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
    else if (statement instanceof Record) {
      if (!statement.exposed) return noop;

      const className = pascalCase(statement.name.lexeme);
      let output = `export class ${className} {` + newline;

      for (const field of statement.fields) {
        const visibility = field.visibility ? field.visibility.lexeme : "public";
        output += tab + `${visibility} ${camelCase(field.name.lexeme)}: ${this.type(field.type.lexeme)};` + newline;
      }

      output += tab + "constructor (";
      for (let i = 0; i < statement.fields.length; i++) {
        const field = statement.fields[i];
        output += `${camelCase(field.name.lexeme)}: ${this.type(field.type.lexeme)}${i !== statement.fields.length - 1 ? ", " : ""}`;
      }
      output += ");" + newline;

      output += '}';
      return output;
    }

    throw new Error(`cannot translate '${statement.constructor.name}'`);
  }

  public async execute (): Promise<void> {
    await fs.mkdir(`target/javascript`, { recursive: true });
    await fs.writeFile("target/javascript/lib.d.ts", this.translate());
  }
}
