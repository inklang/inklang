import Expr, { AnnotationExpr } from "./expression";
import Stmt, { Function, FunctionParameter, RecordStmt, RecordField, Variable, While } from "./statement";
import { Token, TokenType } from "./token";

export class Parser {
  public constructor (private readonly tokens: Array<Token>) {}
  private current: number = 0;

  public parse (): Array<Stmt> {
    const statements: Array<Stmt> = [];

    while (!this.isAtEnd()) {
      const statement = this.declaration();
      statements.push(statement);
    }
    
    return statements;
  }

  private expression (): Expr {
    return this.assignment();
  }

  private declaration (): Stmt {
    const exposed = this.match(TokenType.EXPOSE);
    // TODO: async

    if (this.match(TokenType.RECORD)) {
      return this.recordDeclaration(exposed);
    }

    if (this.match(TokenType.FUNCTION)) {
      return this.functionDeclaration(exposed);
    }

    if (this.match(TokenType.VAR)) {
      return this.variableDeclaration();
    }

    return this.statement();
  }

  private recordDeclaration (exposed: boolean): RecordStmt {
    const name = this.consume(TokenType.IDENTIFIER, "expect record name.");
    this.consume(TokenType.LBRACE, "expect '{' after record name.");

    const fields: Array<RecordField> = [];
    while (!this.check(TokenType.RBRACE) && !this.isAtEnd()) {
      const field = this.consume(TokenType.IDENTIFIER, "expect field name.");
      this.consume(TokenType.COLON, "expect ':' after field name.");
      const type = this.consume(TokenType.IDENTIFIER, "expect field type.");

      fields.push(new RecordField(field, type));
    }

    this.consume(TokenType.RBRACE, "expect '}' after record fields.");
    return new RecordStmt(name, fields, exposed);
  }

  private statement (): Stmt {
    if (this.match(TokenType.FOR)) {
      return this.forStatement();
    }
    if (this.match(TokenType.IF)) {
      return this.ifStatement();
    }
    if (this.match(TokenType.RETURN)) {
      return this.returnStatement();
    }
    if (this.match(TokenType.WHILE)) {
      return this.whileStatement();
    }

    if (this.match(TokenType.LBRACE)) {
      return new Stmt.Block(this.block());
    }

    return this.expressionStatement();
  }

  private forStatement (): Stmt {
    throw this.error(this.previous(), "for statement not implemented yet.");
  }

  private ifStatement (): Stmt {
    this.consume(TokenType.LPAREN, "expect '(' after 'if'.");
    const condition = this.expression();
    this.consume(TokenType.RPAREN, "expect ')' after condition.");

    const thenBranch = this.statement();
    let elseBranch: Stmt | null = null;
    if (this.match(TokenType.ELSE)) {
      elseBranch = this.statement();
    }

    return new Stmt.If(condition, thenBranch, elseBranch);
  }

  private returnStatement (): Stmt {
    const keyword = this.previous();
    let value: Expr | null = null;

    // We check if it's not a single `return;`
    if (!this.check(TokenType.SEMICOLON)) {
      // We parse the expression that follows the `return` keyword.
      value = this.expression();
    }

    this.consume(TokenType.SEMICOLON, "expect ';' after return value.");
    return new Stmt.Return(keyword, value);
  }

  private variableDeclaration (): Variable {
    const name = this.consume(TokenType.IDENTIFIER, "expect variable name.");
    this.consume(TokenType.COLON, "expect ':' after variable name.");

    const isAnnotationType = this.match(TokenType.AT);
    let type: Token | AnnotationExpr;
    
    if (!isAnnotationType) {
      type = this.consume(TokenType.IDENTIFIER, "expect variable type.");
    }
    else {
      type = this.annotation(false) as AnnotationExpr;
    }

    let initializer: Expr | null = null;
    if (this.match(TokenType.EQUAL)) {
      initializer = this.expression();
    }

    this.consume(TokenType.SEMICOLON, "expect ';' after variable declaration.");
    return new Variable(name, type, initializer);
  }

  private whileStatement (): Stmt {
    this.consume(TokenType.LPAREN, "expect '(' after 'while'.");
    const condition = this.expression();
    this.consume(TokenType.RPAREN, "expect ')' after condition.");
    const body = this.statement();

    return new While(condition, body);
  }

