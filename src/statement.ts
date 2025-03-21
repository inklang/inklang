import type Expr from "./expression"
import { AnnotationExpr } from "./expression"
import { Token } from "./token"

export default abstract class Stmt {
  public static readonly Block = class Block extends Stmt {
    public constructor (
      public readonly statements: Array<Stmt>,
    ) { super() }
  }

  public static readonly Expression = class Expression extends Stmt {
    public constructor (
      public readonly expression: Expr,
    ) { super() }
  }

  public static readonly If = class If extends Stmt {
    public constructor (
      public readonly condition: Expr,
      public readonly thenBranch: Stmt,
      public readonly elseBranch: Stmt | null,
    ) { super() }
  }

  public static readonly Return = class Return extends Stmt {
    public constructor (
      public readonly keyword: Token,
      public readonly value: Expr | null
    ) { super() }
  }
}

export class Function extends Stmt {
  public constructor (
    public readonly name: Token,
    public readonly params: Array<FunctionParameter>,
    public readonly body: Array<Stmt>,
    public readonly returnType: Token | AnnotationExpr,
    public readonly exposed: boolean,
    public readonly async: boolean,
  ) { super() }
}

export class FunctionParameter extends Stmt {
  public constructor (
    public readonly name: Token,
    public readonly type: Token | AnnotationExpr,
  ) { super() }
}

export class Variable extends Stmt {
  public constructor (
    public readonly name: Token,
    public readonly type: Token | AnnotationExpr,
    public readonly initializer: Expr | null
  ) { super() }
}

export class RecordStmt extends Stmt {
  public constructor (
    public readonly name: Token,
    public readonly fields: Array<RecordField>,
    public readonly exposed: boolean
  ) { super() }
}

export class RecordField extends Stmt {
  public constructor (
    public readonly name: Token,
    public readonly type: Token | AnnotationExpr,
  ) { super() }
}

export class While extends Stmt {
  public constructor (
    public readonly condition: Expr,
    public readonly body: Stmt,
  ) { super() }
}

export class For extends Stmt {
  public constructor (
    public readonly identifier: Token,
    public readonly iterable: Expr,
    public readonly body: Array<Stmt>,
  ) { super() }
}
