import { useMemo, useState } from "react";
import type { PendingMcpElicitation } from "./live-mcp-elicitation-state";
import "./live-mcp-elicitation.css";

type Props = {
  request: PendingMcpElicitation;
  onSubmit: (action: "accept" | "decline" | "cancel", content?: Record<string, unknown>) => Promise<void>;
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

export function LiveMcpElicitation({ request, onSubmit }: Props) {
  const properties = useMemo(() => record(request.requestedSchema?.properties), [request.requestedSchema]);
  const required = useMemo(() => new Set(
    Array.isArray(request.requestedSchema?.required)
      ? request.requestedSchema.required.filter((value): value is string => typeof value === "string")
      : [],
  ), [request.requestedSchema]);
  const [values, setValues] = useState<Record<string, unknown>>(() => {
    const initial: Record<string, unknown> = {};
    for (const [name, raw] of Object.entries(properties)) {
      const schema = record(raw);
      if (schema.default !== undefined && schema.default !== null) initial[name] = schema.default;
    }
    return initial;
  });
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const valid = request.mode === "url" || [...required].every((name) => {
    const value = values[name];
    return value !== undefined && value !== null && (typeof value !== "string" || value.trim().length > 0);
  });
  const submit = (action: "accept" | "decline" | "cancel") => {
    if (busy || (action === "accept" && !valid)) return;
    setBusy(true);
    setError("");
    void onSubmit(action, action === "accept" && request.mode !== "url" ? values : undefined)
      .catch(() => setError("Could not answer the MCP request. It may have already ended."))
      .finally(() => setBusy(false));
  };
  return <form className="live-mcp-elicitation" aria-label="MCP server request" onSubmit={(event) => { event.preventDefault(); submit("accept"); }}>
    <header>
      <div>
        <strong>MCP server request</strong>
        <span>{request.serverName}</span>
      </div>
      <span className="live-mcp-elicitation__mode">{request.mode === "url" ? "Open externally" : "Input required"}</span>
    </header>
    <p>{request.message}</p>
    {request.mode === "url" ? <>
      <p className="live-mcp-elicitation__url" title={request.url}>{request.url}</p>
      <a href={request.url} target="_blank" rel="noreferrer">Open authorization URL</a>
    </> : <div className="live-mcp-elicitation__fields">
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
      <button type="button" disabled={busy} onClick={() => submit("cancel")}>Cancel</button>
      <button type="button" disabled={busy} onClick={() => submit("decline")}>Decline</button>
      <button type="submit" disabled={busy || !valid}>{busy ? "Sending…" : "Accept"}</button>
    </footer>
  </form>;
}
