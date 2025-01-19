import fs from "node:fs/promises";
import { camelCase, pascalCase } from "change-case";

import Expr from "../expression";
import Stmt, { Function, Record, Variable } from "../statement";

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
        output += `${camelCase(param.name.lexeme)}${i !== statement.params.length - 1 ? ", " : ""}`;
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
      return `let ${camelCase(statement.name.lexeme)} = ${statement.initializer ? this.visit(statement.initializer) : 'void 0'};`;
    }
    else if (statement instanceof Expr.Literal) {
      return JSON.stringify(statement.value);
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
      return camelCase(statement.name.lexeme);
    }
    else if (statement instanceof Record) {
      let output = "";

      if (statement.exposed && this.type === "mjs") {
        output += "export ";
      }

      const className = pascalCase(statement.name.lexeme);
      output += `class ${className} {` + newline;

      for (const field of statement.fields) {
        const fieldName = camelCase(field.name.lexeme);
        output += tab + fieldName + ";" + newline;
      }

      output += tab + "constructor (";
      for (let i = 0; i < statement.fields.length; i++) {
        const field = statement.fields[i];
        const fieldName = camelCase(field.name.lexeme);
        output += `${fieldName}${i !== statement.fields.length - 1 ? ", " : ""}`;
      }
      output += ") {" + newline;

      for (const field of statement.fields) {
        const fieldName = camelCase(field.name.lexeme);
        output += tab.repeat(2) + `this.${fieldName} = ${fieldName};` + newline;
      }

      output += tab + '}' + newline;
      output += '}' + newline;

      if (statement.exposed && this.type === "cjs") {
        output += newline + `exports.${className} = ${className};`;
      }

      return output;
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
