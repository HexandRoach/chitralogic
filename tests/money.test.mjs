import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import ts from "typescript";

const source = await readFile(new URL("../src/money.ts", import.meta.url), "utf8");
let compiled = ts.transpileModule(source, {
  compilerOptions: {
    target: ts.ScriptTarget.ES2022,
    module: ts.ModuleKind.ES2022,
  },
}).outputText;
compiled = compiled.replace(
  'from "decimal.js"',
  `from ${JSON.stringify(import.meta.resolve("decimal.js"))}`,
);
const { calculateMoney, formatMoney } = await import(
  "data:text/javascript;base64," + Buffer.from(compiled).toString("base64")
);

const cases = [
  ["0.1+0.2", 0.3],
  ["12.50+8.99+3.25", 24.74],
  ["100-27.50-18.75", 53.75],
  ["4.99*6", 29.94],
  ["84.60/3", 28.2],
  ["80*(1-15%)", 68],
  ["50*(1+8%)", 54],
  ["200+10%", 200.1],
  ["1.005", 1.01],
  ["-1.005", -1.01],
  ["10/3", 3.33],
  ["(2+3)*4", 20],
];

for (const [expression, expected] of cases) {
  test(`money result: ${expression}`, () => {
    const steps = [];
    assert.equal(calculateMoney(expression, 0), expected);
    assert.equal(calculateMoney(expression, 0, steps), expected);
    assert.ok(steps.length > 0);
    assert.equal(steps.at(-1).value, expected);
  });
}

test("money ans", () => {
  assert.equal(calculateMoney("ans+0.1", 0.2), 0.3);
});

test("currency labels and two decimals", () => {
  assert.equal(formatMoney(28.2, "GBP"), "GBP 28.20");
  assert.equal(formatMoney(-1.01, "USD"), "USD -1.01");
});

for (const expression of ["", "1/0", "sqrt(81)", "2^3", "$10", "1,000", "2+", "(2+3", "1000000000001"]) {
  test(`invalid money expression: ${expression}`, () => {
    assert.throws(() => calculateMoney(expression, 0));
  });
}
