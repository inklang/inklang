import { Token, TokenType } from "./token";

export class Scanner {
  public constructor (private readonly source: string) {}

  private readonly keywords: Map<string, TokenType> = new Map([
    // Constants
    ["true", TokenType.TRUE],
    ["false", TokenType.FALSE],
    ["null", TokenType.NULL],

    // Declarations
    ["var", TokenType.VAR],
    ["record", TokenType.RECORD],
    ["function", TokenType.FUNCTION],

    // Visibility
    ["public", TokenType.PUBLIC],
    ["private", TokenType.PRIVATE],
    ["expose", TokenType.EXPOSE],
    
    ["async", TokenType.ASYNC],
    ["await", TokenType.AWAIT],

    ["if", TokenType.IF],
    ["else", TokenType.ELSE],
    ["and", TokenType.AND],
    ["or", TokenType.OR],

    ["for", TokenType.FOR],
    ["while", TokenType.WHILE],

    ["return", TokenType.RETURN]
  ]);

  private readonly tokens: Array<Token> = [];
  private current: number = 0;
  private start: number = 0;
  private line: number = 1;

  private isAtEnd (): boolean {
    return this.current >= this.source.length;
  }

  private isDigit (char: string): boolean {
    return char >= '0' && char <= '9';
  }

  private isAlpha (char: string): boolean {
    return (char >= 'a' && char <= 'z') ||
           (char >= 'A' && char <= 'Z') ||
            char === '_';
  }

  private isAlphaNumeric (char: string): boolean {
    return this.isAlpha(char) || this.isDigit(char);
  }

  public scanTokens (): Array<Token> {
    while (!this.isAtEnd()) {
      // We are at the beginning of the next lexeme.
      this.start = this.current;
      this.scanToken();
    }

    this.tokens.push(new Token(TokenType.EOF, "", null, this.line));
    return this.tokens;
  }

  private advance (): string {
    return this.source.charAt(this.current++);
  }

  /**
   * It’s sort of like `advance()`, but doesn’t consume the character.
   * This is called *lookahead*.
   *
   * Since it only looks at the current unconsumed character,
   * we have one character of lookahead.
   */
  private peek (): string {
    if (this.isAtEnd()) return '\0';
    return this.source.charAt(this.current);
  }

  private peekNext (): string {
    if (this.current + 1 >= this.source.length) return '\0';
    return this.source.charAt(this.current + 1);
  }

  private match (expected: string): boolean {
    if (this.isAtEnd()) return false;
    if (this.source.charAt(this.current) !== expected) return false;

    this.current++;
    return true;
  }

  private addToken (type: TokenType, literal: string | number | null = null): void {
    const text = this.source.substring(this.start, this.current);
    this.tokens.push(new Token(type, text, literal, this.line));
  }

  private string (from: '"' | "'"): void {
    while (this.peek() !== from && !this.isAtEnd()) {
      if (this.peek() === '\n') this.line++;
      if (this.peek() === '\\') this.advance();
      this.advance();
    }

    if (this.isAtEnd()) {
      console.error(`unterminated string at line ${this.line}`);
      return;
    }

    // the closing "
    this.advance();

    // Trim the surrounding quotes.
    const value = this.source.substring(this.start + 1, this.current - 1);
    this.addToken(TokenType.STRING, value);
  }

  private number (): void {
    while (this.isDigit(this.peek())) this.advance();

    // Look for a fractional part.
    if (this.peek() === '.' && this.isDigit(this.peekNext())) {
      // Consume the "."
      this.advance();

      while (this.isDigit(this.peek())) this.advance();
    }

    this.addToken(TokenType.NUMBER, parseFloat(this.source.substring(this.start, this.current)));
  }

  private identifier (): void {
    while (this.isAlphaNumeric(this.peek())) this.advance();

    const text = this.source.substring(this.start, this.current);
    const type = this.keywords.get(text) ?? TokenType.IDENTIFIER;
    this.addToken(type);
  }

  private scanToken (): void {
    const char = this.advance();

    switch (char) {
      case '(': this.addToken(TokenType.LPAREN);    break;
      case ')': this.addToken(TokenType.RPAREN);    break;
      case '{': this.addToken(TokenType.LBRACE);    break;
      case '}': this.addToken(TokenType.RBRACE);    break;
      case '[': this.addToken(TokenType.LBRACKET);  break;
      case ']': this.addToken(TokenType.RBRACKET);  break;
      case ':': this.addToken(TokenType.COLON);     break;
      case ',': this.addToken(TokenType.COMMA);     break;
      case '.': this.addToken(TokenType.DOT);       break;
      case '+': this.addToken(TokenType.PLUS);      break;
      case ';': this.addToken(TokenType.SEMICOLON); break;
      case '*': this.addToken(TokenType.STAR);      break;
      case '@': this.addToken(TokenType.AT);        break;

      case '-': {
        this.addToken(
          this.match('>')
            ? TokenType.RARROW // ->
            : TokenType.MINUS  // -
        );

        break;
      }

      case '!': {
        this.addToken(
          this.match('=')
            ? TokenType.BANG_EQUAL // !=
            : TokenType.BANG       // !
        );

        break;
      }
      case '=': {
        this.addToken(this.match('=') ? TokenType.EQUAL_EQUAL : TokenType.EQUAL);
        break;
      }
      case '<': {
        this.addToken(this.match('=') ? TokenType.LESS_EQUAL : TokenType.LESS);
        break;
      }
      case '>': {
        this.addToken(this.match('=') ? TokenType.GREATER_EQUAL : TokenType.GREATER);
        break;
      }

      case '/': {
        // Trigger a comment with `//`.
        // A comment goes until the end of the line.
        if (this.match('/')) {
          while (this.peek() !== '\n' && !this.isAtEnd()) this.advance();
          // NOTE: maybe we can do something with the comment here ?
          // const comment = this.source.substring(this.start, this.current).trim();
        }
        else {
          this.addToken(TokenType.SLASH);
        }

        break;
      }

      case ' ':
      case '\r':
      case '\t':
        break;

      case '"':
      case "'": {
        this.string(char);
        break;
      }

      case '\n': {
        this.line++;
        break;
      }

      default: {
        if (this.isDigit(char)) {
          this.number();
        }
        else if (this.isAlpha(char)) {
          this.identifier();
        }
        else {
          console.error(`unexpected character "${char}"`);
        }
      }
    }
  }
}
