import { useEffect, useRef, useState } from "react";
import { AppSidebarItem, Button, Dialog } from "codex-ui-kit";
import type { LiveModelCapability } from "../electron/live-model-catalog";

export function LiveModelCatalog({ projectToken }: { projectToken?: string }) {
  const [open, setOpen] = useState(false);
  const [rows, setRows] = useState<LiveModelCapability[] | null>(null);
  const [loading, setLoading] = useState(false);
  const [failed, setFailed] = useState(false);
  const generation = useRef(0);
  const trigger = useRef<HTMLButtonElement | null>(null);
  const close = () => { generation.current += 1; setOpen(false); setRows(null); setLoading(false); setFailed(false); };
  useEffect(() => { close(); return () => { generation.current += 1; }; }, [projectToken]);
  const refresh = async () => {
    const epoch = ++generation.current;
    setRows(null); setFailed(false);
    if (!projectToken || !window.codexDemo) { setLoading(false); setFailed(true); return; }
    setLoading(true);
    try {
      const result = await window.codexDemo.listLiveModels({ projectToken });
      if (epoch === generation.current) setRows(result);
    } catch {
      if (epoch === generation.current) setFailed(true);
    } finally {
      if (epoch === generation.current) setLoading(false);
    }
  };
  return <>
    <AppSidebarItem disabled={!projectToken} onClick={event => { trigger.current = event.currentTarget; setOpen(true); void refresh(); }}>Runtime model capabilities</AppSidebarItem>
    <Dialog open={open} title="Runtime model capabilities" size="wide" returnFocusRef={trigger} onOpenChange={value => { if (!value) close(); }}
      footer={<><Button disabled={loading} onClick={() => void refresh()}>Refresh models</Button><Button onClick={close}>Close</Button></>}>
      <p>Read-only App Server catalog. This dialog does not select a model or start a task. This is not the installed Codex picker or proof of account access.</p>
      {loading && <p role="status">Reading model capabilities…</p>}
      {failed && <p role="alert">Couldn’t read the complete model catalog. Refresh to retry.</p>}
      {rows && (rows.length ? <ul aria-label="Runtime models" style={{ overflowWrap: "anywhere" }}>{rows.map(row => <li key={row.id}>
        <strong>{row.displayName}</strong> <code>{row.model}</code>{row.isDefault && <span> — catalog default</span>}
        <p>{row.description}</p>
        <p>Default effort: {row.defaultReasoningEffort}</p>
        <ul aria-label={`${row.displayName} reasoning efforts`}>{row.supportedReasoningEfforts.map(option => <li key={option.reasoningEffort}>{option.reasoningEffort}: {option.description}</li>)}</ul>
      </li>)}</ul> : <p>No visible models returned by this runtime.</p>)}
    </Dialog>
  </>;
}
