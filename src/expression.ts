import type { Token } from "./token";

export default abstract class Expr {
  public static readonly Binary = class Binary extends Expr {
    public constructor (
      public readonly left: Expr,
      public readonly operator: Token,
      public readonly right: Expr
    ) { super() }
  }

  public static readonly Grouping = class Grouping extends Expr {
    public constructor (
      public readonly expression: Expr,
    ) { super() }
  }

  public static readonly Literal = class Literal extends Expr {
    public constructor (
      public readonly value: string | number | null,
    ) { super() }
  }

  public static readonly Unary = class Unary extends Expr {
    public constructor (
      public readonly operator: Token,
      public readonly right: Expr,
    ) { super() }
  }
}

