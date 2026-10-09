import { useEffect, useRef, useState } from "react";
import { AppSidebarItem, Button, Dialog } from "codex-ui-kit";
import type { LiveModelCapability, LiveModelSelection as Selection } from "../electron/live-model-catalog";
export type LiveModelSelection = Selection;

/** Own runtime controls, not a reconstruction of the installed Power picker. */
export function LiveModelSelectionControl({ projectToken, selection, disabled, onChange }: {
  projectToken?: string;
  selection?: Selection;
  disabled?: boolean;
  onChange: (selection?: Selection) => void;
}) {
  const [rows, setRows] = useState<LiveModelCapability[]>([]);
  const [open, setOpen] = useState(false);
  const trigger = useRef<HTMLButtonElement | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const generation = useRef(0);
  const current = useRef({ selection, onChange });
  current.current = { selection, onChange };
  const close = () => { generation.current += 1; setOpen(false); setRows([]); setLoading(false); setError(null); };
  const refresh = async () => {
    const epoch = ++generation.current;
    setLoading(true); setRows([]); setError(null);
    try {
      if (!projectToken || !window.codexDemo) throw new Error("Select an Electron local project first.");
      const catalog = await window.codexDemo.listLiveModels({ projectToken });
      if (generation.current !== epoch) return;
      setRows(catalog);
      const pending = current.current.selection;
      if (pending && !catalog.some(row => row.id === pending.modelId && row.supportedReasoningEfforts.some(option => option.reasoningEffort === pending.effort))) {
        current.current.onChange(undefined);
        setError("The pending model selection is no longer supported. Choose again before sending.");
      }
    } catch {
      if (generation.current === epoch) {
        current.current.onChange(undefined);
        setError("Couldn’t read model choices. Refresh before selecting; existing thread settings are unchanged.");
      }
    } finally { if (generation.current === epoch) setLoading(false); }
  };
  useEffect(() => {
    close();
    current.current.onChange(undefined);
    return () => { generation.current += 1; };
  }, [projectToken]);
  const model = rows.find(row => row.id === selection?.modelId);
  return <>
    <AppSidebarItem aria-label="Choose live model" disabled={disabled || !projectToken} onClick={event => { trigger.current = event.currentTarget; setOpen(true); void refresh(); }}>Choose live model</AppSidebarItem>
    <Dialog open={open} title="Next live turn model" returnFocusRef={trigger} onOpenChange={value => { if (!value) close(); }}
      footer={<><Button disabled={loading || disabled} onClick={() => void refresh()}>Refresh model choices</Button><Button onClick={close}>Close model choices</Button></>}>
    <fieldset disabled={disabled || loading || !projectToken} aria-label="Live model and reasoning selection" style={{ minWidth: 0, border: 0, padding: 0 }}>
    <legend>Next live turn</legend>
    <p>Pending choices apply only when you send. Without a choice, configured overrides and saved thread settings apply. Runtime catalog is not proof of account access.</p>
    {loading && <p role="status">Reading model choices…</p>}
    {error && <p role="alert">{error}</p>}
    <label style={{ display: "grid", gap: 8 }}>Runtime model<select aria-label="Runtime model" value={model?.id ?? ""} onChange={event => {
      setError(null);
      const row = rows.find(row => row.id === event.target.value);
      if (!row) { onChange(undefined); return; }
      if (!row.supportedReasoningEfforts.some(option => option.reasoningEffort === row.defaultReasoningEffort)) {
        setError("This runtime returned an unsupported default effort. Refresh before selecting."); return;
      }
      onChange({ modelId: row.id, effort: row.defaultReasoningEffort });
    }} style={{ maxWidth: "100%" }}>
      <option value="">No explicit model override</option>
      {rows.map(row => <option key={row.id} value={row.id} disabled={!row.supportedReasoningEfforts.length}>{row.displayName}</option>)}
    </select></label>
    <label style={{ display: "grid", gap: 8, marginTop: 12 }}>Runtime reasoning effort<select aria-label="Runtime reasoning effort" disabled={!model} value={selection?.effort ?? ""} onChange={event => {
      const option = model?.supportedReasoningEfforts.find(option => option.reasoningEffort === event.target.value);
      if (model && option) onChange({ modelId: model.id, effort: option.reasoningEffort });
    }}>
      {!model && <option value="">No explicit effort override</option>}
      {model?.supportedReasoningEfforts.map(option => <option key={option.reasoningEffort} value={option.reasoningEffort}>{option.reasoningEffort}</option>)}
    </select></label>
    </fieldset>
    </Dialog>
  </>;
}
