import { Price } from '../../../src/domain/value-objects/Price';

describe('Price Value Object', () => {
  describe('creation', () => {
    it('should create a random Price within valid range (5-50)', () => {
      const price = Price.createRandom();

      expect(price.value).toBeGreaterThanOrEqual(5);
      expect(price.value).toBeLessThanOrEqual(50);
    });

    it('should create different random prices on multiple calls', () => {
      const prices = Array.from({ length: 100 }, () => Price.createRandom());
      const uniquePrices = new Set(prices.map(p => p.value));

      // With 100 samples, we should have some variety
      expect(uniquePrices.size).toBeGreaterThan(1);
    });

    it('should have decimal precision in random prices', () => {
      const prices = Array.from({ length: 50 }, () => Price.createRandom());
      const hasDecimals = prices.some(p => p.value % 1 !== 0);

      expect(hasDecimals).toBe(true);
    });
  });

  describe('value access', () => {
    it('should expose the price value', () => {
      const price = Price.createRandom();

      expect(typeof price.value).toBe('number');
      expect(price.value).toBeGreaterThanOrEqual(5);
      expect(price.value).toBeLessThanOrEqual(50);
    });
  });

  describe('serialization', () => {
    it('should serialize to number', () => {
      const price = Price.createRandom();

      expect(typeof price.toNumber()).toBe('number');
      expect(price.toNumber()).toBe(price.value);
    });

    it('should serialize to JSON as number', () => {
      const price = Price.createRandom();

      expect(price.toJSON()).toBe(price.value);
    });

    it('should work with JSON.stringify', () => {
      const price = Price.createRandom();
      const json = JSON.stringify({ price });
      const parsed = JSON.parse(json);

      expect(typeof parsed.price).toBe('number');
      expect(parsed.price).toBe(price.value);
    });
  });

  describe('immutability', () => {
    it('should be immutable - value cannot be changed after creation', () => {
      const price = Price.createRandom();
      const originalValue = price.value;

      expect(() => {
        (price as any).value = 100;
      }).toThrow();

      expect(price.value).toBe(originalValue);
    });
  });
});
