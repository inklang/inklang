import { parse, TranslatorJS } from "../../src";
import { codeFormatter } from "../helpers";

export function translate (code: string): string {
  const statements = parse(code);
  const translator = new TranslatorJS(statements, "cjs");
  return codeFormatter(translator.translate());
}
