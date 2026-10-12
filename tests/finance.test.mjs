import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import ts from "typescript";

const source = await readFile(new URL("../src/finance.ts", import.meta.url), "utf8");
const compiled = ts.transpileModule(source, {
  compilerOptions: { target: ts.ScriptTarget.ES2022, module: ts.ModuleKind.ES2022 },
}).outputText;
const { loanPayment, savingsGrowth, percentageChange, readNumber, financeLessons } =
  await import("data:text/javascript;base64," + Buffer.from(compiled).toString("base64"));

function close(actual, expected) {
  assert.ok(Number.isFinite(actual));
  assert.ok(Math.abs(actual - expected) <= 1e-9 * Math.max(1, Math.abs(expected)));
}

test("zero-interest loan", () => {
  const result = loanPayment(1200, 0, 12);
  close(result.rows[0].value, 100);
  close(result.rows[1].value, 1200);
  close(result.rows[2].value, 0);
});
test("one-month loan", () => close(loanPayment(1000, 12, 1).rows[0].value, 1010));
test("loan amortizes through independent monthly recurrence", () => {
  const payment = loanPayment(10000, 6, 36).rows[0].value;
  let balance = 10000;
  for (let i = 0; i < 36; i++) balance = balance * 1.005 - payment;
  assert.ok(Math.abs(balance) < 1e-6);
});
test("zero-interest savings", () => {
  const result = savingsGrowth(1000, 100, 0, 12);
  close(result.rows[0].value, 2200);
  close(result.rows[2].value, 0);
});
test("end-of-month deposit timing", () =>
  close(savingsGrowth(1000, 100, 12, 1).rows[0].value, 1110));
test("savings agrees with independent monthly recurrence", () => {
  let balance = 1000;
  for (let i = 0; i < 120; i++) balance = balance * 1.005 + 100;
  close(savingsGrowth(1000, 100, 6, 120).rows[0].value, balance);
});
test("tiny rates remain stable", () => {
  close(loanPayment(1200, 1e-12, 12).rows[0].value, 100);
  close(savingsGrowth(1000, 100, 1e-12, 12).rows[0].value, 2200);
});
test("discounts and markups", () => {
  close(percentageChange(200, 10, false).rows[1].value, 220);
  close(percentageChange(200, 10, true).rows[1].value, 180);
  close(percentageChange(200, 100, true).rows[1].value, 0);
});
test("invalid durations are rejected", () => {
  for (const n of [0, -1, 1.5, 1201, Infinity, NaN]) {
    assert.throws(() => loanPayment(1000, 5, n));
    assert.throws(() => savingsGrowth(1000, 100, 5, n));
  }
});
test("invalid rates and amounts are rejected", () => {
  for (const r of [-1, 101, Infinity, NaN]) assert.throws(() => loanPayment(1000, r, 12));
  assert.throws(() => loanPayment(-1, 5, 12));
  assert.throws(() => savingsGrowth(1000, -1, 5, 12));
  assert.throws(() => percentageChange(200, 101, true));
  assert.throws(() => savingsGrowth(1e12, 1e12, 100, 1200));
});
test("input validation", () => {
  for (const text of ["", " ", "$100", "1,000", "1+1", "-1", "Infinity"]) {
    assert.throws(() => readNumber(text, "Test"));
  }
  assert.equal(readNumber(" 12.50 ", "Test"), 12.5);
  assert.equal(readNumber("0", "Test"), 0);
});
test("all tools include lessons", () => {
  for (const tool of ["loan", "savings", "percentage"]) {
    assert.ok(financeLessons[tool].title);
    assert.ok(financeLessons[tool].paragraphs.length >= 4);
  }
});
