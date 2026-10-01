import { useMemo, useState } from "react";
import type { PendingMcpElicitation } from "./live-mcp-elicitation-state";
import "./live-mcp-elicitation.css";

type Props = {
  request: PendingMcpElicitation;
  verificationAvailable: boolean;
  onSubmit: (action: "accept" | "decline" | "cancel" | "verify", content?: Record<string, unknown>) => Promise<void>;
};

type Schema = Record<string, unknown>;

function record(value: unknown): Schema {
  return typeof value === "object" && value !== null && !Array.isArray(value)
    ? value as Schema
    : {};
}

function choices(schema: Schema): string[] {
  if (Array.isArray(schema.enum)) return schema.enum.filter((value): value is string => typeof value === "string");
  if (Array.isArray(schema.oneOf)) return schema.oneOf.flatMap((value) => {
    const item = record(value);
    return typeof item.const === "string" ? [item.const] : [];
  });
  return [];
}

export function LiveMcpElicitation({ request, verificationAvailable, onSubmit }: Props) {
  const requestedSchema = "requestedSchema" in request ? request.requestedSchema : undefined;
  const properties = useMemo(() => record(requestedSchema?.properties), [requestedSchema]);
  const required = useMemo(() => new Set(
    Array.isArray(requestedSchema?.required)
      ? requestedSchema.required.filter((value): value is string => typeof value === "string")
      : [],
  ), [requestedSchema]);
  const [values, setValues] = useState<Record<string, unknown>>(() => {
    const initial: Record<string, unknown> = {};
    for (const [name, raw] of Object.entries(properties)) {
      const schema = record(raw);
      if (schema.default !== undefined && schema.default !== null) initial[name] = schema.default;
    }
    return initial;
  });
  const [busyAction, setBusyAction] = useState<"accept" | "decline" | "cancel" | "verify" | null>(null);
  const [error, setError] = useState("");
  const valid = request.mode === "url" || request.mode === "openai/userVerification" || [...required].every((name) => {
    const value = values[name];
    return value !== undefined && value !== null && (typeof value !== "string" || value.trim().length > 0);
  });
  const submit = (action: "accept" | "decline" | "cancel" | "verify") => {
    const canInterruptVerification = busyAction === "verify" && (action === "cancel" || action === "decline");
    if ((busyAction !== null && !canInterruptVerification) || (action === "accept" && !valid)) return;
    if (action === "verify" && (request.mode !== "openai/userVerification" || !verificationAvailable)) return;
    setBusyAction(action);
    setError("");
    void onSubmit(
      action,
      action === "accept" && request.mode !== "url" && request.mode !== "openai/userVerification"
        ? values
        : undefined,
    )
      .catch(() => setError(
        action === "verify"
          ? "Device verification failed or is unavailable. You can retry, decline, or cancel."
          : "Could not answer the MCP request. It may have already ended.",
      ))
      .finally(() => setBusyAction(null));
  };
  return <form className="live-mcp-elicitation" aria-label="MCP server request" data-mode={request.mode} onSubmit={(event) => { event.preventDefault(); submit(request.mode === "openai/userVerification" ? "verify" : "accept"); }}>
    <header>
      <div>
        <strong>MCP server request</strong>
        <span>{request.serverName}</span>
      </div>
      <span className="live-mcp-elicitation__mode">
        {request.mode === "url" ? "Open externally" : request.mode === "openai/userVerification" ? "Device verification" : "Input required"}
      </span>
    </header>
    {request.mode === "openai/userVerification" ? <>
      <p className="live-mcp-elicitation__verification-title">{request.title}</p>
      <p>{request.description}</p>
      <p className="live-mcp-elicitation__verification-note">
        {verificationAvailable
          ? "Approving will ask the local Codex app-server to verify this request with your enrolled device credential."
          : "Device verification is available only for a live Codex session."}
      </p>
    </> : <p>{request.message}</p>}
    {request.mode === "url" ? <>
      <p className="live-mcp-elicitation__url" title={request.url}>{request.url}</p>
      <a href={request.url} target="_blank" rel="noreferrer">Open authorization URL</a>
    </> : request.mode !== "openai/userVerification" && <div className="live-mcp-elicitation__fields">
      {Object.entries(properties).map(([name, raw]) => {
        const schema = record(raw);
        const label = typeof schema.title === "string" ? schema.title : name;
        const kind = schema.type;
        const options = choices(schema);
        if (kind === "boolean") return <label key={name} className="live-mcp-elicitation__check"><input type="checkbox" checked={values[name] === true} onChange={(event) => setValues((current) => ({ ...current, [name]: event.target.checked }))} />{label}{required.has(name) ? " *" : ""}</label>;
        if (options.length > 0) return <label key={name}>{label}{required.has(name) ? " *" : ""}<select value={typeof values[name] === "string" ? values[name] as string : ""} onChange={(event) => setValues((current) => ({ ...current, [name]: event.target.value }))}><option value="">Select…</option>{options.map((option) => <option key={option} value={option}>{option}</option>)}</select></label>;
        return <label key={name}>{label}{required.has(name) ? " *" : ""}<input type={schema.format === "email" ? "email" : "text"} value={typeof values[name] === "string" ? values[name] as string : ""} onChange={(event) => setValues((current) => ({ ...current, [name]: event.target.value }))} /></label>;
      })}
    </div>}
    {error && <p role="alert">{error}</p>}
    <footer>
      <button type="button" disabled={busyAction !== null && busyAction !== "verify"} onClick={() => submit("cancel")}>Cancel</button>
      <button type="button" disabled={busyAction !== null && busyAction !== "verify"} onClick={() => submit("decline")}>Decline</button>
      <button
        type="submit"
        disabled={busyAction !== null || !valid || (request.mode === "openai/userVerification" && !verificationAvailable)}
      >
        {busyAction ? busyAction === "verify" ? "Verifying…" : "Sending…" : request.mode === "openai/userVerification" ? "Verify and approve" : "Accept"}
      </button>
    </footer>
  </form>;
}
