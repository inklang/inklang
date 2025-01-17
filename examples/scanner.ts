import { Scanner } from "../src/scanner";
import { TokenType } from "../src/token";

const session_ink = `
  // hello world
  record session {
    public name: string
    @js:only(private fetcher: @js:fetcher)
  }

  function something ()  {
    var str = "some string !";
    var str = "\\"some string !\\"";
    var str = 'some string !';
    var str = '\\'some string !\\'';

    var nb = 1;
    var nb = 1.50;
    var nb = 10.50;
  }
`;

const tokenizer = new Scanner(session_ink);
for (const token of tokenizer.scanTokens()) {
  console.log(TokenType[token.type], ":", token.literal ?? token.lexeme);
}
