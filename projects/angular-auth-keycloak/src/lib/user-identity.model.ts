export class UserIdentity {
  private readonly _sub: string;
  private readonly _name: string;
  private readonly _username: string;
  private readonly _email: string;
  private readonly _roles: string[];

  get sub(): string {
    return this._sub;
  }

  get name(): string {
    return this._name;
  }

  get username(): string {
    return this._username;
  }

  get email(): string {
    return this._email;
  }

  get roles(): string[] {
    return this._roles;
  }

  constructor(sub: string, name: string, username: string, email: string, roles?: string[]) {
    this._sub = sub;
    this._name = name;
    this._username = username;
    this._email = email;
    this._roles = roles;
  }

  public hasRole(role: string): boolean {
    return true;
  }

}
