import { useState } from "react";
import { interpretWordProblem, wordExamples } from "./wordProblems";
import type { WordProblem } from "./wordProblems";
import { calculate } from "./calculator";
import type { CalculationStep } from "./calculator";
import { calculateMoney, currencies, formatMoney } from "./money";
import type { Currency } from "./money";

type Solution = {
  problem: WordProblem;
  steps: CalculationStep[];
  value: number;
  currency: Currency;
};

function display(value: number): string {
  return Number(value.toPrecision(14)).toString();
}

export default function WordProblems() {
  const [text, setText] = useState("");
  const [currency, setCurrency] = useState<Currency>("USD");
  const [solution, setSolution] = useState<Solution | null>(null);
  const [error, setError] = useState("");

  let problem: WordProblem | null = null;
  let interpretationError = "";
  try {
    if (text.trim()) problem = interpretWordProblem(text);
  } catch (failure) {
    interpretationError = failure instanceof Error ? failure.message : "Could not interpret the problem.";
  }

  function updateText(value: string) {
    setText(value);
    setSolution(null);
    setError("");
  }

  function solve() {
    setSolution(null);
    setError("");
    if (!problem) return;
    const steps: CalculationStep[] = [];
    try {
      const value = problem.money
        ? calculateMoney(problem.expression, 0, steps)
        : calculate(problem.expression, true, 0, steps);
      setSolution({ problem, steps, value, currency });
    } catch (failure) {
      setError(failure instanceof Error ? failure.message : "Calculation failed.");
    }
  }

  return (
    <details className="panel word-panel">
      <summary>Word problems and explanations</summary>
      <div className="word-content">
        <label htmlFor="word-example">Choose a starting example</label>
        <select id="word-example" value="" onChange={event => {
          if (event.target.value) updateText(event.target.value);
        }}>
          <option value="">Choose an example…</option>
          {wordExamples.map(example => <option key={example} value={example}>{example}</option>)}
        </select>

        <form onSubmit={event => {
          event.preventDefault();
          solve();
        }}>
          <label htmlFor="word-input">Problem in words</label>
          <textarea
            id="word-input"
            rows={4}
            maxLength={512}
            value={text}
            aria-describedby="word-help"
            onChange={event => updateText(event.target.value)}
          />
          <p id="word-help" className="hint">
            Local sentence-pattern interpreter, not a general language solver.
            Start with an example and replace its numbers.
            Decimal points are supported; currency symbols and commas are not.
          </p>

          {problem && <>
            <h2>Current interpretation</h2>
            <p>{problem.interpretation}</p>
            <p className="worked-expression">Equation: {problem.expression}</p>
            <h3>Learn the method</h3>
            <ol>{problem.method.map((step, index) => <li key={index}>{step}</li>)}</ol>
            {problem.money && <label htmlFor="word-currency">
              Currency label—not conversion
              <select id="word-currency" value={currency} onChange={event => {
                setCurrency(event.target.value as Currency);
                setSolution(null);
                setError("");
              }}>
                {currencies.map(code => <option key={code} value={code}>{code}</option>)}
              </select>
            </label>}
          </>}

          {interpretationError && <p>{interpretationError}</p>}
          <button type="submit" disabled={!problem}>Calculate this interpretation</button>
        </form>

        <div role="status" aria-live="polite">
          {error && <p>Error: {error}</p>}
          {solution && <p>
            Answer: {solution.problem.money
              ? formatMoney(solution.value, solution.currency)
              : display(solution.value)}{solution.problem.unit ? ` ${solution.problem.unit}` : ""}
          </p>}
        </div>

        {solution && <details className="lesson" open>
          <summary>Worked calculation</summary>
          <ol className="step-list">
            {solution.steps.map((step, index) => <li key={index}>
              {step.description}<br /><span>= {display(step.value)}</span>
            </li>)}
          </ol>
          <p className="hint">
            {solution.problem.money
              ? "Money results are rounded to two decimals, with halfway values away from zero."
              : "Standard results use floating-point arithmetic and may be abbreviated for display."}
            {" "}This panel does not change the main calculator or its ans.
          </p>
        </details>}
      </div>
    </details>
  );
}
