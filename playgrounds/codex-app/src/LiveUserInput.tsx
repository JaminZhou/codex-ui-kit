import { useId, useState } from "react";
import type { PendingUserInput } from "./live-input-state";
import "./live-user-input.css";

export function LiveUserInput({ request, onSubmit }: {
  request: PendingUserInput;
  onSubmit: (answers: Record<string, string[]>) => Promise<void>;
}) {
  const prefix = useId();
  const [values, setValues] = useState<Record<string, string>>({});
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const complete = request.questions.every(({ id }) => Object.hasOwn(values, id) && values[id].trim());
  return <form className="live-user-input" aria-label="Questions from Codex" onSubmit={(event) => {
    event.preventDefault();
    if (!complete || busy) return;
    setBusy(true);
    setError("");
    const answers = Object.fromEntries(request.questions.map(({ id }) => [id, [values[id]]]));
    void onSubmit(answers).then(() => setValues({})).catch(() => {
      // Never render host error payloads that could echo sensitive answers.
      setError("Could not send answers. The request may have ended; try again if it is still open.");
    }).finally(() => setBusy(false));
  }}>
    <h3>{request.isBlocking ? "Codex needs your input" : "Question from Codex"}</h3>
    {request.questions.map((question, index) => {
      const id = `${prefix}-${index}`;
      const freeText = question.isSecret || !question.options?.length || question.isOther;
      return <fieldset key={question.id} disabled={busy}>
        <legend>{question.header}</legend>
        <p id={`${id}-prompt`}>{question.question}</p>
        {!question.isSecret && question.options?.map((option, optionIndex) => <label className="live-user-input-option" key={optionIndex}>
          <input type="radio" name={id} checked={values[question.id] === option.label} onChange={() => setValues((current) => ({ ...current, [question.id]: option.label }))} />
          <span>{option.label}<small>{option.description}</small></span>
        </label>)}
        {freeText && <label className="live-user-input-text">
          {question.isSecret ? "Sensitive answer" : question.options?.length ? "Or enter your own answer" : "Your answer"}
          <input type={question.isSecret ? "password" : "text"} autoComplete="off" spellCheck={!question.isSecret}
            aria-describedby={`${id}-prompt`} value={Object.hasOwn(values, question.id) ? values[question.id] : ""}
            onChange={(event) => setValues((current) => ({ ...current, [question.id]: event.target.value }))} />
        </label>}
      </fieldset>;
    })}
    {error && <p role="alert">{error}</p>}
    <button type="submit" disabled={!complete || busy}>{busy ? "Sending answers…" : "Send answers"}</button>
  </form>;
}
