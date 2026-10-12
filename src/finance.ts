export type FinanceTool = "loan" | "savings" | "percentage";
export type FinanceResult = {
  rows: { label: string; value: number }[];
  steps: string[];
};

export function readNumber(text: string, label: string): number {
  const input = text.trim();
  if (!/^[+]?(?:\d+(?:\.\d*)?|\.\d+)$/.test(input)) {
    throw new Error(`${label}: enter a nonnegative number without commas or currency symbols.`);
  }
  const value = Number(input);
  if (!Number.isFinite(value)) throw new Error(`${label} is too large.`);
  return value;
}

function amount(value: number): void {
  if (!Number.isFinite(value) || value < 0 || value > 1e12) {
    throw new Error("Amounts must be between 0 and 1 trillion.");
  }
}

function rateValid(rate: number): void {
  if (!Number.isFinite(rate) || rate < 0 || rate > 100) {
    throw new Error("The percentage or annual rate must be between 0 and 100.");
  }
}

function durationValid(months: number): void {
  if (!Number.isInteger(months) || months < 1 || months > 1200) {
    throw new Error("Duration must be a whole number from 1 to 1200 months.");
  }
}

function checked(result: FinanceResult): FinanceResult {
  if (result.rows.some(row => !Number.isFinite(row.value) || Math.abs(row.value) > 1e12)) {
    throw new Error("Result exceeds the supported amount range. Reduce the inputs.");
  }
  return result;
}

export function loanPayment(principal: number, annual: number, months: number): FinanceResult {
  amount(principal); rateValid(annual); durationValid(months);
  const r = annual / 1200;
  const payment = r === 0 ? principal / months
    : principal * r / -Math.expm1(-months * Math.log1p(r));
  const total = payment * months;
  return checked({
    rows: [
      { label: "Monthly principal-and-interest payment", value: payment },
      { label: "Total payments", value: total },
      { label: "Total interest", value: Math.max(0, total - principal) },
    ],
    steps: [
      `Principal P = ${principal}; number of monthly payments n = ${months}.`,
      `Monthly rate r = ${annual} / 100 / 12 = ${r}.`,
      r === 0 ? "Payment = P / n."
        : "Payment = P × r / [1 − (1 + r)^(-n)].",
      "Total payments = payment × n.",
      "Total interest = total payments − principal.",
    ],
  });
}

export function savingsGrowth(
  initial: number, contribution: number, annual: number, months: number,
): FinanceResult {
  amount(initial); amount(contribution); rateValid(annual); durationValid(months);
  const r = annual / 1200;
  const growth = Math.expm1(months * Math.log1p(r));
  const factor = r === 0 ? months : growth / r;
  const balance = initial * (1 + growth) + contribution * factor;
  const deposited = initial + contribution * months;
  return checked({
    rows: [
      { label: "Projected ending balance", value: balance },
      { label: "Total deposited", value: deposited },
      { label: "Projected interest earned", value: Math.max(0, balance - deposited) },
    ],
    steps: [
      `Starting balance P = ${initial}; monthly deposit C = ${contribution}; months n = ${months}.`,
      `Monthly rate r = ${annual} / 100 / 12 = ${r}.`,
      r === 0 ? "Ending balance = P + C × n."
        : "Ending balance = P × (1 + r)^n + C × [(1 + r)^n − 1] / r.",
      "Deposits are added at the end of each month.",
      "Interest earned = ending balance − total deposited.",
    ],
  });
}

export function percentageChange(original: number, percent: number, decrease: boolean): FinanceResult {
  amount(original); rateValid(percent);
  const change = original * percent / 100;
  return checked({
    rows: [
      { label: decrease ? "Amount deducted" : "Amount added", value: change },
      { label: "New amount", value: decrease ? original - change : original + change },
    ],
    steps: [
      `Change = ${original} × (${percent} / 100).`,
      decrease ? "New amount = original − change." : "New amount = original + change.",
    ],
  });
}

export const financeLessons: Record<FinanceTool, { title: string; paragraphs: string[] }> = {
  loan: {
    title: "Understanding a loan payment",
    paragraphs: [
      "Principal is the amount borrowed. Interest is the charge for borrowing it.",
      "This model calculates equal monthly payments for a fixed-rate loan. Payments cover interest and repayment of principal.",
      "Enter the nominal annual interest rate, not a fee-inclusive APR. The model divides this rate by 12 to obtain a monthly rate.",
      "Example: borrowing 1200 for 12 months at zero interest gives a payment of 100 per month.",
      "The estimate excludes fees, insurance, taxes, balloon payments, and rate changes. Actual lender schedules and rounding may differ.",
    ],
  },
  savings: {
    title: "Understanding savings growth",
    paragraphs: [
      "The starting balance is what you already have. A monthly contribution is the amount added regularly.",
      "Compounding means interest can earn further interest over later periods.",
      "This model uses a constant nominal annual rate, monthly compounding, and end-of-month deposits. APY is an effective annual yield; do not enter it as though it were the nominal annual rate.",
      "Example: 1000 initially plus 100 per month for 12 months at zero interest gives 2200.",
      "This projection excludes fees, taxes, inflation, and investment risk. It is not a guaranteed return.",
    ],
  },
  percentage: {
    title: "Understanding discounts and markups",
    paragraphs: [
      "Percent means per hundred. Ten percent of 200 is 200 × 10 / 100 = 20.",
      "A 10 percent discount on 200 gives 180. A 10 percent markup on 200 gives 220.",
      "A markup is based on the original cost. It is not the same as profit margin, which uses selling price as its base.",
      "An increase and a decrease of the same percentage do not generally cancel because their starting amounts differ.",
      "This tool supports percentages from 0 through 100. It does not apply tax rules or currency conversions.",
    ],
  },
};
