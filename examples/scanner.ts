import { Scanner } from "../src/scanner";
import { Parser } from "../src/parser";
import { TranslatorJS } from "../src/translators/javascript";
// import { TranslatorTS } from "../src/translators/typescript";
// import { TranslatorKotlin } from "../src/translators/kotlin";

const session_ink = `
  // record user {
  //   id: int // should be public by default
  //   private name: string
  //   public email: string
  // }

  function do_fetch () -> void {
    var response = @fetch(
      "https://jsonplaceholder.typicode.com/todos/1"
    );
  }
`;

const tokenizer = new Scanner(session_ink);
const parser = new Parser(tokenizer.scanTokens());
const statements = parser.parse();
console.dir(statements, { depth: Infinity });

const javascriptCJS = new TranslatorJS(statements, "cjs");
// const javascriptMJS = new TranslatorJS(statements, "mjs");
// const typescript = new TranslatorTS(statements);
// const kotlin = new TranslatorKotlin(statements);

void async function () {
  // await javascriptCJS.translate();
  // await javascriptMJS.execute();
  // await typescript.execute();
  // await kotlin.execute();
}();
