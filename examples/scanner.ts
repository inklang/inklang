import { Scanner } from "../src/scanner";
import { Parser } from "../src/parser";
import { TranslatorJS } from "../src/translators/javascript";
import { TranslatorTS } from "../src/translators/typescript";
import { TranslatorKotlin } from "../src/translators/kotlin";

const session_ink = `
  // hello world :)
  expose function hello_world (name: string, nb: u16) -> void {
    var x = 10;
  }
`;

const tokenizer = new Scanner(session_ink);
const parser = new Parser(tokenizer.scanTokens());
const statements = parser.parse();
// console.dir(statements, { depth: Infinity });

const javascriptCJS = new TranslatorJS(statements, "cjs");
const javascriptMJS = new TranslatorJS(statements, "mjs");
const typescript = new TranslatorTS(statements);
const kotlin = new TranslatorKotlin(statements);

void async function () {
  await javascriptCJS.execute();
  await javascriptMJS.execute();
  await typescript.execute();
  await kotlin.execute();
}();
