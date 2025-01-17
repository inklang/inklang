export enum TokenType {
  // Single-character tokens.
  LPAREN,
  RPAREN,
  LBRACE,
  RBRACE,
  LBRACKET,
  RBRACKET,
  COLON,
  COMMA,
  DOT,
  MINUS,
  PLUS,
  SEMICOLON,
  SLASH,
  STAR,
  AT,

  // 1-2 character tokens.
  BANG, BANG_EQUAL,
  EQUAL, EQUAL_EQUAL,
  GREATER, GREATER_EQUAL,
  LESS, LESS_EQUAL,

  // Literals.
  IDENTIFIER,
  STRING,
  NUMBER,

  // Keywords.
  PUBLIC,
  PRIVATE,
  RECORD,
  AND,
  ELSE,
  IF,
  FALSE,
  TRUE,
  VAR,
  FOR,
  WHILE,
  OR,
  RETURN,
  FUNCTION,

  EOF
}

export class Token {
  public constructor (
    public readonly type: TokenType,
    public readonly lexeme: string,
    public readonly literal: string | number | null,
    public readonly line: number
  ) {}
}
