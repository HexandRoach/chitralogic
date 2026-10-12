import { useState } from "react";
import { calculate } from "./calculator";
import type { CalculationStep } from "./calculator";
import { canAdvance, checkAnswer, generateExercise, practiceTopics } from "./practice";
import type { PracticeTopic } from "./practice";
import type { AnswerCheck } from "./practice";

function display(value: number): string {
  return Number(value.toPrecision(14)).toString();
}

type WorkedSolution = {
  steps: CalculationStep[];
  result: number | null;
  error: string;
};

export default function Practice() {
  const [topic, setTopic] = useState<PracticeTopic>("mixed");
  const [exercise, setExercise] = useState(() => generateExercise());
  const [completed, setCompleted] = useState(0);
  const [solved, setSolved] = useState(false);
  const [wrongAttempts, setWrongAttempts] = useState(0);
  const solutionUnlocked = wrongAttempts >= 3;
  const [answer, setAnswer] = useState("");
  const [feedback, setFeedback] = useState<AnswerCheck | null>(null);
  const [hintVisible, setHintVisible] = useState(false);
  const [solution, setSolution] = useState<WorkedSolution | null>(null);

  function nextExercise() {
    if (!canAdvance(solved)) return;
    setExercise(generateExercise(exercise.expression, Math.random, topic));
    setCompleted(value => value + 1);
    setSolved(false);
    setWrongAttempts(0);
    setAnswer("");
    setFeedback(null);
    setHintVisible(false);
    setSolution(null);
  }

  function changeTopic(next: PracticeTopic) {
    if (wrongAttempts > 0 && !solved) return;
    setTopic(next);
    setExercise(generateExercise(exercise.expression, Math.random, next));
    setSolved(false);
    setWrongAttempts(0);
    setAnswer("");
    setFeedback(null);
    setHintVisible(false);
    setSolution(null);
  }

  function revealSolution() {
    if (!solutionUnlocked) return;
    const steps: CalculationStep[] = [];
    try {
      // Practice uses its own angle mode and a separate ans value.
      const result = calculate(exercise.expression, exercise.degrees, 0, steps);
      setSolution({ steps, result, error: "" });
    } catch (failure) {
      setSolution({
        steps,
        result: null,
        error: failure instanceof Error ? failure.message : "Solution failed.",
      });
    }
  }

  return (
    <details className="panel practice-panel">
      <summary>Practice exercises</summary>
      <div className="practice-content">
        <label htmlFor="practice-topic">Practice topic</label>
        <select
          id="practice-topic"
          value={topic}
          disabled={wrongAttempts > 0 && !solved}
          aria-describedby="practice-topic-help"
          onChange={event => changeTopic(event.target.value as PracticeTopic)}
        >
          {practiceTopics.map(item => (
            <option key={item.id} value={item.id}>{item.label}</option>
          ))}
        </select>
        <p id="practice-topic-help" className="hint">
          Choose a topic before attempting a question.
          After an incorrect answer, solve the question before changing topics.
          Mixed practice draws from all eight topics.
        </p>
        <h2>Exercise {completed + 1}: {exercise.topic}</h2>
        <p className="hint">Completed this session: {completed}</p>
        <p>{exercise.prompt}</p>
        <p className="hint">
          Practice angle mode: {exercise.degrees ? "Degrees" : "Radians"}.
          {" "}This does not change the main calculator.
        </p>

        <form onSubmit={event => {
          event.preventDefault();
          if (solved) return;
          const checked = checkAnswer(answer, exercise.expected);
          if (checked.status === "incorrect") {
            setWrongAttempts(count => count + 1);
            setFeedback({
              status: "incorrect",
              message: "Not quite. Try again or use the hint.",
            });
          } else {
            setFeedback(checked);
          }
          if (checked.status === "correct") setSolved(true);
        }}>
          <label htmlFor="practice-answer">Your numerical answer</label>
          <input
            id="practice-answer"
            type="text"
            value={answer}
            autoComplete="off"
            spellCheck={false}
            readOnly={solved}
            aria-describedby="practice-answer-help"
            onChange={event => {
              setAnswer(event.target.value);
              setFeedback(null);
            }}
          />
          <p id="practice-answer-help" className="hint">
            Enter a number using a decimal point, not an expression.
            Approximate answers use a tolerance of
            {" "}0.000001 × max(1, |expected answer|).
          </p>
          <button type="submit" disabled={solved}>
            {solved ? "Answer accepted" : "Check answer"}
          </button>
        </form>

        <div className="practice-feedback" role="status" aria-live="polite">
          {feedback && <p>{feedback.message}</p>}
        </div>

        <div className="practice-actions">
          <button
            type="button"
            aria-expanded={hintVisible}
            aria-controls="practice-hint"
            onClick={() => setHintVisible(value => !value)}
          >
            {hintVisible ? "Hide hint" : "Show hint"}
          </button>
          <button
            type="button"
            disabled={!solutionUnlocked}
            aria-describedby="practice-solution-help"
            aria-expanded={solution !== null}
            aria-controls="practice-solution"
            onClick={() => solution ? setSolution(null) : revealSolution()}
          >
            {solution ? "Hide solution" : "Show solution"}
          </button>
          <button
            type="button"
            disabled={!canAdvance(solved)}
            aria-describedby="practice-progress-help"
            onClick={nextExercise}
          >
            Next exercise
          </button>
        </div>

        <p id="practice-solution-help" className="hint" role="status">
          {solutionUnlocked
            ? "Worked solution unlocked after three incorrect answers."
            : solved
              ? "Solved without unlocking the worked solution."
              : `Worked solution unlocks after three incorrect answers. ${wrongAttempts} of 3 so far.`}
        </p>

        <p id="practice-progress-help" className="hint">
          {solved
            ? "Exercise solved. You can move to the next exercise."
            : "Submit a correct answer to unlock the next exercise. Revealing the solution does not unlock it."}
        </p>

        <div id="practice-hint" hidden={!hintVisible}>
          <p>Hint: {exercise.hint}</p>
        </div>

        <div id="practice-solution" hidden={solution === null}>
          {solution && <>
            <h3>Worked solution</h3>
            <p className="worked-expression">{exercise.expression}</p>
            <ol className="step-list">
              {solution.steps.map((step, position) => (
                <li key={position}>
                  {step.description}<br />
                  <span>= {display(step.value)}</span>
                </li>
              ))}
            </ol>
            {solution.error
              ? <p>Solution stopped: {solution.error}</p>
              : solution.result !== null && <p>Answer: {display(solution.result)}</p>}
            <p className="hint">
              Steps come from the calculator engine. Displayed values may be rounded.
            </p>
          </>}
        </div>

        <p className="hint">
          Exercises are randomly generated from arithmetic templates.
          Progress is not saved. Exercises do not alter the main
          calculator input, history, or ans.
        </p>
      </div>
    </details>
  );
}
