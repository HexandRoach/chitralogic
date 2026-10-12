import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import ts from "typescript";

const source = await readFile(
  new URL("../src/calculator.ts", import.meta.url),
  "utf8",
);

const compiled = ts.transpileModule(source, {
  compilerOptions: {
    target: ts.ScriptTarget.ES2022,
    module: ts.ModuleKind.ES2022,
  },
}).outputText;

const moduleUrl =
  "data:text/javascript;base64," +
  Buffer.from(compiled).toString("base64");

const { calculate } = await import(moduleUrl);

function closeTo(actual, expected, label) {
  assert.ok(Number.isFinite(actual), `${label}: result must be finite`);
  const tolerance = 1e-12 * Math.max(1, Math.abs(expected));
  assert.ok(
    Math.abs(actual - expected) <= tolerance,
    `${label}: expected approximately ${expected}, received ${actual}`,
  );
}

const cases = [
  { expression: "2+3*4", expected: 14 },
  { expression: "(2+3)*4", expected: 20 },
  { expression: "20/5*2", expected: 8 },
  { expression: "10-3-2", expected: 5 },
  { expression: "2^3^2", expected: 512 },
  { expression: "(2^3)^2", expected: 64 },
  { expression: "-2^2", expected: -4 },
  { expression: "(-2)^2", expected: 4 },
  { expression: "2^-3", expected: 0.125 },
  { expression: "1.5+2.25", expected: 3.75 },
  { expression: " 2 + 3 * 4 ", expected: 14 },

  { expression: "10%", expected: 0.1 },
  { expression: "200*10%", expected: 20 },
  { expression: "200+10%", expected: 200.1 },
  { expression: "200*(1+10%)", expected: 220 },

  { expression: "ans*2", answer: 21, expected: 42 },
  { expression: "ans+1", answer: -5, expected: -4 },
  { expression: "ans", answer: 0, expected: 0 },

  { expression: "sqrt(81)", expected: 9 },
  { expression: "abs(-5)", expected: 5 },
  { expression: "log(100)", expected: 2 },
  { expression: "ln(1)", expected: 0 },
  { expression: "exp(0)", expected: 1 },
  { expression: "sqrt(abs(-81))", expected: 9 },

  { expression: "sin(30)", degrees: true, expected: 0.5 },
  { expression: "cos(60)", degrees: true, expected: 0.5 },
  { expression: "tan(45)", degrees: true, expected: 1 },
  { expression: "sin(pi/2)", degrees: false, expected: 1 },
  { expression: "cos(pi)", degrees: false, expected: -1 },
  { expression: "tan(pi/4)", degrees: false, expected: 1 },
];

for (const item of cases) {
  const {
    expression,
    expected,
    degrees = true,
    answer = 0,
  } = item;

  const label = `${expression} [${degrees ? "degrees" : "radians"}, ans=${answer}]`;

  test(`correct result: ${label}`, () => {
    closeTo(calculate(expression, degrees, answer), expected, label);
  });

  test(`step recording preserves result: ${label}`, () => {
    const steps = [];
    const plain = calculate(expression, degrees, answer);
    const traced = calculate(expression, degrees, answer, steps);

    assert.equal(traced, plain);

    for (const step of steps) {
      assert.equal(typeof step.description, "string");
      assert.ok(step.description.trim().length > 0);
      assert.ok(Number.isFinite(step.value));
    }
  });
}

const invalidExpressions = [
  "",
  "   ",
  "2+",
  "(2+3",
  "2+3)",
  "2 3",
  "unknown(2)",
  "sin()",
  "1/0",
  "0/0",
  "sqrt(-1)",
  "ln(0)",
  "ln(-1)",
  "log(0)",
  "exp(1000)",
];

for (const expression of invalidExpressions) {
  test(`reject invalid input: ${JSON.stringify(expression)}`, () => {
    assert.throws(() => calculate(expression, true, 0));
    assert.throws(() => calculate(expression, true, 0, []));
  });
}

test("trace follows precedence for 2+3*4", () => {
  const steps = [];
  assert.equal(calculate("2+3*4", true, 0, steps), 14);
  assert.deepEqual(steps.map(step => step.value), [12, 14]);
  assert.match(steps[0].description, /^Multiply:/);
  assert.match(steps[1].description, /^Add:/);
});

test("trace evaluates chained powers from the right", () => {
  const steps = [];
  assert.equal(calculate("2^3^2", true, 0, steps), 512);
  assert.deepEqual(steps.map(step => step.value), [9, 512]);
});

test("degree-mode trace records angle conversion before sine", () => {
  const steps = [];
  closeTo(calculate("sin(30)", true, 0, steps), 0.5, "sin(30)");
  assert.equal(steps.length, 2);
  assert.match(steps[0].description, /^Convert /);
  closeTo(steps[0].value, Math.PI / 6, "converted angle");
  assert.match(steps[1].description, /^Evaluate sin/);
});

test("radian-mode sine does not record degree conversion", () => {
  const steps = [];
  closeTo(calculate("sin(1)", false, 0, steps), Math.sin(1), "sin(1)");
  assert.equal(
    steps.some(step => step.description.startsWith("Convert ")),
    false,
  );
});

test("separate trace arrays do not leak steps between calculations", () => {
  const first = [];
  const second = [];

  calculate("2+3*4", true, 0, first);
  const snapshot = structuredClone(first);

  calculate("7-2", true, 0, second);

  assert.deepEqual(first, snapshot);
  assert.deepEqual(second.map(step => step.value), [5]);
});

test("a failed calculation leaves only completed finite steps", () => {
  const steps = [];
  assert.throws(() => calculate("(2+3)/0", true, 0, steps));
  assert.ok(steps.length > 0);
  assert.ok(steps.every(step => Number.isFinite(step.value)));
  assert.equal(steps.at(-1).value, 5);
});
