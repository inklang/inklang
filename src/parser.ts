import Expr from "./expression";
import Stmt from "./statement";
import { Token, TokenType } from "./token";

export class Parser {
  public constructor (private readonly tokens: Array<Token>) {}
  private current: number = 0;
  
  private peek (): Token {
    return this.tokens[this.current];
  }

  private isAtEnd (): boolean {
    return this.peek().type === TokenType.EOF;
  }

  private previous (): Token {
    return this.tokens[this.current - 1];
  }

  private check (type: TokenType): boolean {
    if (this.isAtEnd()) return false;
    return this.peek().type === type;
  }

  private advance (): Token {
    if (!this.isAtEnd()) this.current++;
    return this.previous();
  }

  private consume (type: TokenType, message: string): Token {
    if (this.check(type)) return this.advance();

    throw this.error(this.peek(), message);
  }

  private match (...types: Array<TokenType>): boolean {
    for (const type of types) {
      if (this.check(type)) {
        this.advance();
        return true;
      }
    }

    return false;
  }

  private error (token: Token, message: string): Error {
    console.error(`[line ${token.line}] Error ${token.lexeme}: ${message}`);
    return new Error(message);
  }

  private primary (): Expr {
    if (this.match(TokenType.FALSE)) return new Expr.Literal(false);
    if (this.match(TokenType.TRUE)) return new Expr.Literal(true);
    // if (this.match(TokenType.NIL)) return new Expr.Literal(null);

    if (this.match(TokenType.NUMBER, TokenType.STRING)) {
      return new Expr.Literal(this.previous().literal);
    }

    if (this.match(TokenType.LPAREN)) {
      const expr = this.expression();
      this.consume(TokenType.RPAREN, "expect ')' after expression.");
      return new Expr.Grouping(expr);
    }

    throw this.error(this.peek(), "expect expression.");
  }

  private expression (): Expr {
    return this.equality();
  }

  private unary (): Expr {
    if (this.match(TokenType.BANG, TokenType.MINUS)) {
      const operator = this.previous();
      const right = this.unary();
      return new Expr.Unary(operator, right);
    }

    return this.primary();
  }


  private factor (): Expr {
    let expr = this.unary();

    while (this.match(TokenType.SLASH, TokenType.STAR)) {
      const operator = this.previous();
      const right = this.unary();
      expr = new Expr.Binary(expr, operator, right);
    }

    return expr;
  }


  private term (): Expr {
    let expr = this.factor();

    while (this.match(TokenType.MINUS, TokenType.PLUS)) {
      const operator = this.previous();
      const right = this.factor();
      expr = new Expr.Binary(expr, operator, right);
    }

    return expr;
  }


  private comparison (): Expr {
    let expr = this.term();

    while (this.match(TokenType.GREATER, TokenType.GREATER_EQUAL, TokenType.LESS, TokenType.LESS_EQUAL)) {
      const operator = this.previous();
      const right = this.term();
      expr = new Expr.Binary(expr, operator, right);
    }

    return expr;
  }


  private equality (): Expr {
    let expr = this.comparison();

    while (this.match(TokenType.BANG_EQUAL, TokenType.EQUAL_EQUAL)) {
      const operator = this.previous();
      const right = this.comparison();
      expr = new Expr.Binary(expr, operator, right);
    }

    return expr;
  }

  // private synchronize (): void {
  //   this.advance();

  //   while (!this.isAtEnd()) {
  //     if (this.previous().type == TokenType.SEMICOLON) return;

  //     switch (this.peek().type) {
  //       case TokenType.RECORD:
  //       case TokenType.FUNCTION:
  //       case TokenType.VAR:
  //       case TokenType.FOR:
  //       case TokenType.IF:
  //       case TokenType.WHILE:
  //       case TokenType.RETURN:
  //         return;
  //     }

  //     this.advance();
  //   }
  // }

  private expressionStatement (): Stmt {
    const expr = this.expression();
    this.consume(TokenType.SEMICOLON, "expect ';' after expression.");
    return new Stmt.Expression(expr);
  }

  private statement (): Stmt {
    return this.expressionStatement();
  }

  public parse (): Array<Stmt> | null {
    try {
      const statements: Array<Stmt> = [];

      while (!this.isAtEnd()) {
        statements.push(this.statement());
      }

      return statements;
    }
    catch (error) {
      console.error(error);
      return null;
    }
  }
}