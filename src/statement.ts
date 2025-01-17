import type Expr from "./expression"
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

  public static readonly Function = class Function extends Stmt {
    public constructor (
      public readonly name: Token,
      public readonly params: Array<Token>,
      public readonly body: Array<Stmt>,
    ) { super() }
  }

  public static readonly If = class If extends Stmt {
    public constructor (
      public readonly condition: Expr,
      public readonly thenBranch: Stmt,
      public readonly elseBranch: Stmt | null,
    ) { super() }
  }

  public static readonly Variable = class Variable extends Stmt {
    public constructor (
      public readonly name: Token,
      public readonly initializer: Expr
    ) { super() }
  }

  public static readonly Return = class Return extends Stmt {
    public constructor (
      public readonly keyword: Token,
      public readonly value: Expr
    ) { super() }
  }
}