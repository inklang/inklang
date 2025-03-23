import { camelCase, pascalCase, constantCase } from "change-case";

import Expr, { AnnotationExpr, RecordInstanciationExpr } from "../expression";
import Stmt, { Enum, For, Function, RecordField, RecordStmt, Variable } from "../statement";

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
  private recordsFields: Map<string, Array<RecordField>> = new Map();

  public translate (): string {
    // We cleanup the necessary imports.
    this.imports = {};

    // We start by translating the statements.
    const statements = this.statements.map(
      (statement) => this.visit(statement)
    )

    // We then join the imports and statements with a newline.
    // We introduce a separator between the imports and the statements for better readability.
    return [...this.translateImports(), "", ...statements].join("\n");
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

  private _indentDepth = 0;

  private indent (): string {
    return "\t".repeat(this._indentDepth);
  }

  private appendSemiColon (output: string): string {
    const trimmed = output.trim();

    if (trimmed.startsWith("for") || trimmed.startsWith("if")) {
      return output;
    }

    return output + ";";
  }

  private visit (statement: Stmt): string {
    if (statement instanceof Function) {
      const head: string[] = [];

      if (statement.exposed && this.type === "mjs")
        head.push("export");

      const name = camelCase(statement.name.lexeme)
      head.push("const", name, "=");

      if (statement.async)
        head.push("async");

      const args = statement.params.map(
        (param) => camelCase(param.name.lexeme)
      ).join(", ");

      const signature = head.join(" ") + ` (${args}) =>`;

      this._indentDepth++;
      const body = statement.body.map(statement => this.appendSemiColon(
        this.indent() + this.visit(statement)
      ));

      this._indentDepth--;

      const output = signature + " {\n" + body.join("\n") + "\n}";

      if (statement.exposed && this.type === "cjs") {
        return output + this.appendSemiColon(`\nexports.${name} = ${name}`);
      }

      return output;
    }
    else if (statement instanceof Variable) {
      let output = `let ${camelCase(statement.name.lexeme)}`;

      if (statement.initializer) {
        output += ` = ${this.visit(statement.initializer)}`;
      }

      return output;
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
      this.recordsFields.set(statement.name.lexeme, statement.fields);

      const head: string[] = [];

      if (statement.exposed)
        head.push("export");

      const name = pascalCase(statement.name.lexeme);
      head.push("class", name);

      this._indentDepth++;

      const fields = statement.fields.map(
        (field) => this.indent() + `${camelCase(field.name.lexeme)};`
      ).join("\n");

      const constructor = this.indent() + "constructor (" + statement.fields.map(
        (field) => `${camelCase(field.name.lexeme)}`
      ).join(", ") + ")";

      this._indentDepth++;

      const constructorBody = statement.fields.map(
        (field) => {
          const name = camelCase(field.name.lexeme);
          return this.indent() + `this.${name} = ${name};`;
        }
      ).join("\n");

      this._indentDepth--;

      const body = fields + "\n" + constructor + " {\n" + constructorBody + "\n" + this.indent() + "}";

      this._indentDepth--;
      const output = head.join(" ") + " {\n" + body + "\n" + "}";

      if (statement.exposed && this.type === "cjs") {
        return output + this.appendSemiColon(`\nexports.${name} = ${name}`);
      }

      return output;
    }
    else if (statement instanceof Stmt.Expression) {
      return this.visit(statement.expression);
    }
    else if (statement instanceof Expr.Assign) {
      return `${camelCase(statement.name.lexeme)} = ${this.visit(statement.value)}`;
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
    else if (statement instanceof Expr.Get) {
      const object = this.visit(statement.object);
      const name = statement.name.lexeme;

      return `${object}.${name}`;
    }
    else if (statement instanceof RecordInstanciationExpr) {
      const fieldsInOrder = this.recordsFields.get(statement.name.lexeme);

      if (!fieldsInOrder)
        throw new Error(`record ${statement.name.lexeme} should be defined before`);

      const className = pascalCase(statement.name.lexeme);
      let output = `new ${className}(`;

      for (const definedField of fieldsInOrder) {
        const field = statement.fields.find(field => field.name.lexeme === definedField.name.lexeme);

        if (!field) output += "void 0";
        else output += this.visit(field.value);

        output += ", ";
      }

      // we remove the extra `, ` at the end.
      if (statement.fields.length > 0) {
        output = output.slice(0, -2);
      }

      return output + ")";
    }
    else if (statement instanceof For) {
      const head = `for (let ${camelCase(statement.identifier.lexeme)} of ${this.visit(statement.iterable)}) {`;

      this._indentDepth++;
      const body = statement.body.map(statement => this.appendSemiColon(
        this.indent() + this.visit(statement)
      ));

      this._indentDepth--;

      return head + "\n" + body.join("\n") + "\n" + this.indent() + "}";
    }
    else if (statement instanceof Stmt.If) {
      const condition = this.visit(statement.condition);

      this._indentDepth++;

      const thenBody = statement.thenBranch.map(statement => this.appendSemiColon(
        this.indent() + this.visit(statement)
      ));

      this._indentDepth--;

      let output = `if (${condition}) {\n` + thenBody.join("\n") + "\n" + this.indent() + "}";

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
      const head: string[] = [];

      if (statement.exposed && this.type === "mjs")
        head.push("export");

      const name = pascalCase(statement.name.lexeme);
      head.push("const", name);

      this._indentDepth++;

      const fields = statement.fields.map(
        (field) => {
          if (!(field.value instanceof Expr.Literal)) {
            throw new Error(`unknown field value type '${field.value.constructor.name}'`);
          }

          return this.indent() + `${constantCase(field.name.lexeme)}: ${JSON.stringify(field.value.value)}`;
        }).join(",\n");

      this._indentDepth--;

      // We manually add the semi-colon because it's a top-level statement.
      const output = this.appendSemiColon(head.join(" ") + " = {\n" + fields + "\n}");

      if (statement.exposed && this.type === "cjs") {
        return output + this.appendSemiColon(`\nexports.${name} = ${name}`);
      }

      return output;
    }

    throw new Error(`cannot translate '${statement.constructor.name}'`);
  }
}
