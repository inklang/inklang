import Expr from "./expression";
import Stmt, { Function, FunctionParameter, Variable } from "./statement";
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
    console.error(`[${token.line}] Error: ${message}`);
    return new Error(message);
  }

  private primary (): Expr {
    if (this.match(TokenType.FALSE)) return new Expr.Literal(false);
    if (this.match(TokenType.TRUE)) return new Expr.Literal(true);
    // if (this.match(TokenType.NIL)) return new Expr.Literal(null);

    if (this.match(TokenType.NUMBER, TokenType.STRING)) {
      return new Expr.Literal(this.previous().literal);
    }

    if (this.match(TokenType.IDENTIFIER)) {
      return new Expr.Variable(this.previous());
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

  private expressionStatement (): Stmt {
    const value = this.expression();
    this.consume(TokenType.SEMICOLON, "expect ';' after expression.");
    return new Stmt.Expression(value);
  }

  private block(): Array<Stmt> {
    const statements: Array<Stmt> = [];

    while (!this.check(TokenType.RBRACE)) {
      const statement = this.declaration();
      if (statement) {
        statements.push(statement);
      }
    }

    this.consume(TokenType.RBRACE, "Expect '}' after block.");

    return statements;
  }

  private statement (): Stmt {
    if (this.match(TokenType.FOR)) {
      throw this.error(this.previous(), "for statement not implemented yet.");
      // return this.forStatement();
    }
    if (this.match(TokenType.IF)) {
      throw this.error(this.previous(), "if statement not implemented yet.");
      // return this.ifStatement();
    }
    if (this.match(TokenType.RETURN)) {
      throw this.error(this.previous(), "return statement not implemented yet.");
      // return this.returnStatement();
    }
    if (this.match(TokenType.WHILE)) {
      throw this.error(this.previous(), "while statement not implemented yet.");
      // return this.whileStatement();
    }

    if (this.match(TokenType.LBRACE)) {
      return new Stmt.Block(this.block());
    }

    return this.expressionStatement();
  }

  private functionDeclaration (exposed: boolean): Function {
    // function something (a: int, b: int) -> type {}
    //          ^^^^^^^^^
    const name = this.consume(TokenType.IDENTIFIER, "expect function name.");

    // function something (a: int, b: int) -> type {}
    //                    ^
    this.consume(TokenType.LPAREN, "expect '(' after function name.");

    const parameters: Array<FunctionParameter> = [];
    if (!this.check(TokenType.RPAREN)) {
      do {
        // function something (a: int, b: int) -> type {}
        //                     ^
        const name = this.consume(TokenType.IDENTIFIER, "expect parameter name.")

        // function something (a: int, b: int) -> type {}
        //                      ^
        this.consume(TokenType.COLON, "expect colon for parameter type.")

        // function something (a: int, b: int) -> type {}
        //                        ^^^
        const type = this.consume(TokenType.IDENTIFIER, "expect parameter type.")

        parameters.push(new FunctionParameter(name, type));
      }

      // function something (a: int, b: int) -> type {}
      //                           ^
      while (this.match(TokenType.COMMA));
    }

    // function something (a: int, b: int) -> type {}
    //                                   ^
    this.consume(TokenType.RPAREN, "expect ')' after parameters.");

    // function something (a: int, b: int) -> type {}
    //                                     ^^
    this.consume(TokenType.RARROW, "expect '->' to define function return type.");

    // function something (a: int, b: int) -> type {}
    //                                        ^^^^
    const returnType = this.consume(TokenType.IDENTIFIER, "expect return type.");

    // function something (a: int, b: int) -> type {}
    //                                             ^
    this.consume(TokenType.LBRACE, "expect '{' to open function body.");

    // Will retrieve the function body and expect the `}` token.
    const body = this.block();

    return new Function(name, parameters, body, returnType, exposed);
  }

  private variableDeclaration (): Variable {
    const name = this.consume(TokenType.IDENTIFIER, "expect variable name.");

    let initializer: Expr | null = null;
    if (this.match(TokenType.EQUAL)) {
      initializer = this.expression();
    }

    this.consume(TokenType.SEMICOLON, "expect ';' after variable declaration.");
    return new Variable(name, initializer);
  }

  private declaration (): Stmt {
    const exposed = this.match(TokenType.EXPOSE);

    if (this.match(TokenType.VAR)) {
      return this.variableDeclaration();
    }

    if (this.match(TokenType.FUNCTION)) {
      return this.functionDeclaration(exposed);
    }

    return this.statement();
  }

  public parse (): Array<Stmt> {
    const statements: Array<Stmt> = [];

    while (!this.isAtEnd()) {
      const statement = this.declaration();
      if (statement) statements.push(statement);
    }

    return statements;
  }
}
