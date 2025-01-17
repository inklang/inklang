import { Scanner } from "../src/scanner";

const session_ink = `
  // hello world
  record session {
    public name: string
    @js:only(private fetcher: @js:fetcher)
  }

  function something ()  {
    var constant = "some string !";
    var constant = "\\"some string !\\"";
    var constant = 'some string !';
    var constant = '\\'some string !\\'';
  }
`;

const tokenizer = new Scanner(session_ink);
console.log(tokenizer.scanTokens());
