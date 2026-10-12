import Decimal from "decimal.js";
import type { CalculationStep } from "./calculator";

const D = Decimal.clone({ precision: 40, rounding: Decimal.ROUND_HALF_UP });

export const currencies = ["USD", "EUR", "GBP", "CAD", "AUD"] as const;
export type Currency = typeof currencies[number];

export function formatMoney(value: number, currency: Currency): string {
  return `${currency} ${new D(value).toFixed(2)}`;
}

export function calculateMoney(
  source: string, answer: number, steps?: CalculationStep[],
): number {
  if (source.length > 512) throw new Error("Expression is too long.");
  const text = source.replace(/\s+/g, "");
  if (!text) throw new Error("Enter a money expression.");

  const tokens = text.match(/ans|\d+(?:\.\d*)?|\.\d+|[()+*/%\-]/g) || [];
  if (tokens.join("") !== text) {
    throw new Error("Money mode supports numbers, ans, +, -, *, /, %, and parentheses. Use Standard mode for scientific functions.");
  }

  let position = 0;
  const peek = () => tokens[position];
  const take = () => tokens[position++];
  const limit = new D("1000000000000");

  function finite(value: Decimal): Decimal {
    if (!value.isFinite() || value.abs().gt(limit)) {
      throw new Error("Money results and intermediate values must be finite and no greater than 1 trillion in magnitude.");
    }
    return value;
  }

  function record(description: string, value: Decimal): Decimal {
    finite(value);
    steps?.push({ description, value: value.toNumber() });
    return value;
  }

  function primary(): Decimal {
    const token = take();
    if (token === "(") {
      const value = sum();
      if (take() !== ")") throw new Error("Missing closing parenthesis.");
      return record("Complete the parenthesized amount", value);
    }
    if (token === "ans") {
      return record("Use the most recent answer", finite(new D(answer)));
    }
    if (token && /^(?:\d|\.)/.test(token)) return finite(new D(token));
    throw new Error("Expected an amount or parenthesized expression.");
  }

  function percentage(): Decimal {
    let value = primary();
    while (peek() === "%") {
      take();
      value = record(`Percentage: ${value.toString()} / 100`, value.div(100));
    }
    return value;
  }

  function unary(): Decimal {
    if (peek() === "+") { take(); return unary(); }
    if (peek() === "-") {
      take();
      const value = unary();
      return record(`Negate ${value.toString()}`, value.neg());
    }
    return percentage();
  }

  function product(): Decimal {
    let value = unary();
    while (peek() === "*" || peek() === "/") {
      const operator = take();
      const right = unary();
      if (operator === "/" && right.isZero()) throw new Error("Cannot divide by zero.");
      const description = `${operator === "*" ? "Multiply" : "Divide"}: ${value.toString()} ${operator} ${right.toString()}`;
      value = record(description, operator === "*" ? value.mul(right) : value.div(right));
    }
    return value;
  }

  function sum(): Decimal {
    let value = product();
    while (peek() === "+" || peek() === "-") {
      const operator = take();
      const right = product();
      const description = `${operator === "+" ? "Add" : "Subtract"}: ${value.toString()} ${operator} ${right.toString()}`;
      value = record(description, operator === "+" ? value.plus(right) : value.minus(right));
    }
    return value;
  }

  const value = finite(sum());
  if (position !== tokens.length) throw new Error("Unexpected token in money expression.");
  const rounded = value.toDecimalPlaces(2, Decimal.ROUND_HALF_UP);
  record(`Round final amount to two decimals, with halfway values away from zero: ${value.toString()}`, rounded);
  return rounded.isZero() ? 0 : rounded.toNumber();
}
