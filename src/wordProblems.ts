export type WordProblem = {
  expression: string;
  interpretation: string;
  method: string[];
  money: boolean;
  splitPeople?: number;
  unit?: string;
};

export const wordExamples = [
  "I buy six items at 4.99 each. What is the total?",
  "Add 12.50 and 8.99",
  "I have 100 and spend 27.50. How much remains?",
  "Split a bill of 84.60 among 3 people",
  "What is 15 percent of 200?",
  "Apply a 15 percent discount to 80",
  "Increase 200 by 10 percent",
];

const number = String.raw`(\d+(?:\.\d+)?|\.\d+)`;
const words: Record<string, string> = {
  zero: "0", one: "1", two: "2", three: "3", four: "4",
  five: "5", six: "6", seven: "7", eight: "8", nine: "9",
  ten: "10", eleven: "11", twelve: "12",
};


function interpretTruckProblem(source: string): WordProblem | null {
  const text = source.toLowerCase()
    .replace(/\\[\[\]()]/g, "")
    .replace(/[{}\u200b-\u200f\u2060\ufeff]/g, "")
    .replace(/(?<=\d),(?=\d{3}(?:\D|$))/g, "")
    .replace(/\s+/g, " ")
    .trim();

  if (!/\btruck\b/.test(text) || !/\bpallets?\b/.test(text)) return null;

  const empty = text.match(
    /\bunloaded\b[^.!?]*?\bweighs\s*(\d+(?:\.\d+)?)\s*pounds\b/
  );
  const pallets = text.match(/\bholds\s*(\d+)\s*pallets?\s+of\s+cargo\b/);
  const tires = text.match(/\beach\s+of\s+(?:the\s+)?(\d+)\s+tires\b/);
  const tireLoad = text.match(
    /\b(?:bears|supports|carries)\s+(?:approximately\s+|about\s+)?(\d+(?:\.\d+)?)\s*pounds\b/
  );
  const asksAverage = /\baverage\s+weight\s+of\s+(?:one|a|each)\s+pallet\b/.test(text);

  if (!empty || !pallets || !tires || !tireLoad || !asksAverage) {
    throw new Error(
      "For this truck problem, state the unloaded weight in pounds, the number of pallets, " +
      "the number of tires, the pounds supported by each tire, and ask for the average weight of one pallet."
    );
  }

  const emptyWeight = Number(empty[1]);
  const palletCount = Number(pallets[1]);
  const tireCount = Number(tires[1]);
  const perTire = Number(tireLoad[1]);
  const loadedWeight = tireCount * perTire;
  const cargoWeight = loadedWeight - emptyWeight;

  if (![emptyWeight, palletCount, tireCount, perTire, loadedWeight, cargoWeight]
      .every(Number.isFinite)) {
    throw new Error("The truck quantities must be finite.");
  }
  if (emptyWeight < 0 || perTire <= 0 ||
      !Number.isInteger(palletCount) || palletCount < 1 ||
      !Number.isInteger(tireCount) || tireCount < 1) {
    throw new Error("Use nonnegative unloaded weight, positive tire loads, and positive whole-number counts.");
  }
  if (cargoWeight < 0) {
    throw new Error("The loaded weight is less than the unloaded weight. Check the quantities.");
  }

  return {
    expression: `(${tires[1]}*${tireLoad[1]}-${empty[1]})/${pallets[1]}`,
    interpretation:
      `Find the average cargo weight per pallet using ${tireCount} tires, ` +
      `${perTire} pounds per tire, an unloaded weight of ${emptyWeight} pounds, ` +
      `and ${palletCount} pallets.`,
    method: [
      `Loaded truck weight: ${tireCount} × ${perTire} = ${loadedWeight} pounds.`,
      `Cargo weight: ${loadedWeight} − ${emptyWeight} = ${cargoWeight} pounds.`,
      `Average pallet weight: ${cargoWeight} ÷ ${palletCount} pounds per pallet.`,
      "This is an average; individual pallets may weigh different amounts.",
      "Because the tire loads are approximate, the answer is approximate.",
    ],
    money: false,
    unit: "pounds per pallet",
  };
}

