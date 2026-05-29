import { rectangleSchema } from '../rectangle';

const base = {
  id: 'rect1',
  from: { x: 0, y: 0 },
  to: { x: 2, y: 2 }
};

describe('rectangleSchema (FEA11-01)', () => {
  test('accepts a minimal rectangle with no optional fields', () => {
    expect(rectangleSchema.safeParse(base).success).toBe(true);
  });

  test('accepts all four new optional fields with valid values', () => {
    expect(
      rectangleSchema.safeParse({
        ...base,
        colorValue: '#ff0000',
        outlineColor: '#000000',
        transparency: 0.5,
        zIndex: 2
      }).success
    ).toBe(true);
  });

  test('accepts transparency at boundary values 0 and 1', () => {
    expect(
      rectangleSchema.safeParse({ ...base, transparency: 0 }).success
    ).toBe(true);
    expect(
      rectangleSchema.safeParse({ ...base, transparency: 1 }).success
    ).toBe(true);
  });

  test('accepts negative zIndex (send behind everything)', () => {
    expect(rectangleSchema.safeParse({ ...base, zIndex: -10 }).success).toBe(
      true
    );
  });

  test('rejects colorValue that is not a 6-digit hex', () => {
    expect(
      rectangleSchema.safeParse({ ...base, colorValue: 'not-a-hex' }).success
    ).toBe(false);
    // 3-digit shorthand is not accepted
    expect(
      rectangleSchema.safeParse({ ...base, colorValue: '#fff' }).success
    ).toBe(false);
    // Missing leading #
    expect(
      rectangleSchema.safeParse({ ...base, colorValue: 'ff0000' }).success
    ).toBe(false);
  });

  test('rejects outlineColor that is not a 6-digit hex', () => {
    expect(
      rectangleSchema.safeParse({ ...base, outlineColor: '#ggg000' }).success
    ).toBe(false);
  });

  test('rejects transparency out of range', () => {
    expect(
      rectangleSchema.safeParse({ ...base, transparency: 1.5 }).success
    ).toBe(false);
    expect(
      rectangleSchema.safeParse({ ...base, transparency: -0.1 }).success
    ).toBe(false);
  });

  test('rejects non-integer zIndex', () => {
    expect(rectangleSchema.safeParse({ ...base, zIndex: 1.5 }).success).toBe(
      false
    );
  });

  test('rejects unknown fields (.strict() guard)', () => {
    expect(
      rectangleSchema.safeParse({ ...base, unknownField: true }).success
    ).toBe(false);
  });
});
