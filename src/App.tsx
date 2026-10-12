import Finance from "./Finance";
import WordProblems from "./WordProblems";
import Practice from "./Practice";
import { calculateMoney, currencies, formatMoney } from "./money";
import type { Currency } from "./money";
import { useEffect, useRef, useState } from "react";
import type { CSSProperties } from "react";
import { calculate } from "./calculator";
import type { CalculationStep } from "./calculator";
import "./App.css";

const themes = ["system", "veil", "ember", "light", "contrast"] as const;
const palettes = ["standard", "protan", "deutan", "tritan"] as const;
type Theme = typeof themes[number];
type Palette = typeof palettes[number];
type Entry = { expression: string; result: number; degrees: boolean; money: boolean; currency: Currency };
type Settings = { theme: Theme; palette: Palette; degrees: boolean };

function loadSettings(): Settings {
  const defaults: Settings = { theme: "veil", palette: "standard", degrees: true };
  try {
    const saved = JSON.parse(localStorage.getItem("chitralogic.settings") || "{}");
    return {
      theme: themes.includes(saved.theme) ? saved.theme : defaults.theme,
      palette: palettes.includes(saved.palette) ? saved.palette : defaults.palette,
      degrees: typeof saved.degrees === "boolean" ? saved.degrees : true,
    };
  } catch { return defaults; }
}

type Cosmetics = {
  accent: string;
  finish: "flat" | "raised" | "beveled";
  shape: "square" | "rounded" | "pill";
  density: "compact" | "comfortable" | "spacious";
  textSize: "small" | "standard" | "large";
  motion: "subtle" | "off";
};

const cosmeticDefaults: Cosmetics = {
  accent: "", finish: "raised", shape: "rounded",
  density: "comfortable", textSize: "standard", motion: "subtle",
};

