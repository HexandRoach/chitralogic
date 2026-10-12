import { useState } from "react";
import {
  financeLessons, loanPayment, savingsGrowth, percentageChange, readNumber,
} from "./finance";
import type { FinanceTool, FinanceResult } from "./finance";
import { currencies, formatMoney } from "./money";
import type { Currency } from "./money";

export default function Finance() {
  const [tool, setTool] = useState<FinanceTool>("loan");
  const [currency, setCurrency] = useState<Currency>("USD");
  const [principal, setPrincipal] = useState("");
  const [rate, setRate] = useState("");
  const [months, setMonths] = useState("");
  const [contribution, setContribution] = useState("");
  const [decrease, setDecrease] = useState(false);
  const [result, setResult] = useState<FinanceResult | null>(null);
  const [error, setError] = useState("");

  function invalidate() { setResult(null); setError(""); }

  function field(id: string, label: string, value: string, update: (value: string) => void) {
    return <label htmlFor={id}>{label}
      <input id={id} type="text" inputMode="decimal" required
        autoComplete="off" value={value}
        onChange={event => { update(event.target.value); invalidate(); }} />
    </label>;
  }

  function evaluate() {
    invalidate();
    try {
      const p = readNumber(principal, "Amount");
      const r = readNumber(rate, "Rate or percentage");
      if (tool === "percentage") {
        setResult(percentageChange(p, r, decrease));
      } else {
        const n = readNumber(months, "Duration");
        setResult(tool === "loan" ? loanPayment(p, r, n)
          : savingsGrowth(p, readNumber(contribution, "Monthly contribution"), r, n));
      }
    } catch (failure) {
      setError(failure instanceof Error ? failure.message : "Calculation failed.");
    }
  }

  return <details className="panel finance-panel">
    <summary>Finance calculations and learning</summary>
    <div className="finance-content">
      <div className="settings">
        <label htmlFor="finance-tool">Tool
          <select id="finance-tool" value={tool} onChange={event => {
            setTool(event.target.value as FinanceTool);
            setPrincipal(""); setRate(""); setMonths(""); setContribution("");
            setDecrease(false); invalidate();
          }}>
            <option value="loan">Loan payments</option>
            <option value="savings">Savings growth</option>
            <option value="percentage">Discounts and markups</option>
          </select>
        </label>
        <label htmlFor="finance-currency">Currency label
          <select id="finance-currency" value={currency} onChange={event => {
            setCurrency(event.target.value as Currency); invalidate();
          }}>
            {currencies.map(code => <option key={code} value={code}>{code}</option>)}
          </select>
        </label>
      </div>

      <p className="hint">Use one currency throughout. Labels do not convert amounts.
        Enter numbers without commas or symbols. Amounts are limited to 1 trillion.</p>

      <form onSubmit={event => { event.preventDefault(); evaluate(); }}>
        <div className="finance-fields">
          {field("finance-principal", tool === "loan" ? "Loan principal"
            : tool === "savings" ? "Starting balance" : "Original amount", principal, setPrincipal)}
          {field("finance-rate", tool === "percentage" ? "Percentage (0–100)"
            : "Nominal annual interest rate (%) (0–100)", rate, setRate)}
          {tool !== "percentage" && field("finance-months", "Duration in months (1–1200)", months, setMonths)}
          {tool === "savings" && field("finance-contribution",
            "Monthly contribution (enter 0 for none)", contribution, setContribution)}
          {tool === "percentage" && <label htmlFor="finance-direction">Direction
            <select id="finance-direction" value={decrease ? "decrease" : "increase"}
              onChange={event => { setDecrease(event.target.value === "decrease"); invalidate(); }}>
              <option value="increase">Increase / markup</option>
              <option value="decrease">Decrease / discount</option>
            </select>
          </label>}
        </div>
        <button type="submit" className="primary">Calculate</button>
      </form>

      <div role="status" aria-live="polite">
        {error && <p>Error: {error}</p>}
        {result && <dl className="finance-results">
          {result.rows.map(row => <div key={row.label}>
            <dt>{row.label}</dt><dd>{formatMoney(row.value, currency)}</dd>
          </div>)}
        </dl>}
      </div>

      {result && <details className="lesson">
        <summary>Calculation breakdown</summary>
        <ol>{result.steps.map((step, index) => <li key={index}>{step}</li>)}</ol>
      </details>}

      <details className="lesson">
        <summary>Learn about this calculation</summary>
        <h2>{financeLessons[tool].title}</h2>
        {financeLessons[tool].paragraphs.map((paragraph, index) => <p key={index}>{paragraph}</p>)}
      </details>

      <p className="hint">Estimates only, not financial advice. Finance formulas use
        floating-point arithmetic; displayed amounts round to two decimals.
        Totals use unrounded values, so displayed rounded payments may not multiply
        exactly to displayed totals. Finance does not change the main calculator or practice.</p>
    </div>
  </details>;
}
