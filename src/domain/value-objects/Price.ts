export class Price {
  private static readonly MIN_PRICE = 5;
  private static readonly MAX_PRICE = 50;

  private constructor(private readonly _value: number) {
    Object.freeze(this);
  }

  static createRandom(): Price {
    // Generate random price between MIN_PRICE and MAX_PRICE with 2 decimal precision
    const randomValue = Math.random() * (this.MAX_PRICE - this.MIN_PRICE) + this.MIN_PRICE;
    const roundedValue = Math.round(randomValue * 100) / 100;

    return new Price(roundedValue);
  }

  static fromValue(value: number): Price {
    if (value < this.MIN_PRICE || value > this.MAX_PRICE) {
      throw new Error(`Price must be between ${this.MIN_PRICE} and ${this.MAX_PRICE}`);
    }
    return new Price(value);
  }

  get value(): number {
    return this._value;
  }

  toNumber(): number {
    return this._value;
  }

  toJSON(): number {
    return this._value;
  }
}