  private expressionStatement (): Stmt {
    const value = this.expression();
    this.consume(TokenType.SEMICOLON, "expect ';' after expression.");
    return new Stmt.Expression(value);
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

  private block(): Array<Stmt> {
    const statements: Array<Stmt> = [];

    while (!this.check(TokenType.RBRACE) && !this.isAtEnd()) {
      statements.push(this.declaration());
    }

    this.consume(TokenType.RBRACE, "expect '}' after block.");
    return statements;
  }

  private assignment (): Expr {
    const expr = this.or();

    if (this.match(TokenType.EQUAL)) {
      const equals = this.previous();
      const value = this.assignment();

      if (expr instanceof Expr.Variable) {
        const name = expr.name;
        return new Expr.Assign(name, value);
      }
      else if (expr instanceof Expr.Get) {
        return new Expr.Set(expr.object, expr.name, value);
      }

      throw this.error(equals, "invalid assignment target.");
    }

    return expr;
  }

  private or (): Expr {
    let expr = this.and();

    while (this.match(TokenType.OR)) {
      const operator = this.previous();
      const right = this.and();
      expr = new Expr.Logical(expr, operator, right);
    }

    return expr;
  }

  private and (): Expr {
    let expr = this.equality();

    while (this.match(TokenType.AND)) {
      const operator = this.previous();
      const right = this.equality();
      expr = new Expr.Logical(expr, operator, right);
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

  private comparison (): Expr {
    let expr = this.term();

    while (this.match(TokenType.GREATER, TokenType.GREATER_EQUAL, TokenType.LESS, TokenType.LESS_EQUAL)) {
      const operator = this.previous();
      const right = this.term();
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

  private factor (): Expr {
    let expr = this.unary();

    while (this.match(TokenType.SLASH, TokenType.STAR)) {
      const operator = this.previous();
      const right = this.unary();
      expr = new Expr.Binary(expr, operator, right);
    }

    return expr;
  }

  private unary (): Expr {
    if (this.match(TokenType.BANG, TokenType.MINUS)) {
      const operator = this.previous();
      const right = this.unary();
      return new Expr.Unary(operator, right);
    }

    return this.call(false);
  }

  private finishCall (callee: Expr, annotation: boolean): Expr {
		const args: Array<Expr> = [];

		if (!this.check(TokenType.RPAREN)) {
			do {
				args.push(this.expression());
			} while (this.match(TokenType.COMMA));
		}

		const paren = this.consume(TokenType.RPAREN, "expect ')' after arguments.");
		return new Expr.Call(callee, paren, args, annotation);
	}

  private call (annotation: boolean): Expr {
		let expression = this.primary();

		while (true) {
			if (this.match(TokenType.LPAREN)) {
				expression = this.finishCall(expression, annotation);
			}
      else if (this.match(TokenType.DOT)) {
        const name = this.consume(TokenType.IDENTIFIER, "expect property name after '.'.");
        expression = new Expr.Get(expression, name);
      }
      else {
        break;
      }
		}

		return expression;
	}

  /**
   * An annotation is a special type of call or identifier that is used to
   * call a language native feature.
   * 
   * ```ink
   * var headers: @http::headers = @http::create_headers();
   * @http::append_header(headers, "Content-Type", "application/json");
   * ```
   */
  private annotation (allowFnCallMatch = true): Expr | AnnotationExpr {
    const namespace = this.consume(TokenType.IDENTIFIER, "expect namespace after '@'.");
    this.consume(TokenType.COLON, "expect a double ':' after namespace.");
    this.consume(TokenType.COLON, "expect a double ':' after namespace.");
    const property = this.consume(TokenType.IDENTIFIER, "expect property after namespace.");

    if (this.match(TokenType.LPAREN)) {
      if (allowFnCallMatch) {
        return this.finishCall(new AnnotationExpr(namespace, property), true);
      }
      else {
        throw this.error(this.peek(), "annotation call not supported in this context.");
      }
    }

    return new AnnotationExpr(namespace, property);
  }

  private primary (): Expr {
    if (this.match(TokenType.FALSE)) return new Expr.Literal(false);
    if (this.match(TokenType.TRUE)) return new Expr.Literal(true);
    if (this.match(TokenType.NULL)) return new Expr.Literal(null);

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

    if (this.match(TokenType.AT)) {
      return this.annotation();
    }

    throw this.error(this.peek(), "expect expression.");
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

  private consume (type: TokenType, message: string): Token {
    if (this.check(type)) return this.advance();

    throw this.error(this.peek(), message);
  }

  private check (type: TokenType): boolean {
    if (this.isAtEnd()) return false;
    return this.peek().type === type;
  }

  private advance (): Token {
    if (!this.isAtEnd()) this.current++;
    return this.previous();
  }

  private isAtEnd (): boolean {
    return this.peek().type === TokenType.EOF;
  }

  private peek (): Token {
    return this.tokens[this.current];
  }

  private previous (): Token {
    return this.tokens[this.current - 1];
  }

  private error (token: Token, message: string): Error {
    console.error(`[${token.line}] Error: ${message}`);
    return new Error(message);
  }
}
