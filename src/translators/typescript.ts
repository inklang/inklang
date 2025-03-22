import { camelCase } from "change-case";

import Expr, { AnnotationExpr } from "../expression";
import Stmt, { Function, RecordStmt, Variable } from "../statement";
import { pascalCase } from "change-case";
import { Token } from "../token";

const noop = "";

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
      case "i16":
      case "u16":
      case "i32":
      case "u32":
      case "f32":
      case "f64":
      case "u64":
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
      : this.visitAnnotationExpr(type)
  }

  private _indentDepth = 0;

  private indent (): string {
    return "\t".repeat(this._indentDepth);
  }

  private visit (statement: Stmt): string {
    if (statement instanceof Function) {
      if (!statement.exposed) return noop;

      const head: string[] = [];
      head.push("export", "const", camelCase(statement.name.lexeme));

      const args = statement.params.map((param) =>
        `${camelCase(param.name.lexeme)}: ${this.typeIdentifierOrAnnotation(param.type)}`
      ).join(", ");

      const returnType = this.typeIdentifierOrAnnotation(statement.returnType);
      const signature = head.join(" ") + `: (${args}) => ${statement.async ? `Promise<${returnType}>` : returnType}`;

      return signature + "\n";
    }
    else if (statement instanceof Variable) {
      return noop;
    }
    else if (statement instanceof Expr.Literal) {
      return noop;
    }
    else if (statement instanceof RecordStmt) {
      this.records.add(statement.name.lexeme);

      const head: string[] = [];

      if (statement.exposed)
        head.push("export");

      head.push("class", pascalCase(statement.name.lexeme));

      this._indentDepth++;

      const fields = statement.fields.map(
        (field) => this.indent() + `public ${camelCase(field.name.lexeme)}: ${this.typeIdentifierOrAnnotation(field.type)};`
      ).join("\n");

      const constructor = this.indent() + "constructor (" + statement.fields.map(
        (field) => `${camelCase(field.name.lexeme)}: ${this.typeIdentifierOrAnnotation(field.type)}`
      ).join(", ") + ");";

      this._indentDepth--;

      return head.join(" ") + " {\n" + fields + "\n" + constructor + "\n" + "}";
    }
    else if (statement instanceof Stmt.Expression) {
      return this.visit(statement.expression);
    }
    else if (statement instanceof Expr.Assign) {
      return noop;
    }
    else if (statement instanceof AnnotationExpr) {
      return this.visitAnnotationExpr(statement);
    }

    throw new Error(`cannot translate '${statement.constructor.name}'`);
  }

  private visitAnnotationExpr (statement: AnnotationExpr): string {
    const namespace = camelCase(statement.namespace.lexeme);
    const fnOrProperty = pascalCase(statement.property.lexeme);

    // Add it to the imports property so we make sure to import it in the code at the end.
    this.import(namespace, fnOrProperty);

    // We use a prefixed name to avoid conflicts with other variables.
    const expr = this.annotation(namespace, fnOrProperty);

    if (!statement.generic) return expr;
    return `${expr}<${this.typeIdentifierOrAnnotation(statement.generic)}>`;
  }
}
