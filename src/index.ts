import { Scanner } from "./scanner";
import { Parser } from "./parser";
import Stmt from "./statement";
import Expr from "./expression";

/**
 * Helper utility that parses a string of code into an array of statements.
 * Basically a shorthand for creating a scanner, scanning tokens, creating a parser, and parsing the tokens.
 *
 * @param code The `ink` code to parse.
 * @returns An array of statements.
 */
export function parse (code: string): Array<Stmt> {
  const scanner = new Scanner(code);
  const tokens = scanner.scanTokens();
  const parser = new Parser(tokens);

  return parser.parse();
}

export { Scanner, Parser, Stmt, Expr };
export { TranslatorJS } from "./translators/javascript";
export { TranslatorTS } from "./translators/typescript";
export { TranslatorKotlin } from "./translators/kotlin";
