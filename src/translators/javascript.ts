import fs from "node:fs/promises";
import { camelCase, pascalCase } from "change-case";

import Expr, { AnnotationExpr } from "../expression";
import Stmt, { Function, RecordStmt, Variable } from "../statement";

const tab = "  ";
const newline = "\n";

export class TranslatorJS {
  public constructor (
    private readonly statements: Array<Stmt>,
    private readonly type: "cjs" | "mjs"
  ) {}

  /**
   * Used to keep track of the necessary imports.
   * - See `this.translateImports` for the translation to JS code.
   * - See `this.import` for adding new imports. 
   */
  private imports: Record<string, Set<string>> = {};

  public translate (): string {
    // We cleanup the necessary imports.
    this.imports = {};

    // We start by translating the statements.
    const statements = this.statements.map(
      (statement) => this.visit(statement)
    )

    // We then join the imports and statements with a newline.
    // We introduce a separator between the imports and the statements for better readability.
    return [...this.translateImports(), "", ...statements].join(newline);
  }

  private import (namespace: string, fnOrProperty: string): void {
    if (!this.imports[namespace]) {
      this.imports[namespace] = new Set([fnOrProperty]);
    }
    else {
      this.imports[namespace].add(fnOrProperty);
    }
  }

  /**
   * Used at the end of the translation.
   * Makes sure to import all the necessary functions and properties.
   * We also rename them to avoid conflicts and match the prefixed ones in the code.
   */
  private translateImports (): string[] {
    const imports: string[] = [];

    for (const [namespace, raw] of Object.entries(this.imports)) {
      if (this.type === "cjs") {
        const prefixed = Array.from(raw).map(fnOrProperty => {
          return `${fnOrProperty}: ${this.annotation(namespace, fnOrProperty)}`;
        });

        imports.push(`const { ${prefixed.join(", ")} } = require("@inklang/${namespace}");`);
      }
      else if (this.type === "mjs") {
        const prefixed = Array.from(raw).map(fnOrProperty => {
          return `${fnOrProperty} as ${this.annotation(namespace, fnOrProperty)}`;
        });

        imports.push(`import { ${prefixed.join(", ")} } from "@inklang/${namespace}";`);
      }
    }

    return imports;
  }

  /**
   * Prefixed name for the annotation to avoid conflicts.
   */
  private annotation (namespace: string, fnOrProperty: string): string {
    return "inklang__" + namespace + "_" + fnOrProperty;
  }

  private visit (statement: Stmt): string {
    if (statement instanceof Function) {
      let output = "";

      if (statement.exposed && this.type === "mjs") {
        output += "export ";
      }

      const functionName = camelCase(statement.name.lexeme)
      output += `const ${functionName} = ${statement.async ? "async" : ""} (`;
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
      let output = `let ${camelCase(statement.name.lexeme)}`;

      if (statement.initializer) {
        output += ` = ${this.visit(statement.initializer)}`;
      }

      return output + ";";
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
    else if (statement instanceof RecordStmt) {
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
    else if (statement instanceof Stmt.Expression) {
      return this.visit(statement.expression);
    }
    else if (statement instanceof Expr.Assign) {
      return `${camelCase(statement.name.lexeme)} = ${this.visit(statement.value)};`;
    }
    else if (statement instanceof Expr.Call) {
      const callee = this.visit(statement.callee);
      const args = statement.args.map((arg) => this.visit(arg)).join(", ");
      
      let call = `${callee}(${args})`;
      if (statement.awaited) {
        call = `await ${call}`;
      }

      return call;
    }
    else if (statement instanceof AnnotationExpr) {
      const namespace = camelCase(statement.namespace.lexeme);
      const fnOrProperty = camelCase(statement.property.lexeme);

      // Add it to the imports property so we make sure to import it in the code at the end.
      this.import(namespace, fnOrProperty);

      // We use a prefixed name to avoid conflicts with other variables.
      return this.annotation(namespace, fnOrProperty)
    }

    throw new Error(`cannot translate '${statement.constructor.name}'`);
  }
}
