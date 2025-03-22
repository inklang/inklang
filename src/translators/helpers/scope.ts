class Scope {
  public constructor (
    public readonly parent: Scope | null = null
  ) {}

  private variables: Map<string, string> = new Map();

  public define (name: string, type: string): void {
    this.variables.set(name, type);
  }

  public resolve (name: string): boolean {
    if (this.variables.has(name)) return true;
    if (this.parent) return this.parent.resolve(name);
    return false;
  }

  public typeOf (name: string): string {
    if (this.variables.has(name)) {
      const type = this.variables.get(name);

      if (type)
        return type;
    }

    if (this.parent)
      return this.parent.typeOf(name);

    throw new Error(`unknown variable '${name}' within scope`);
  }
}

export default Scope;
