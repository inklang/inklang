import fs from "node:fs/promises";
import { camelCase } from "change-case";

import Expr from "../expression";
import Stmt, { Function, Variable } from "../statement";

const tab = "  ";
const newline = "\n";

export class TranslatorJS {
  public constructor (
    private readonly statements: Array<Stmt>,
    private readonly type: "cjs" | "mjs"
  ) {}

  public translate (): string {
    return this.statements.map(
      (statement) => this.visit(statement)
    ).join('\n');
  }

  private visit (statement: Stmt): string {
    if (statement instanceof Function) {
      let output = "";

      if (statement.exposed && this.type === "mjs") {
        output += "export ";
      }

      const functionName = camelCase(statement.name.lexeme)
      output += `const ${functionName} = (`;
      for (let i = 0; i < statement.params.length; i++) {
        const param = statement.params[i];

        // we don't need the type because JS is dynamically typed
        output += `${param.name.lexeme}${i !== statement.params.length - 1 ? ", " : ""}`;
      }

      output += ') => {' + newline;

      for (const stmt of statement.body) {
        output += tab + this.visit(stmt) + newline;
      }

      output += '};';

      if (statement.exposed && this.type === "cjs") {
        output += newline + `exports.${functionName} = ${functionName};`;
      }

      return output;
    }
    else if (statement instanceof Variable) {
      return `let ${statement.name.lexeme} = ${statement.initializer ? this.visit(statement.initializer) : 'void 0'};`;
    }
    else if (statement instanceof Expr.Literal) {
      return statement.value!.toString();
    }

    throw new Error(`cannot translate '${statement.constructor.name}'`);
  }

  private fileExtension (): string {
    switch (this.type) {
      case "cjs":
        return "js";
      case "mjs":
        return "mjs";
    }
  }

  public async execute (): Promise<void> {
    await fs.mkdir(`target/javascript`, { recursive: true });
    await fs.writeFile(`target/javascript/lib.${this.fileExtension()}`, this.translate());
  }
}
