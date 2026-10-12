export type Exercise = {
  id: string;
  topic: string;
  prompt: string;
  expression: string;
  expected: number;
  degrees: boolean;
  hint: string;
};

export const exercises: Exercise[] = [
  {
    id: "order-1", topic: "Operation order",
    prompt: "Calculate 2 + 3 × 4.",
    expression: "2+3*4", expected: 14, degrees: true,
    hint: "Multiply 3 by 4 before adding 2.",
  },
  {
    id: "parentheses-1", topic: "Parentheses",
    prompt: "Calculate (2 + 3) × 4.",
    expression: "(2+3)*4", expected: 20, degrees: true,
    hint: "Complete the addition inside parentheses first.",
  },
  {
    id: "division-1", topic: "Operation order",
    prompt: "Calculate 20 ÷ 5 × 2.",
    expression: "20/5*2", expected: 8, degrees: true,
    hint: "Multiplication and division have equal priority. Work from left to right.",
  },
  {
    id: "powers-1", topic: "Powers",
    prompt: "Calculate 2 raised to the power 3.",
    expression: "2^3", expected: 8, degrees: true,
    hint: "Multiply three copies of 2.",
  },
  {
    id: "negative-1", topic: "Powers and signs",
    prompt: "Calculate -2^2, without parentheses around -2.",
    expression: "-2^2", expected: -4, degrees: true,
    hint: "Evaluate the power first, then apply the leading minus.",
  },
  {
    id: "percent-1", topic: "Percentages",
    prompt: "What is 10 percent of 200?",
    expression: "200*10%", expected: 20, degrees: true,
    hint: "Convert 10 percent to 10 / 100, then multiply by 200.",
  },
  {
    id: "percent-2", topic: "Percentages",
    prompt: "Increase 200 by 10 percent. What is the new total?",
    expression: "200*(1+10%)", expected: 220, degrees: true,
    hint: "Keep the original 100 percent and add another 10 percent.",
  },
  {
    id: "sqrt-1", topic: "Square roots",
    prompt: "Find the nonnegative square root of 81.",
    expression: "sqrt(81)", expected: 9, degrees: true,
    hint: "Which nonnegative number multiplied by itself gives 81?",
  },
  {
    id: "sine-1", topic: "Trigonometry",
    prompt: "Calculate sin(30) in degree mode.",
    expression: "sin(30)", expected: 0.5, degrees: true,
    hint: "Use degrees. In a 30-degree right triangle, the opposite side is half the hypotenuse.",
  },
  {
    id: "cosine-1", topic: "Trigonometry",
    prompt: "Calculate cos(pi) in radian mode.",
    expression: "cos(pi)", expected: -1, degrees: false,
    hint: "An angle of pi radians is half a turn. Think of the horizontal coordinate on the unit circle.",
  },
];

export type AnswerCheck = {
  status: "correct" | "incorrect" | "invalid";
  message: string;
};

export function checkAnswer(input: string, expected: number): AnswerCheck {
  const text = input.trim();
  const numeric = /^[+-]?(?:\d+(?:\.\d*)?|\.\d+)(?:e[+-]?\d+)?$/i;

  if (!numeric.test(text)) {
    return {
      status: "invalid",
      message: "Enter a number, such as 14, -4, or 0.5—not an expression.",
    };
  }

  const value = Number(text);
  if (!Number.isFinite(value) || !Number.isFinite(expected)) {
    return {
      status: "invalid",
      message: "The answer must be a finite number.",
    };
  }

  const tolerance = 1e-6 * Math.max(1, Math.abs(expected));
  return Math.abs(value - expected) <= tolerance
    ? { status: "correct", message: "Correct." }
    : {
        status: "incorrect",
        message: "Not quite. Try again, use the hint, or reveal the solution.",
      };
}



export const practiceTopics = [
  { id: "mixed", label: "Mixed practice" },
  { id: "order", label: "Operation order" },
  { id: "parentheses", label: "Parentheses" },
  { id: "division", label: "Multiplication and division" },
  { id: "powers", label: "Powers" },
  { id: "signs", label: "Powers and negative signs" },
  { id: "percent", label: "Percentages of amounts" },
  { id: "increase", label: "Percentage increases" },
  { id: "roots", label: "Square roots" },
] as const;

export type PracticeTopic = typeof practiceTopics[number]["id"];