export function interpretWordProblem(source: string): WordProblem {
  if (source.length > 512) throw new Error("Keep the problem within 512 characters.");

  const truckProblem = interpretTruckProblem(source);
  if (truckProblem) return truckProblem;

  const text = source.toLowerCase()
    .replace(/\b(zero|one|two|three|four|five|six|seven|eight|nine|ten|eleven|twelve)\b/g,
      word => words[word])
    .replace(/\bper\s+cent\b/g, "percent")
    .replace(/\s+/g, " ")
    .trim()
    .replace(/[?.!]+$/, "");

  if (!text) throw new Error("Enter a problem or choose an example.");

  const match = (pattern: string) => text.match(new RegExp(`^${pattern}$`));
  let found: RegExpMatchArray | null;

  if ((found = match(`i buy ${number} items? at ${number} each(?:\\. what is the total)?`))) {
    const quantity = Number(found[1]);
    if (!Number.isInteger(quantity) || quantity < 1 || quantity > 1000000) {
      throw new Error("Item quantity must be a whole number from 1 to 1,000,000.");
    }
    return {
      expression: `${found[1]}*${found[2]}`,
      interpretation: `Find the total for ${found[1]} items costing ${found[2]} each.`,
      method: ["Identify the quantity and unit price.", "Multiply quantity × unit price."],
      money: true,
    };
  }

  if ((found = match(`add ${number} and ${number}`))) {
    return {
      expression: `${found[1]}+${found[2]}`,
      interpretation: `Add ${found[1]} and ${found[2]}.`,
      method: ["Identify the two quantities.", "Add them to find their combined amount."],
      money: false,
    };
  }

  if ((found = match(`i have ${number} and spend ${number}(?:\\. how much remains)?`))) {
    return {
      expression: `${found[1]}-${found[2]}`,
      interpretation: `Subtract spending of ${found[2]} from a starting amount of ${found[1]}.`,
      method: ["Identify the starting amount and spending.", "Remaining amount = starting amount − spending.",
        "A negative result means the spending exceeds the starting amount."],
      money: true,
    };
  }

  if ((found = match(`split a bill of ${number} among ${number} people`))) {
    const people = Number(found[2]);
    if (!Number.isInteger(people) || people < 1 || people > 1000000) {
      throw new Error("The number of people must be a whole number from 1 to 1,000,000.");
    }
    return {
      expression: `${found[1]}/${found[2]}`,
      interpretation: `Divide a bill of ${found[1]} equally among ${found[2]} people.`,
      method: ["Identify the bill total and number of people.", "Equal share = bill total ÷ people.",
        "Rounded shares may not add up to the bill. Allocate any remainder separately."],
      money: true,
      splitPeople: people,
    };
  }

  if ((found = match(`(?:what is )?${number} (?:percent|%) of ${number}`))) {
    return {
      expression: `${found[2]}*${found[1]}%`,
      interpretation: `Find ${found[1]} percent of ${found[2]}.`,
      method: ["Divide the percentage by 100.", "Multiply that fraction by the original amount."],
      money: false,
    };
  }

  if ((found = match(`apply a ${number} (?:percent|%) discount to ${number}`))) {
    if (Number(found[1]) > 100) throw new Error("A discount must be between 0 and 100 percent.");
    return {
      expression: `${found[2]}*(1-${found[1]}%)`,
      interpretation: `Reduce a price of ${found[2]} by ${found[1]} percent.`,
      method: ["Find the fraction remaining: 1 − percentage / 100.", "Multiply the original price by that fraction."],
      money: true,
    };
  }

  if ((found = match(`increase ${number} by ${number} (?:percent|%)`))) {
    return {
      expression: `${found[1]}*(1+${found[2]}%)`,
      interpretation: `Increase ${found[1]} by ${found[2]} percent of its original value.`,
      method: ["Find the growth factor: 1 + percentage / 100.", "Multiply the original amount by that factor."],
      money: false,
    };
  }

  throw new Error(
    "This wording is not supported yet. Choose an example and replace its numbers. " +
    "Use decimal points, no currency symbols or commas, and one operation pattern. " +
    "Number words from zero to twelve are supported.",
  );
}
