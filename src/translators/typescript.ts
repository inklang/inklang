import { camelCase } from "change-case";

import Expr, { AnnotationExpr } from "../expression";
import Stmt, { Function, RecordStmt, Variable } from "../statement";
import { pascalCase } from "change-case";
import { Token } from "../token";

const tab = "  ";
const noop = "";
const newline = "\n";

export class TranslatorTS {
  public constructor (
    private readonly statements: Array<Stmt>
  ) {}

  /**
   * Used to keep track of the necessary imports.
   * - See `this.translateImports` for the translation to JS code.
   * - See `this.import` for adding new imports.
   */
  private imports: Record<string, Set<string>> = {};
  private records: Set<string> = new Set();

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
      const prefixed = Array.from(raw).map(fnOrProperty => {
        return `${fnOrProperty} as ${this.annotation(namespace, fnOrProperty)}`;
      });

      imports.push(`import type { ${prefixed.join(", ")} } from "@inklang/${namespace}";`);
    }

    return imports;
  }

  /**
   * Prefixed name for the annotation to avoid conflicts.
   */
  private annotation (namespace: string, fnOrProperty: string): string {
    return "Inklang__" + namespace + "_" + fnOrProperty;
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
      case "boolean":
      case "string":
      case "void":
        type = lexeme;
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

  private typeIdentifierOrAnnotation (type: Token | AnnotationExpr): string {
    return type instanceof Token
      ? this.type(type.lexeme)
      : this.visit(type)
  }

  private visit (statement: Stmt): string {
    if (statement instanceof Function) {
      if (!statement.exposed) return noop;

      let returnType = statement.returnType instanceof Token
        ? this.type(statement.returnType.lexeme)
        : this.visit(statement.returnType);

      if (statement.async) {
        returnType = `Promise<${returnType}>`;
      }

      let output = `export const ${camelCase(statement.name.lexeme)}: (`;

      output += statement.params.map((param) =>
        `${camelCase(param.name.lexeme)}: ${this.typeIdentifierOrAnnotation(param.type)}`
      ).join(", ");

      output += `) => ${returnType};` + newline;

      return output;
    }
    else if (statement instanceof Variable) {
      return noop;
    }
    else if (statement instanceof Expr.Literal) {
      return noop;
    }
    else if (statement instanceof RecordStmt) {
      this.records.add(statement.name.lexeme);
      if (!statement.exposed) return noop;

      const className = pascalCase(statement.name.lexeme);
      let output = `export class ${className} {\n`;

      for (const field of statement.fields) {
        output += tab + `public ${camelCase(field.name.lexeme)}: ${this.typeIdentifierOrAnnotation(field.type)};\n`;
      }

      output += tab + "constructor (";
      for (let i = 0; i < statement.fields.length; i++) {
        const field = statement.fields[i];
        output += `${camelCase(field.name.lexeme)}: ${this.typeIdentifierOrAnnotation(field.type)}`;
        if (i !== statement.fields.length - 1) output += ", ";
      }
      output += ");\n";

      output += '}';
      return output;
    }
    else if (statement instanceof Stmt.Expression) {
      return this.visit(statement.expression);
    }
    else if (statement instanceof Expr.Assign) {
      return noop;
    }
    else if (statement instanceof AnnotationExpr) {
      const namespace = camelCase(statement.namespace.lexeme);
      const fnOrProperty = pascalCase(statement.property.lexeme);

      // Add it to the imports property so we make sure to import it in the code at the end.
      this.import(namespace, fnOrProperty);

      // We use a prefixed name to avoid conflicts with other variables.
      return this.annotation(namespace, fnOrProperty)
    }

    throw new Error(`cannot translate '${statement.constructor.name}'`);
  }
}
