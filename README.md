# Chitralogic

A local desktop calculator by Hex & Roach, built with React, TypeScript, and Tauri.

## Status

Feature-complete development checkpoint for the initial agreed scope.
The latest recorded automated run passed 182 tests and the frontend build.
Accessibility validation and final packaged regression testing remain incomplete.
This is not a claim of general release readiness or cross-platform validation.

## Features

- Standard and scientific expression calculations.
- Degree and radian modes.
- Calculation traces and live introductory method explanations.
- Money arithmetic using decimal.js, with currency-labeled results.
- Generated practice with selectable topics.
- Correct-answer progression and worked solutions unlocked after three incorrect numerical submissions.
- Supported word-problem patterns, including truck-and-pallet average-weight problems.
- Finance calculators for loan payments, savings growth, discounts, and markups.
- Finance lessons and calculation breakdowns.
- Themes, appearance controls, and experimental alternative color palettes.
- Local preference storage and session-only calculation history.

## Development

Install Node.js/npm, Rust, and the platform dependencies required by Tauri.

```bash
npm ci
npm run tauri dev
```

## Checks

```bash
npm run check:all
```

This runs the installed automated test suites and the TypeScript/Vite frontend build.
It does not replace UI, screen-reader, or packaged-runtime testing.

## Desktop build

```bash
npm run tauri build
```

The current configuration targets the available bundle formats.
Linux development has produced Debian, RPM, and AppImage packages.

## Calculator behavior

- Use `*` for multiplication and parentheses for grouping.
- Percentages divide by 100: `200 + 10%` means `200 + 0.1`.
- For a 10% increase, use `200 * (1 + 10%)`.
- Standard/scientific calculations use floating-point arithmetic.
- `ans` uses the most recent main-calculator result.
- Calculation traces show evaluation order, not symbolic proofs.

## Money mode

Supports numbers, `ans`, addition, subtraction, multiplication, division,
percentages, and parentheses. Scientific functions require Standard mode.

Decimal calculations use 40 significant digits. The final answer rounds
to two decimal places, with halfway values rounded away from zero.
The rounded result becomes `ans`.

Currency labels do not convert amounts. All supported currency labels use
two decimal places. Amounts and intermediate results are limited to
1 trillion in magnitude.

Rounded bill shares can leave a remainder. Automatic remainder allocation
is not implemented.

## Word problems

The interpreter uses local sentence patterns, not a general language model.
Choose an example and replace its quantities.

Supported patterns include purchases, addition, remaining money, bill splits,
percentages, discounts, increases, and the implemented truck-and-pallet pattern.

Unsupported or ambiguous wording should not be treated as a solved problem.
The interpreter does not generally handle arbitrary stories, algebraic unknowns,
unit conversions, or unrestricted multi-step problems.

## Finance assumptions

Loan calculations assume a fixed nominal annual interest rate and equal
monthly payments. Fees, insurance, taxes, balloon payments, and changing
rates are excluded.

Savings calculations assume monthly compounding and contributions at the
end of each month. Enter a nominal annual rate, not APY.
Fees, taxes, inflation, and investment risk are excluded.

Finance formulas use floating-point arithmetic. Totals use unrounded values;
displayed amounts round to two decimals. Actual schedules may differ.

Finance estimates are educational calculations, not financial advice.

## Known validation gaps

- Full accessibility compliance has not been established.
- Alternative color palettes are experimental.
- Final packaged regression testing remains pending.
- A GStreamer `appsink` warning was previously observed; resolution has not
  been documented.
- Only the reported local Linux behavior has been checked; generated icons
  for other platforms do not establish support for those platforms.

## Repository contents

Source code, tests, configuration, lockfiles, and application artwork are included.
Dependencies, local backups, build output, and installation packages are excluded.

No project license has been selected yet.
