export type CalculationStep = { description: string; value: number };

export function calculate(
  source: string, degrees: boolean, answer: number,
  steps?: CalculationStep[],
): number {
  const show = (value: number) => Number(value.toPrecision(14)).toString();
  const record = (description: string, value: number): number => {
    steps?.push({ description, value });
    return value;
  };
  if (source.length > 512) throw new Error("Expression is too long.");
  const text = source.replace(/×/g, "*").replace(/÷/g, "/").replace(/π/g, "pi");
  const tokens: string[] = [];
  const pattern = /\s*([0-9]+(?:\.[0-9]*)?(?:[eE][+-]?[0-9]+)?|\.[0-9]+(?:[eE][+-]?[0-9]+)?|[a-zA-Z]+|[()+\-*/^%])/y;
  let offset = 0;
  while (offset < text.length) {
    if (text.slice(offset).trim() === "") break;
    pattern.lastIndex = offset;
    const match = pattern.exec(text);
    if (!match) throw new Error(`Unexpected character near position ${offset + 1}.`);
    tokens.push(match[1]);
    offset = pattern.lastIndex;
  }
  let cursor = 0;
  let depth = 0;
  const peek = () => tokens[cursor];
  const take = () => tokens[cursor++];
  const finite = (value: number): number => {
    if (!Number.isFinite(value)) throw new Error("Result is undefined or outside the supported range.");
    return value;
  };
  function primary(): number {
    if (++depth > 64) throw new Error("Expression is nested too deeply.");
    try {
      const token = take();
      if (!token) throw new Error("Expression is incomplete.");
      if (token === "(") {
        const value = sum();
        if (take() !== ")") throw new Error("Missing closing parenthesis.");
        return record("Complete the parenthesized expression", value);
      }
      if (/^(?:\d|\.)/.test(token)) return finite(Number(token));
      const name = token.toLowerCase();
      if (name === "pi") return Math.PI;
      if (name === "e") return Math.E;
      if (name === "ans") return record("Substitute the most recent answer", answer);
      const functions: Record<string, (value: number) => number> = {
        sin: x => Math.sin(degrees ? x * Math.PI / 180 : x),
        cos: x => Math.cos(degrees ? x * Math.PI / 180 : x),
        tan: x => {
          const angle = degrees ? x * Math.PI / 180 : x;
          if (Math.abs(Math.cos(angle)) < 1e-14) throw new Error("Tangent is undefined at this angle.");
          return Math.tan(angle);
        },
        sqrt: Math.sqrt,
        abs: Math.abs,
        ln: Math.log,
        log: Math.log10,
        exp: Math.exp,
      };
      const fn = functions[name];
      if (!fn) throw new Error(`Unknown name: ${token}.`);
      if (take() !== "(") throw new Error(`Use ${name}(expression).`);
      const value = sum();
      if (take() !== ")") throw new Error("Missing closing parenthesis.");
      if (degrees && ["sin", "cos", "tan"].includes(name)) {
        record(`Convert ${show(value)} degrees to radians: ${show(value)} × pi / 180`,
          value * Math.PI / 180);
      }
      return record(`Evaluate ${name}(${show(value)})${["sin", "cos", "tan"].includes(name)
        ? degrees ? " in degrees" : " in radians" : ""}`, finite(fn(value)));
    } finally {
      depth--;
    }
  }
  function postfix(): number {
    let value = primary();
    while (peek() === "%") {
      take();
      value = record(`Percentage: ${show(value)} / 100`, value / 100);
    }
    return value;
  }
  function power(): number {
    const left = postfix();
    if (peek() === "^") {
      take();
      const right = unary();
      return record(`Power: ${show(left)} ^ ${show(right)}`, finite(left ** right));
    }
    return left;
  }
  function unary(): number {
    if (++depth > 64) throw new Error("Expression is nested too deeply.");
    try {
      if (peek() === "+") { take(); return unary(); }
      if (peek() === "-") {
        take();
        const value = unary();
        return record(`Negate ${show(value)}`, -value);
      }
      return power();
    } finally {
      depth--;
    }
  }
  function product(): number {
    let value = unary();
    while (peek() === "*" || peek() === "/") {
      const operator = take();
      const right = unary();
      if (operator === "/" && right === 0) throw new Error("Cannot divide by zero.");
      const description = `${operator === "*" ? "Multiply" : "Divide"}: ${show(value)} ${operator} ${show(right)}`;
      value = record(description, finite(operator === "*" ? value * right : value / right));
    }
    return value;
  }
  function sum(): number {
    let value = product();
    while (peek() === "+" || peek() === "-") {
      const operator = take();
      const right = product();
      const description = `${operator === "+" ? "Add" : "Subtract"}: ${show(value)} ${operator} ${show(right)}`;
      value = record(description, finite(operator === "+" ? value + right : value - right));
    }
    return value;
  }
  if (!tokens.length) throw new Error("Enter an expression.");
  const result = finite(sum());
  if (cursor !== tokens.length) throw new Error("Unexpected input. Use * for multiplication.");
  return Object.is(result, -0) ? 0 : result;
}
