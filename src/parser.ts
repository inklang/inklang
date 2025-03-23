import Expr, { AnnotationExpr, EnumFieldExpr, RecordFieldExpr, RecordInstanciationExpr } from "./expression";
import Stmt, { Function, FunctionParameter, RecordStmt, RecordField, Variable, While, For, EnumField, Enum } from "./statement";
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
    if ( // we're doing a record instanciation
      this.check(TokenType.IDENTIFIER)
      && this.tokens[this.current + 1].type === TokenType.LBRACE

      // Prevent false detection in the case where...
      // `for x in array {`
      //        !! ^^^^^ ^
      && this.tokens[this.current - 1].type !== TokenType.IN

      // Prevent false detection in the case where...
      // `for i from start to end {`
      //                   !! ^^^ ^
      // Prevent falling in the case where `for i from start to end {`
      && this.tokens[this.current - 1].type !== TokenType.TO
    ) return this.recordInstantiation();

    return this.assignment();
  }

  /**
   *
   * <pre>
   * enum <identifier> {
   *   ...<identifier> = <expression>
   * }
   * </pre>
   */
  private enumDeclaration (exposed: boolean): Expr {
    // enum <identifier> {
    // ^^^^
    // (consumed TokenType.ENUM)

    // enum <identifier> {
    //      ^^^^^^^^^^^^
    const name = this.consume(TokenType.IDENTIFIER, "expect enum name");

    // enum <identifier> {
    //                   ^
    this.consume(TokenType.LBRACE, "expected '{' for enum declaration");

    const fields: Array<EnumField> = [];
    while (!this.check(TokenType.RBRACE) && !this.isAtEnd()) {
      // name = value,
      // ^^^^
      const name = this.consume(TokenType.IDENTIFIER, "expected identifier for enum name");

      // name = value,
      //      ^
      this.consume(TokenType.EQUAL, "expected equal for enum value");

      // name = value,
      //        ^^^^^
      const value = this.expression();

      fields.push(new EnumFieldExpr(name, value));
    }

    // }
    // ^
    this.consume(TokenType.RBRACE, "expected '}' after enum declaration");

    return new Enum(name, fields, exposed);
  }

  private recordInstantiation (): Expr {
    const name = this.consume(TokenType.IDENTIFIER, "expected identifier for record instanciation.");
    this.consume(TokenType.LBRACE, "expected '{' for record instanciation.");
    const fields: Array<RecordFieldExpr> = [];

    if (!this.check(TokenType.RBRACE)) {
      do {
        const name = this.consume(TokenType.IDENTIFIER, "expect parameter name.")
        this.consume(TokenType.COLON, "expect colon for parameter type.")
        const value = this.expression();
        fields.push(new RecordFieldExpr(name, value));
      }
      while (this.match(TokenType.COMMA));
    }

    this.consume(TokenType.RBRACE, "expected '}' after record instanciation.");
    return new RecordInstanciationExpr(name, fields);
  }

  private declaration (): Stmt {
    const exposed = this.match(TokenType.EXPOSE);
    const async = this.match(TokenType.ASYNC);

    if (this.match(TokenType.FUNCTION)) {
      return this.functionDeclaration(exposed, async);
    }

    if (async)
      throw this.error(this.peek(), "only functions can be async");

    if (this.match(TokenType.RECORD)) {
      return this.recordDeclaration(exposed);
    }

    if (this.match(TokenType.ENUM)) {
      return this.enumDeclaration(exposed);
    }

    if (exposed || async)
      throw this.error(this.peek(), "only functions, records and enums can be exposed");

    if (this.match(TokenType.VAR)) {
      return this.variableDeclaration();
    }

    return this.statement();
  }

  private recordDeclaration (exposed: boolean): RecordStmt {
    const name = this.consume(TokenType.IDENTIFIER, "expect record name");
    this.consume(TokenType.LBRACE, "expect '{' after record name");

    const fields: Array<RecordField> = [];
    while (!this.check(TokenType.RBRACE) && !this.isAtEnd()) {
      const field = this.consume(TokenType.IDENTIFIER, "expect field name");
      this.consume(TokenType.COLON, "expect ':' after field name");

      // a: int
      //    ^^^
      // a: @http::headers
      //    ^^^^^^^^^^^^^^
      const type = this.type();

      fields.push(new RecordField(field, type));
    }

    this.consume(TokenType.RBRACE, "expect '}' after record fields");
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

    if (this.match(TokenType.IDENTIFIER)) {
      if (this.match(TokenType.LBRACE)) {
        return this.recordInstantiation();
      }
      // We need to go back one token to revert the `match` operation.
      else this.current--;
    }

    return this.expressionStatement();
  }

  /**
   * <pre>
   * for <identifier>: <type> in <expression> {}
   * for <identifier>: <type> from <expression> to <expression> {}
   * </pre>
   */
  private forStatement (): Stmt {
    // for <identifier>: <type> in <expression> {}
    // ^^^
    // (consumed TokenType.FOR)

    // for <identifier>: <type> in <expression> {}
    //    ^^^^^^^^^^^^^
    const identifier = this.consume(TokenType.IDENTIFIER, "expect variable name.");

    // for <identifier>: <type> in <expression> {}
    //                 ^
    this.consume(TokenType.COLON, "expect ':' after variable name.");

    // for <identifier>: <type> in <expression> {}
    //                   ^^^^^^
    const type = this.type();

    // for <identifier>: <type> in <expression> {}
    //                          ^^
    this.consume(TokenType.IN, "expect 'in' after variable name.");

    // for <identifier>: <type> in <expression> {}
    //                             ^^^^^^^^^^^^
    const expression = this.expression();

    // for <identifier>: <type> in <expression> {}
    //                                          ^
    this.consume(TokenType.LBRACE, "expect '{' after 'for'.");

    return new For(identifier, expression, type, this.block());
  }

  private ifStatement (): Stmt {
    this.consume(TokenType.LPAREN, "expect '(' after 'if'.");
    const condition = this.expression();
    this.consume(TokenType.RPAREN, "expect ')' after condition.");

    this.consume(TokenType.LBRACE, "expect '{' after 'if' condition.");
    const thenBranch = this.block();

    let elseBranch: Array<Stmt> | null = null;
    if (this.match(TokenType.ELSE)) {
      this.consume(TokenType.LBRACE, "expect '{' after 'else'.");
      elseBranch = this.block();
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

    // var a: int;
    //        ^^^
    // var a: @http::headers;
    //        ^^^^^^^^^^^^^^
    const type = this.type();

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

  private functionDeclaration (exposed: boolean, async: boolean): Function {
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
        // function something (a: @http::headers, b: int) -> type {}
        //                        ^^^^^^^^^^^^^^
        const type = this.type();

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

    const returnType = this.type();

    // function something (a: int, b: int) -> type {}
    //                                             ^
    this.consume(TokenType.LBRACE, "expect '{' to open function body.");

    // Will retrieve the function body and expect the `}` token.
    const body = this.block();

    return new Function(name, parameters, body, returnType, exposed, async);
  }

  private block(): Array<Stmt> {
    // { ... }
    // ^
    // (consumed TokenType.LBRACE)

    const statements: Array<Stmt> = [];

    // Until no `}` is found, we keep parsing statements.
    // { ... }
    //   ^^^
    while (!this.check(TokenType.RBRACE) && !this.isAtEnd()) {
      statements.push(this.declaration());
    }

    // { ... }
    //       ^
    this.consume(TokenType.RBRACE, "expect '}' after block");

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

  /**
   * Retrieves all the arguments from a function call
   * and creates the function call expression.
   */
  private finishCall (callee: Expr, annotation: boolean, awaited: boolean): Expr {
		const args: Array<Expr> = [];

    // fn_call()
    //         ^
		if (!this.check(TokenType.RPAREN)) {
			do {
        // Each argument is an expression.
				args.push(this.expression());
			}
      // fn_call(a, b, c)
      //          ^  ^
      // We iterate through all the arguments.
      while (this.match(TokenType.COMMA));
		}

		const paren = this.consume(TokenType.RPAREN, "expect ')' after arguments.");
		return new Expr.Call(callee, paren, args, annotation, awaited);
	}

  // A full function call.
  private call (annotation: boolean): Expr {
    // await fn_call()
    // ^^^^^ (optional)
    const awaited = this.match(TokenType.AWAIT);

    // fn_call()
    // ^^^^^^^
		let expression = this.primary();

		while (true) {
      // fn_call()
      //        ^
      // We're done looking for `.` (getters)
			if (this.match(TokenType.LPAREN)) {
				expression = this.finishCall(expression, annotation, awaited);
			}
      // Will iterate through all the getters.
      // my.struct.for.fn_call()
      //   ^      ^   ^ (getters)
      else if (this.match(TokenType.DOT)) {
        const name = this.consume(TokenType.IDENTIFIER, "expected a property name after '.'");
        expression = new Expr.Get(expression, name);
      }

      else break;
		}

		return expression;
	}

  /**
   * When typing a function return or a variable,
   * it could be either a type or a record type.
   *
   * <pre>
   * var a: int = 1;
   *        ^^^
   * var b: @http::headers = @http::create_headers();
   *        ^^^^^^^^^^^^^^
   * function something(a: int, b: @http::headers) -> @http::headers {}
   *                       ^^^     ^^^^^^^^^^^^^^     ^^^^^^^^^^^^^^
   * </pre>
   */
  private type (): Token | AnnotationExpr {
    if (!this.match(TokenType.AT)) {
      return this.consume(TokenType.IDENTIFIER, "expected a type or record type");
    }
    else {
      return this.annotation(false) as AnnotationExpr;
    }
  }

  /**
   * An annotation is a special type of call or identifier that is used to
   * call a language native feature.
   *
   * ```ink
   * var headers: @http::headers = @http::create_headers();
   * @http::append_header(headers, "Content-Type", "application/json");
   * await @http::send(request);
   * ```
   */
  private annotation (allowFnCallMatch: boolean): Expr | AnnotationExpr {
    // @http::headers
    // ^
    // (consumed TokenType.AT)

    // @http::headers
    //  ^^^^
    const namespace = this.consume(TokenType.IDENTIFIER, "expect namespace after '@'.");

    // @http::headers
    //      ^
    this.consume(TokenType.COLON, "expect a double ':' after namespace.");

    // @http::headers
    //       ^
    this.consume(TokenType.COLON, "expect a double ':' after namespace.");

    // @http::headers
    //        ^^^^^^^
    const property = this.consume(TokenType.IDENTIFIER, "expect property after namespace.");

    // We check if a generic value is present.
    // @array::of<type>
    //           ^
    if (this.match(TokenType.LESS)) {
      // @array::of<type>
      //            ^^^^
      const generic = this.type();

      // @array::of<type>
      //                ^
      this.consume(TokenType.GREATER, "expect '>' after type.");
      return new AnnotationExpr(namespace, property, generic);
    }

    // We check if a function call is present.
    // @http::send(request)
    //            ^
    if (this.match(TokenType.LPAREN)) {
      if (allowFnCallMatch) {
        // (AWAIT), AT, IDENTIFIER, COLON, COLON, IDENTIFIER, LPAREN : 7 tokens before.
        const awaited = this.previous(7).type === TokenType.AWAIT;
        return this.finishCall(new AnnotationExpr(namespace, property), true, awaited);
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
      return this.annotation(true);
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

  private previous (from = 1): Token {
    return this.tokens[this.current - from];
  }

  private error (token: Token, message: string): Error {
    console.error(`[${token.line}] Error: ${message}`);
    return new Error(message);
  }
}