function loadCosmetics(): Cosmetics {
  try {
    const saved = JSON.parse(localStorage.getItem("chitralogic.cosmetics") || "{}");
    return {
      accent: typeof saved.accent === "string" &&
        (saved.accent === "" || /^#[0-9a-f]{6}$/i.test(saved.accent))
        ? saved.accent : "",
      finish: ["flat", "raised", "beveled"].includes(saved.finish)
        ? saved.finish : "raised",
      shape: ["square", "rounded", "pill"].includes(saved.shape)
        ? saved.shape : "rounded",
      density: ["compact", "comfortable", "spacious"].includes(saved.density)
        ? saved.density : "comfortable",
      textSize: ["small", "standard", "large"].includes(saved.textSize)
        ? saved.textSize : "standard",
      motion: saved.motion === "off" ? "off" : "subtle",
    };
  } catch { return { ...cosmeticDefaults }; }
}

function foregroundFor(hex: string): string {
  const values = [1, 3, 5].map(start => {
    const value = parseInt(hex.slice(start, start + 2), 16) / 255;
    return value <= 0.04045 ? value / 12.92 : ((value + 0.055) / 1.055) ** 2.4;
  });
  const luminance = values[0] * 0.2126 + values[1] * 0.7152 + values[2] * 0.0722;
  return (luminance + 0.05) / 0.05 >= 1.05 / (luminance + 0.05)
    ? "#000000" : "#ffffff";
}

type Lesson = { title: string; paragraphs: string[] };

function lessonFor(
  expression: string, degrees: boolean, money = false,
): Lesson {
  if (!expression.trim()) {
    return {
      title: "Enter a problem to choose a method",
      paragraphs: [
        "The lesson updates as you edit the expression.",
        "Calculation steps appear after you calculate and remain attached to the last evaluated expression.",
      ],
    };
  }

  if (money) {
    const paragraphs = [
      "Use one currency throughout the expression. The currency selector labels amounts; it does not convert them.",
      "Money mode rounds only the final answer to two decimal places. Halfway values round away from zero.",
    ];
    if (expression.includes("%")) {
      paragraphs.push(
        "Percent means per hundred. Write amount * percentage% to find a percentage of an amount.",
        "For a discount, use amount * (1 - percentage%). For an increase, use amount * (1 + percentage%).",
        "Adding a percentage directly does not calculate an automatic increase: 200 + 10% means 200 + 0.1.",
      );
    }
    if (expression.includes("/")) {
      paragraphs.push(
        "Division can calculate a share. Rounded shares may leave a remainder: 10 / 3 gives 3.33, and three such payments total 9.99.",
      );
    }
    if (expression.includes("*")) {
      paragraphs.push("Multiply a unit price by the quantity to calculate the total price.");
    }
    if (expression.includes("+") || expression.includes("-")) {
      paragraphs.push("Add amounts to find a total, or subtract expenses and deductions to find what remains.");
    }
    paragraphs.push(
      "Complete parentheses first, then multiplication and division from left to right, followed by addition and subtraction from left to right.",
      "Money mode supports arithmetic, percentages, parentheses, and ans—not scientific functions.",
    );
    return { title: "Money arithmetic for the current expression", paragraphs };
  }

  if (/\b(?:sin|cos|tan)\s*\(/i.test(expression)) {
    return {
      title: "Trigonometric functions and angle units",
      paragraphs: [
        `This calculation uses ${degrees ? "degrees" : "radians"}. Check the angle mode before evaluating.`,
        "For degree input, multiply the angle by pi / 180 to express it in radians.",
        "In a right triangle, sine is opposite / hypotenuse, cosine is adjacent / hypotenuse, and tangent is opposite / adjacent. Their definitions also extend beyond right triangles.",
        "Example: sin(30) in degree mode is approximately 0.5. Tangent is undefined at 90 degrees and equivalent angles.",
      ],
    };
  }
  if (expression.includes("%")) {
    return {
      title: "Understanding percentages",
      paragraphs: [
        "Percent means per hundred. Chitralogic treats x% as x / 100.",
        "To find 10 percent of 200, enter 200 * 10%. The result is 20.",
        "To increase 200 by 10 percent, enter 200 * (1 + 10%). The result is 220.",
        "Important: 200 + 10% means 200 + 0.1 here, not an automatic 10-percent increase.",
      ],
    };
  }
  if (expression.includes("^") || /\bsqrt\s*\(/i.test(expression)) {
    return {
      title: "Powers and square roots",
      paragraphs: [
        "For a positive whole-number exponent, a power represents repeated multiplication: 2^3 = 2 * 2 * 2.",
        "A square root asks for the nonnegative number whose square gives the input: sqrt(81) = 9.",
        "Chained powers are evaluated from the right: 2^3^2 means 2^(3^2).",
        "A leading minus is applied after a power: -2^2 = -4, whereas (-2)^2 = 4.",
      ],
    };
  }
  if (/\b(?:ln|log|exp|abs)\s*\(/i.test(expression)) {
    return {
      title: "Reading scientific functions",
      paragraphs: [
        "abs(x) gives the distance of x from zero.",
        "ln(x) is the natural logarithm; log(x) is the base-10 logarithm. Both require positive real inputs in this calculator.",
        "exp(x) means e raised to the power x.",
        "Write function inputs in parentheses, such as log(100) or abs(-5).",
      ],
    };
  }
  return {
    title: "Operation order",
    paragraphs: [
      "Evaluate the contents of parentheses first.",
      "Evaluate powers before multiplication and division.",
      "Multiplication and division have equal priority and are evaluated from left to right. Addition and subtraction follow the same rule at their priority level.",
      "Example: 2 + 3 * 4 first becomes 2 + 12, then 14. Parentheses change the grouping: (2 + 3) * 4 = 20.",
    ],
  };
}

function loadLearningPreference(): boolean {
  try { return localStorage.getItem("chitralogic.learning") === "true"; }
  catch { return false; }
}

function format(value: number): string {
  return Number(value.toPrecision(14)).toString();
}

function App() {
  const [settings, setSettings] = useState<Settings>(loadSettings);
  const [cosmetics, setCosmetics] = useState<Cosmetics>(loadCosmetics);
  const [cosmeticWarning, setCosmeticWarning] = useState("");

  useEffect(() => {
    try {
      localStorage.setItem("chitralogic.cosmetics", JSON.stringify(cosmetics));
      setCosmeticWarning("");
    } catch {
      setCosmeticWarning("Cosmetic preferences could not be saved.");
    }
  }, [cosmetics]);

  const customAccentActive = cosmetics.accent !== "" &&
    settings.palette === "standard" && settings.theme !== "contrast";

  const cosmeticStyle = {
    ...(customAccentActive ? {
      "--accent": cosmetics.accent,
      "--on-accent": foregroundFor(cosmetics.accent),
    } : {}),
  } as CSSProperties;
  const [expression, setExpression] = useState("");
  const [moneyMode, setMoneyMode] = useState(false);
  const [currency, setCurrency] = useState<Currency>("USD");
  const [workedMoney, setWorkedMoney] = useState(false);
  const [workedCurrency, setWorkedCurrency] = useState<Currency>("USD");
  const [showSteps, setShowSteps] = useState(loadLearningPreference);
  const [steps, setSteps] = useState<CalculationStep[]>([]);
  const [workedExpression, setWorkedExpression] = useState("");
  const [workedDegrees, setWorkedDegrees] = useState(true);
  const [workedResult, setWorkedResult] = useState<number | null>(null);
  const [workedError, setWorkedError] = useState("");
  const [learningWarning, setLearningWarning] = useState("");

  useEffect(() => {
    try {
      localStorage.setItem("chitralogic.learning", String(showSteps));
      setLearningWarning("");
    } catch {
      setLearningWarning("The learning preference could not be saved.");
    }
  }, [showSteps]);
  const [result, setResult] = useState<number | null>(null);
  const [answer, setAnswer] = useState(0);
  const [history, setHistory] = useState<Entry[]>([]);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [storageWarning, setStorageWarning] = useState("");
  const input = useRef<HTMLInputElement>(null);

  useEffect(() => {
    try {
      localStorage.setItem("chitralogic.settings", JSON.stringify(settings));
      setStorageWarning("");
    } catch { setStorageWarning("Appearance settings could not be saved."); }
  }, [settings]);

  function insert(value: string) {
    const field = input.current;
    const start = field?.selectionStart ?? expression.length;
    const end = field?.selectionEnd ?? start;
    const next = expression.slice(0, start) + value + expression.slice(end);
    if (next.length > 512) return;
    setExpression(next);
    setResult(null);
    setError("");
    setMessage("");
    requestAnimationFrame(() => {
      field?.focus();
      field?.setSelectionRange(start + value.length, start + value.length);
    });
  }

  function evaluate() {
    const trace: CalculationStep[] = [];
    setWorkedExpression(expression);
    setWorkedDegrees(settings.degrees);
    setWorkedMoney(moneyMode);
    setWorkedCurrency(currency);
    setWorkedResult(null);
    setWorkedError("");
    try {
      const value = moneyMode
        ? calculateMoney(expression, answer, trace)
        : calculate(expression, settings.degrees, answer, trace);
      setSteps(trace);
      setWorkedResult(value);
      setResult(value);
      setAnswer(value);
      setHistory(items => [{ expression, result: value, degrees: settings.degrees, money: moneyMode, currency }, ...items].slice(0, 50));
      setError("");
      setMessage("Calculation complete.");
    } catch (failure) {
      setResult(null);
      const explanation = failure instanceof Error ? failure.message : "Calculation failed.";
      setError(explanation);
      setWorkedError(explanation);
      setSteps(trace);
      setMessage("");
    }
  }

  async function copyResult() {
    if (result === null) return;
    try {
      await navigator.clipboard.writeText(moneyMode ? formatMoney(result, currency) : format(result));
      setMessage("Result copied.");
    } catch { setMessage("Copy failed. Select the displayed result and copy it manually."); }
  }

  async function copySteps() {
    const lines = [
      `Expression: ${workedExpression}`,
      `Mode: ${workedMoney ? "Money (" + workedCurrency + ")" : workedDegrees ? "Degrees" : "Radians"}`,
      ...steps.map((step, index) => `${index + 1}. ${step.description} = ${format(step.value)}`),
      workedError ? `Stopped: ${workedError}` :
        workedResult !== null ? `Answer: ${workedMoney ? formatMoney(workedResult, workedCurrency) : format(workedResult)}` : "",
      "Displayed numbers may be rounded; evaluation uses floating-point values.",
    ];
    try {
      await navigator.clipboard.writeText(lines.filter(Boolean).join("\n"));
      setMessage("Calculation steps copied.");
    } catch {
      setMessage("Copy failed. Select the steps and copy them manually.");
    }
  }

  function clear() {
    setSteps([]);
    setWorkedExpression("");
    setWorkedResult(null);
    setWorkedError("");
    setExpression("");
    setResult(null);
    setError("");
    setMessage("");
    input.current?.focus();
  }

  return (
    <main className="app" data-theme={settings.theme}
      data-palette={settings.palette}
      data-finish={cosmetics.finish}
      data-shape={cosmetics.shape}
      data-density={cosmetics.density}
      data-text-size={cosmetics.textSize}
      data-motion={cosmetics.motion}
      style={cosmeticStyle}>
      <header>
        <div><p className="eyebrow">HEX & ROACH · DEVELOPMENT BUILD</p><h1>Chitralogic</h1></div>
        <span className="badge">Calculator</span>
      </header>
      <div className="opening-art">
        <img
          src="/chitralogic-opening.svg"
          alt="Chitralogic — Calculate. Understand. Practice."
          width="960"
          height="240"
        />
      </div>

      <section className="panel" aria-label="Calculator">
        <div className="settings">
          <label>Calculation mode
            <select value={moneyMode ? "money" : "standard"} onChange={event => {
              setMoneyMode(event.target.value === "money");
              setResult(null); setError(""); setMessage("");
            }}>
              <option value="standard">Standard / scientific</option>
              <option value="money">Money arithmetic</option>
            </select>
          </label>
          {moneyMode && <label>Currency label
            <select value={currency} onChange={event => {
              setCurrency(event.target.value as Currency);
              setResult(null); setError(""); setMessage("");
            }}>
              {currencies.map(code => <option key={code} value={code}>{code}</option>)}
            </select>
          </label>}
        </div>
        {moneyMode && <p className="hint">
          Enter amounts without currency symbols or commas. Currency labels do not convert amounts.
          Decimal arithmetic uses 40 significant digits. Only the final answer is rounded
          to two decimals; halfway values round away from zero. ans stores that rounded answer.
          This mode supports +, -, *, /, %, and parentheses.
          A split such as 10 / 3 gives 3.33 each, leaving 0.01 of the total unallocated.
          Use 200 * (1 + 10%) for a 10% increase—not 200 + 10%.
        </p>}
        <form onSubmit={event => { event.preventDefault(); evaluate(); }}>
          <label htmlFor="expression">Expression</label>
          <input id="expression" ref={input} value={expression} maxLength={512}
            autoComplete="off" spellCheck={false}
            placeholder="Example: sqrt(81) + 2^3"
            aria-invalid={Boolean(error)} aria-describedby="expression-help calculation-status"
            onChange={event => {
              setExpression(event.target.value); setResult(null); setError(""); setMessage("");
            }}
            onKeyDown={event => {
              if (event.key === "Escape") { event.preventDefault(); clear(); }
            }} />
          <p id="expression-help" className="hint">Enter calculates · Escape clears · Use * for multiplication · % divides by 100</p>
          <div className="result-row">
            <output aria-label="Result">{result === null ? "—" : moneyMode ? formatMoney(result, currency) : format(result)}</output>
            <button type="button" disabled={result === null} onClick={copyResult}>Copy result</button>
          </div>
          <div id="calculation-status" className="status" role="status" aria-live="polite">
            {error ? `Error: ${error}` : message || "Ready"}
          </div>
          <div className="keys">
            {["7", "8", "9", "/", "4", "5", "6", "*", "1", "2", "3", "-", "0", ".", "%", "+"].map(key =>
              <button type="button" key={key} onClick={() => insert(key)}>{key}</button>
            )}
            <button type="button" onClick={() => insert("(")}>(</button>
            <button type="button" onClick={() => insert(")")}>)</button>
            <button type="button" onClick={clear}>Clear</button>
            <button className="primary" type="submit">Calculate</button>
          </div>
        </form>
        <div className="science" aria-label="Scientific functions" hidden={moneyMode}>
          {["sin(", "cos(", "tan(", "sqrt(", "ln(", "log(", "abs(", "exp(", "^", "pi", "e", "ans"].map(key =>
            <button key={key} onClick={() => insert(key)}>{key.endsWith("(") ? key.slice(0, -1) : key}</button>
          )}
        </div>
        <label className="mode" hidden={moneyMode}>Angle mode
          <select value={settings.degrees ? "degrees" : "radians"} onChange={event => {
            setSettings({ ...settings, degrees: event.target.value === "degrees" });
            setResult(null); setError(""); setMessage("");
          }}>
            <option value="degrees">Degrees</option><option value="radians">Radians</option>
          </select>
        </label>
      </section>

      <WordProblems />

      <Finance />

      <Practice />

      <section className="panel" aria-label="Learning tools">
        <label className="learning-toggle">
          <input type="checkbox" checked={showSteps}
            onChange={event => setShowSteps(event.target.checked)} />
          Show calculation steps
        </label>
        {learningWarning && <p role="status">{learningWarning}</p>}
        {showSteps && (
          <div className="learning-content">
            <h2>Last evaluated expression</h2>
            {!workedExpression.trim() ? <p className="hint">Calculate an expression to see its steps.</p> : <>
              <p className="worked-expression">{workedExpression}</p>
              <p className="hint">Angle mode: {workedMoney ? "Not applicable in Money mode" : workedDegrees ? "Degrees" : "Radians"}</p>
              {steps.length ? <ol className="step-list">
                {steps.map((step, index) => <li key={index}>
                  {step.description}<br /><span>= {format(step.value)}</span>
                </li>)}
              </ol> : <p>No intermediate operation was completed.</p>}
              {workedError ? <p>Stopped: {workedError}</p> :
                workedResult !== null && <p>Answer: {workedMoney ? formatMoney(workedResult, workedCurrency) : format(workedResult)}</p>}
              <p className="hint">This is an evaluation trace, not a symbolic proof.
                Step values may be abbreviated for display. Money mode rounds the final answer to two decimals; intermediate amounts are not rounded to cents.</p>
              <button onClick={copySteps}>Copy steps</button>
            </>}
          </div>
        )}
        <details className="lesson">
          <summary>Learn the method</summary>
          <h2>{lessonFor(expression, settings.degrees, moneyMode).title}</h2>
          {lessonFor(expression, settings.degrees, moneyMode)
            .paragraphs.map((paragraph, index) => <p key={index}>{paragraph}</p>)}
          <p className="hint">Live lesson follows the current input. This is an introductory method guide, not a complete worked solution.</p>
        </details>
      </section>

      {moneyMode && <details className="panel">
        <summary>Learn about money arithmetic</summary>
        <p>Add prices to find a total; subtract expenses to find what remains.</p>
        <p>Multiply a unit price by the quantity: 4.99 * 6 = 29.94.</p>
        <p>A discount subtracts part of the original price: 80 * (1 - 15%) = 68.</p>
        <p>A markup adds part of the original amount: 50 * (1 + 8%) = 54.</p>
        <p>Division gives an equal share, but rounded shares may not sum to the original bill.
          For 10 split three ways, two people can pay 3.33 and one can pay 3.34.</p>
        <p>Use one currency throughout an expression. This tool does not perform conversion,
          apply tax rules, or choose a payment allocation automatically.</p>
      </details>}

      <details className="panel">
        <summary>Appearance & accessibility</summary>
        <div className="settings">
          <label>Theme<select value={settings.theme} onChange={event =>
            setSettings({ ...settings, theme: event.target.value as Theme })}>
            <option value="system">System light/dark</option>
            <option value="veil">Veil Dark</option>
            <option value="ember">Forge Ember</option>
            <option value="light">Shell Light</option>
            <option value="contrast">High Contrast</option>
          </select></label>
          <label>Color palette<select value={settings.palette} onChange={event =>
            setSettings({ ...settings, palette: event.target.value as Palette })}>
            <option value="standard">Standard</option>
            <option value="protan">Protan alternative</option>
            <option value="deutan">Deutan alternative</option>
            <option value="tritan">Tritan alternative</option>
          </select></label>
        </div>
        <h2 className="cosmetic-heading">Cosmetics</h2>
        <div className="settings">
          <label>Accent preset
            <select value={["", "#c9afff", "#ffc17a", "#7ddfff", "#91e5bd", "#ffb4d0"].includes(cosmetics.accent)
              ? cosmetics.accent : "custom"}
              onChange={event => setCosmetics({
                ...cosmetics,
                accent: event.target.value === "custom" ? "#c9afff" : event.target.value,
              })}>
              <option value="">Theme default</option>
              <option value="#c9afff">Violet</option>
              <option value="#ffc17a">Amber</option>
              <option value="#7ddfff">Cyan</option>
              <option value="#91e5bd">Mint</option>
              <option value="#ffb4d0">Rose</option>
              <option value="custom">Custom</option>
            </select>
          </label>
          <label>Custom accent
            <input type="color" value={cosmetics.accent || "#c9afff"}
              onChange={event => setCosmetics({ ...cosmetics, accent: event.target.value })} />
          </label>
          <label>Surface finish
            <select value={cosmetics.finish} onChange={event =>
              setCosmetics({ ...cosmetics, finish: event.target.value as Cosmetics["finish"] })}>
              <option value="flat">Flat</option>
              <option value="raised">Raised</option>
              <option value="beveled">Beveled</option>
            </select>
          </label>
          <label>Key shape
            <select value={cosmetics.shape} onChange={event =>
              setCosmetics({ ...cosmetics, shape: event.target.value as Cosmetics["shape"] })}>
              <option value="square">Square</option>
              <option value="rounded">Rounded</option>
              <option value="pill">Pill</option>
            </select>
          </label>
          <label>Spacing
            <select value={cosmetics.density} onChange={event =>
              setCosmetics({ ...cosmetics, density: event.target.value as Cosmetics["density"] })}>
              <option value="compact">Compact</option>
              <option value="comfortable">Comfortable</option>
              <option value="spacious">Spacious</option>
            </select>
          </label>
          <label>Text size
            <select value={cosmetics.textSize} onChange={event =>
              setCosmetics({ ...cosmetics, textSize: event.target.value as Cosmetics["textSize"] })}>
              <option value="small">Small</option>
              <option value="standard">Standard</option>
              <option value="large">Large</option>
            </select>
          </label>
          <label>Motion
            <select value={cosmetics.motion} onChange={event =>
              setCosmetics({ ...cosmetics, motion: event.target.value as Cosmetics["motion"] })}>
              <option value="subtle">Subtle</option>
              <option value="off">Off</option>
            </select>
          </label>
        </div>
        <p className="hint">Changes preview immediately. Accessibility palettes override decorative accents;
          High Contrast overrides decorative finishes.</p>
        <p className="hint">Alternative palettes are experimental. Status information always includes text.</p>
        <button onClick={() => {
          setSettings({ theme: "veil", palette: "standard", degrees: settings.degrees });
          setCosmetics({ ...cosmeticDefaults });
        }}>Reset appearance</button>
        {cosmeticWarning && <p role="status">{cosmeticWarning}</p>}
        {storageWarning && <p role="status">{storageWarning}</p>}
      </details>

      <section className="panel" aria-label="Calculation history">
        <div className="history-heading"><h2>Session history</h2>
          <button disabled={!history.length} onClick={() => setHistory([])}>Clear history</button>
        </div>
        {!history.length ? <p className="hint">Calculations appear here. History is not saved after closing.</p> :
          <ol className="history">{history.map((item, index) =>
            <li key={index}><button onClick={() => {
              setExpression(item.expression);
              setMoneyMode(item.money);
              setCurrency(item.currency);
              setSettings({ ...settings, degrees: item.degrees });
              setResult(null); setError(""); setMessage("Expression restored. Calculate to evaluate it.");
              input.current?.focus();
            }}>
              <span>{item.expression}</span>
              <span>= {item.money ? formatMoney(item.result, item.currency) : format(item.result)} · {item.money ? "MONEY" : item.degrees ? "DEG" : "RAD"}</span>
            </button></li>
          )}</ol>}
      </section>
      <footer>Early prototype · Floating-point results · ans uses the most recent result</footer>
    </main>
  );
}

export default App;
