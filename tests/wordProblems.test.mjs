import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import ts from "typescript";

const source = await readFile(new URL("../src/wordProblems.ts", import.meta.url), "utf8");
const compiled = ts.transpileModule(source, {
  compilerOptions: {
    target: ts.ScriptTarget.ES2022,
    module: ts.ModuleKind.ES2022,
  },
}).outputText;
const { interpretWordProblem, wordExamples } = await import(
  "data:text/javascript;base64," + Buffer.from(compiled).toString("base64")
);

const cases = [
  [wordExamples[0], "6*4.99", true],
  [wordExamples[1], "12.50+8.99", false],
  [wordExamples[2], "100-27.50", true],
  [wordExamples[3], "84.60/3", true],
  [wordExamples[4], "200*15%", false],
  [wordExamples[5], "80*(1-15%)", true],
  [wordExamples[6], "200*(1+10%)", false],
];

for (const [text, expression, money] of cases) {
  test(`interpret supported problem: ${text}`, () => {
    const result = interpretWordProblem(text);
    assert.equal(result.expression, expression);
    assert.equal(result.money, money);
    assert.ok(result.interpretation);
    assert.ok(result.method.length >= 2);
  });
}

test("number words and case normalization", () => {
  assert.equal(interpretWordProblem("ADD FIVE AND TWO!").expression, "5+2");
});

test("changing the numbers changes the equation", () => {
  assert.equal(interpretWordProblem("I buy 8 items at 2.50 each").expression, "8*2.50");
});

for (const text of [
  "",
  "Split a bill of 10 among 0 people",
  "Split a bill of 10 among 2.5 people",
  "I buy zero items at 4.99 each",
  "Apply a 110 percent discount to 80",
  "Add 1,000 and 2",
  "Add $10 and $20",
  "Add 10 and 20 then divide by 3",
  "How much will my mortgage cost?",
]) {
  test(`reject unsupported or invalid problem: ${text}`, () => {
    assert.throws(() => interpretWordProblem(text));
  });
}


test("truck problem builds the correct multi-step equation", () => {
  const result = interpretWordProblem(
    "An unloaded semi-truck, with the driver aboard, weighs 30,000 pounds. " +
    "When fully loaded, the semi-truck holds 26 pallets of cargo, and each of the " +
    "18 tires of the fully loaded semi-truck bears approximately 3,300 pounds. " +
    "What is the approximate average weight of one pallet of cargo?"
  );
  assert.equal(result.expression, "(18*3300-30000)/26");
  assert.equal(result.unit, "pounds per pallet");
  assert.ok(result.method[0].includes("59400"));
  assert.ok(result.method[1].includes("29400"));
});

test("truck problem accepts pasted mathematical formatting", () => {
  const result = interpretWordProblem(
    String.raw`An unloaded semi-truck weighs \[30{,}000\] pounds. ` +
    String.raw`The truck holds \[26\] pallets of cargo, and each of the \[18\] tires ` +
    String.raw`bears approximately \[3{,}300\] pounds. ` +
    "What is the approximate average weight of one pallet of cargo?"
  );
  assert.equal(result.expression, "(18*3300-30000)/26");
});

test("truck problem accepts changed numbers and decimal weights", () => {
  const result = interpretWordProblem(
    "An unloaded semi-truck weighs 32875.5 pounds. " +
    "The truck holds 37 pallets of cargo, and each of the 22 tires " +
    "bears approximately 3147.25 pounds. " +
    "What is the approximate average weight of one pallet of cargo?"
  );
  assert.equal(result.expression, "(22*3147.25-32875.5)/37");
  assert.ok(result.method[1].includes("36364"));
});

test("truck problem rejects inconsistent weights", () => {
  assert.throws(() => interpretWordProblem(
    "An unloaded truck weighs 90000 pounds. The truck holds 26 pallets of cargo. " +
    "Each of the 18 tires bears 3300 pounds. What is the average weight of one pallet?"
  ));
});
