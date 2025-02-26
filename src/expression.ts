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
      public readonly value: string | number | boolean | null,
    ) { super() }
  }

  public static readonly Unary = class Unary extends Expr {
    public constructor (
      public readonly operator: Token,
      public readonly right: Expr,
    ) { super() }
  }

  public static readonly Variable = class Variable extends Expr {
    public constructor (
      public readonly name: Token,
    ) { super() }
  }

  public static readonly Logical = class Logical extends Expr {
    public constructor (
      public readonly left: Expr,
      public readonly operator: Token,
      public readonly right: Expr,
    ) { super() }
  }

  public static readonly Assign = class Assign extends Expr {
    public constructor (
      public readonly name: Token,
      public readonly value: Expr,
    ) { super() }
  }

  public static readonly Call = class Call extends Expr {
    public constructor (
      public readonly callee: Expr | AnnotationExpr,
      public readonly paren: Token,
      public readonly args: Array<Expr>,
      public readonly annotation: boolean,
      public readonly awaited: boolean,
    ) { super() }
  }

  public static readonly Get = class Get extends Expr {
    public constructor (
      public readonly object: Expr,
      public readonly name: Token
    ) { super() }
  }

  public static readonly Set = class Set extends Expr {
    public constructor (
      public readonly object: Expr,
      public readonly name: Token,
      public readonly value: Expr
    ) { super() }
  }
}

export class AnnotationExpr extends Expr {
  public constructor (
    public readonly namespace: Token,
    public readonly property: Token,
  ) { super() }
}

export class RecordFieldExpr extends Expr {
  public constructor (
    public readonly name: Token,
    public readonly value: Expr,
  ) { super() }
}

export class RecordInstanciationExpr extends Expr {
  public constructor (
    public readonly name: Token,
    public readonly fields: Array<RecordFieldExpr>,
  ) { super() }
}
