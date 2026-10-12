import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import ts from "typescript";

async function loadTypeScript(path) {
  const source = await readFile(new URL(path, import.meta.url), "utf8");
  const compiled = ts.transpileModule(source, {
    compilerOptions: {
      target: ts.ScriptTarget.ES2022,
      module: ts.ModuleKind.ES2022,
    },
  }).outputText;
  return import(
    "data:text/javascript;base64," +
    Buffer.from(compiled).toString("base64")
  );
}

const { calculate } = await loadTypeScript("../src/calculator.ts");
const { exercises, checkAnswer, generateExercise, canAdvance, practiceTopics } = await loadTypeScript("../src/practice.ts");

test("exercise IDs are unique", () => {
  assert.equal(new Set(exercises.map(item => item.id)).size, exercises.length);
});

for (const exercise of exercises) {
  test(`verified exercise: ${exercise.id}`, () => {
    assert.ok(exercise.prompt.trim());
    assert.ok(exercise.hint.trim());
    assert.equal(typeof exercise.degrees, "boolean");
    assert.ok(Number.isFinite(exercise.expected));

    const steps = [];
    const actual = calculate(exercise.expression, exercise.degrees, 0, steps);
    const tolerance = 1e-12 * Math.max(1, Math.abs(exercise.expected));
    assert.ok(Number.isFinite(actual));
    assert.ok(Math.abs(actual - exercise.expected) <= tolerance);
    assert.ok(steps.length > 0);
    assert.equal(checkAnswer(String(exercise.expected), exercise.expected).status, "correct");
    assert.equal(checkAnswer(String(exercise.expected + 1), exercise.expected).status, "incorrect");
  });
}

for (const input of ["", "   ", "1+1", "NaN", "Infinity", "1e999", "0x10", "1,5", "14abc"]) {
  test(`reject invalid answer: ${JSON.stringify(input)}`, () => {
    assert.equal(checkAnswer(input, 14).status, "invalid");
  });
}

test("accept decimal, signed, whitespace, and scientific notation", () => {
  for (const input of ["0.5", ".5", "+0.5", " 0.5 ", "5e-1"]) {
    assert.equal(checkAnswer(input, 0.5).status, "correct");
  }
  assert.equal(checkAnswer("-4", -4).status, "correct");
});

test("accept a close approximation and reject a distant one", () => {
  assert.equal(checkAnswer("0.5000005", 0.5).status, "correct");
  assert.equal(checkAnswer("0.50001", 0.5).status, "incorrect");
});

test("zero is accepted but an empty answer is not", () => {
  assert.equal(checkAnswer("0", 0).status, "correct");
  assert.equal(checkAnswer("", 0).status, "invalid");
});

test("relative tolerance scales with the expected answer", () => {
  assert.equal(checkAnswer("220.0001", 220).status, "correct");
  assert.equal(checkAnswer("220.001", 220).status, "incorrect");
});

test("nonfinite expected answers are rejected", () => {
  assert.equal(checkAnswer("1", Infinity).status, "invalid");
  assert.equal(checkAnswer("1", NaN).status, "invalid");
});


test("generated exercises agree with the calculator across 1000 seeded samples", () => {
  let seed = 123456789;
  const random = () => {
    seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0;
    return seed / 4294967296;
  };

  let previous = "";
  const topics = new Set();
  const expressions = new Set();

  for (let index = 0; index < 1000; index++) {
    const exercise = generateExercise(previous, random);
    assert.notEqual(exercise.expression, previous);
    assert.ok(exercise.prompt.trim());
    assert.ok(exercise.hint.trim());
    assert.ok(Number.isFinite(exercise.expected));

    const actual = calculate(exercise.expression, exercise.degrees, 0);
    const tolerance = 1e-12 * Math.max(1, Math.abs(exercise.expected));
    assert.ok(Number.isFinite(actual));
    assert.ok(Math.abs(actual - exercise.expected) <= tolerance);
    assert.equal(checkAnswer(String(exercise.expected), exercise.expected).status, "correct");
    assert.equal(checkAnswer(String(exercise.expected + 1), exercise.expected).status, "incorrect");

    topics.add(exercise.topic);
    expressions.add(exercise.expression);
    previous = exercise.expression;
  }

  assert.equal(topics.size, 8);
  assert.ok(expressions.size > 100);
});

test("generator avoids an immediate repeat even with a constant random source", () => {
  const random = () => 0;
  const first = generateExercise("", random);
  const second = generateExercise(first.expression, random);
  assert.notEqual(first.expression, second.expression);
});

test("progression requires a solved exercise", () => {
  assert.equal(canAdvance(false), false);
  assert.equal(canAdvance(true), true);
  for (const input of ["", "15", "1+1"]) {
    const checked = checkAnswer(input, 14);
    assert.equal(canAdvance(checked.status === "correct"), false);
  }
  assert.equal(canAdvance(checkAnswer("14", 14).status === "correct"), true);
});


for (const topic of practiceTopics.filter(item => item.id !== "mixed")) {
  test(`selected practice stays on topic and generates variety: ${topic.id}`, () => {
    let seed = 987654321;
    const random = () => {
      seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0;
      return seed / 4294967296;
    };

    let previous = "";
    let expectedTopic = "";
    const expressions = new Set();

    for (let index = 0; index < 200; index++) {
      const exercise = generateExercise(previous, random, topic.id);
      if (!expectedTopic) expectedTopic = exercise.topic;
      assert.equal(exercise.topic, expectedTopic);
      assert.notEqual(exercise.expression, previous);

      const actual = calculate(exercise.expression, exercise.degrees, 0);
      const tolerance = 1e-12 * Math.max(1, Math.abs(exercise.expected));
      assert.ok(Number.isFinite(actual));
      assert.ok(Math.abs(actual - exercise.expected) <= tolerance);

      expressions.add(exercise.expression);
      previous = exercise.expression;
    }

    assert.ok(expressions.size >= 10);
  });

  test(`repeat fallback preserves selected topic: ${topic.id}`, () => {
    const random = () => 0;
    const first = generateExercise("", random, topic.id);
    const second = generateExercise(first.expression, random, topic.id);
    assert.notEqual(first.expression, second.expression);
    assert.equal(first.topic, second.topic);
  });
}