export function generateExercise(
  previousExpression = "",
  random: () => number = Math.random,
  topic: PracticeTopic = "mixed",
): Exercise {
  const integer = (minimum: number, maximum: number) =>
    minimum + Math.floor(random() * (maximum - minimum + 1));

  function create(): Exercise {
    const selected = practiceTopics.findIndex(item => item.id === topic) - 1;
    const kind = selected >= 0 ? selected : integer(0, 7);
    let item: Omit<Exercise, "id">;

    switch (kind) {
      case 0: {
        const a = integer(1, 20), b = integer(2, 12), c = integer(2, 12);
        item = {
          topic: "Operation order",
          prompt: `Calculate ${a} + ${b} × ${c}.`,
          expression: `${a}+${b}*${c}`,
          expected: a + b * c, degrees: true,
          hint: "Complete the multiplication before the addition.",
        };
        break;
      }
      case 1: {
        const a = integer(1, 20), b = integer(1, 20), c = integer(2, 10);
        item = {
          topic: "Parentheses",
          prompt: `Calculate (${a} + ${b}) × ${c}.`,
          expression: `(${a}+${b})*${c}`,
          expected: (a + b) * c, degrees: true,
          hint: "Add the numbers inside parentheses, then multiply.",
        };
        break;
      }
      case 2: {
        const quotient = integer(2, 12), divisor = integer(2, 12);
        const multiplier = integer(2, 9), dividend = quotient * divisor;
        item = {
          topic: "Multiplication and division",
          prompt: `Calculate ${dividend} ÷ ${divisor} × ${multiplier}.`,
          expression: `${dividend}/${divisor}*${multiplier}`,
          expected: quotient * multiplier, degrees: true,
          hint: "Division and multiplication have equal priority. Work from left to right.",
        };
        break;
      }
      case 3: {
        const base = integer(2, 9), exponent = integer(2, 3);
        item = {
          topic: "Powers",
          prompt: `Calculate ${base} raised to the power ${exponent}.`,
          expression: `${base}^${exponent}`,
          expected: base ** exponent, degrees: true,
          hint: `Multiply ${exponent} copies of ${base}.`,
        };
        break;
      }
      case 4: {
        const base = integer(2, 15);
        item = {
          topic: "Powers and signs",
          prompt: `Calculate -${base}^2, without parentheses around -${base}.`,
          expression: `-${base}^2`,
          expected: -(base ** 2), degrees: true,
          hint: "Square the positive number first, then apply the leading minus.",
        };
        break;
      }
      case 5: {
        const amount = integer(2, 40) * 10;
        const percent = integer(1, 10) * 5;
        item = {
          topic: "Percentages",
          prompt: `What is ${percent} percent of ${amount}?`,
          expression: `${amount}*${percent}%`,
          expected: amount * (percent / 100), degrees: true,
          hint: "Divide the percentage by 100, then multiply by the amount.",
        };
        break;
      }
      case 6: {
        const amount = integer(2, 40) * 10;
        const percent = integer(1, 6) * 5;
        item = {
          topic: "Percentage increases",
          prompt: `Increase ${amount} by ${percent} percent. What is the new total?`,
          expression: `${amount}*(1+${percent}%)`,
          expected: amount * (1 + percent / 100), degrees: true,
          hint: "Multiply the original amount by 1 plus the percentage divided by 100.",
        };
        break;
      }
      default: {
        const root = integer(2, 25);
        item = {
          topic: "Square roots",
          prompt: `Find the nonnegative square root of ${root * root}.`,
          expression: `sqrt(${root * root})`,
          expected: root, degrees: true,
          hint: "Find the nonnegative number that gives the input when multiplied by itself.",
        };
      }
    }

    return { ...item, id: `generated:${item.expression}` };
  }

  for (let attempt = 0; attempt < 12; attempt++) {
    const exercise = create();
    if (exercise.expression !== previousExpression) return exercise;
  }

  // Retry with varied deterministic input while preserving the selected topic.
  for (let offset = 1; offset <= 100; offset++) {
    let draw = 0;
    const alternateRandom = () => ((offset * 37 + draw++ * 17) % 101) / 101;
    const alternative = generateExercise("", alternateRandom, topic);
    if (alternative.expression !== previousExpression) return alternative;
  }
  throw new Error("Could not generate a different exercise.");
}

export function canAdvance(solved: boolean): boolean {
  return solved === true;
}
