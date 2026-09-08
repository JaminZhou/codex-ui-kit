import { useEffect, useRef, useState } from "react";
import { AppSidebarItem, Dialog } from "codex-ui-kit";
import { CurrentBuildIcon } from "./currentBuildIcons";

type ThreadRow = { id: string; title: string; updatedAt: number };
export function LiveThreadList({ projectToken, selectedId, refreshKey, busy, runningIds, onSelect }: {
  projectToken?: string;
  selectedId: string | null;
  refreshKey: string;
  busy: boolean;
  runningIds: string[];
  onSelect(id: string): void;
}) {
  const [rows, setRows] = useState<ThreadRow[]>([]);
  const [cursor, setCursor] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(false);
  const generation = useRef(0);
  const [editing, setEditing] = useState<ThreadRow | null>(null);
  const [name, setName] = useState("");
  const [saving, setSaving] = useState(false);
  const [renameError, setRenameError] = useState(false);
  const mutationGeneration = useRef(0);
  const renameTrigger = useRef<HTMLButtonElement | null>(null);
  useEffect(() => {
    setEditing(null);
    setSaving(false);
    setRenameError(false);
    return () => { mutationGeneration.current += 1; };
  }, [projectToken]);
  const saveName = async () => {
    if (!editing || !projectToken || !window.codexDemo || saving || !name.trim() || name.trim().length > 200) return;
    const epoch = mutationGeneration.current;
    setSaving(true);
    setRenameError(false);
    try {
      const result = await window.codexDemo.renameLiveThread({ projectToken, threadId: editing.id, name });
      if (epoch !== mutationGeneration.current) return;
      setRows(rows => rows.map(row => row.id === result.threadId ? { ...row, title: result.title } : row));
      setEditing(null);
      void load();
    } catch {
      if (epoch === mutationGeneration.current) setRenameError(true);
    } finally {
      if (epoch === mutationGeneration.current) setSaving(false);
    }
  };
  const load = async (append = false) => {
    const id = ++generation.current;
    if (!projectToken || !window.codexDemo) { setRows([]); setCursor(null); setLoading(false); setError(false); return; }
    setLoading(true);
    setError(false);
    try {
      const page = await window.codexDemo.listLiveThreads({ projectToken, ...(append && cursor ? { cursor } : {}) });
      if (id !== generation.current) return;
      setRows(previous => append ? [...previous, ...page.threads.filter(row => !previous.some(old => old.id === row.id))] : page.threads);
      setCursor(page.nextCursor);
    } catch {
      if (id === generation.current) setError(true);
    } finally {
      if (id === generation.current) setLoading(false);
    }
  };
  useEffect(() => {
    setRows([]);
    setCursor(null);
    void load();
    return () => { generation.current += 1; };
  }, [projectToken, refreshKey]);
  return <div aria-label="Live conversations" aria-busy={loading || busy}>
    {rows.map(row => <AppSidebarItem key={row.id} disabled={busy}
      actions={<button type="button" aria-label={`Rename ${row.title || "Untitled chat"}`}
        disabled={busy || loading || saving || runningIds.includes(row.id)}
        onClick={event => { renameTrigger.current = event.currentTarget; setEditing(row); setName(row.title); setRenameError(false); }}><CurrentBuildIcon name="sidebar-project-menu-edit" /></button>}
      status={runningIds.includes(row.id) ? "running" : "idle"}
      statusLabel={runningIds.includes(row.id) ? "Chat is running" : undefined}
      aria-pressed={selectedId === row.id} className="demo-live-thread-row"
      onClick={() => onSelect(row.id)}>{row.title || "Untitled chat"}</AppSidebarItem>)}
    {loading && <p role="status">Loading chats…</p>}
    {error && <p role="alert">Couldn’t load chats.</p>}
    {!loading && !error && rows.length === 0 && <p>{projectToken ? "No chats in this project yet." : "Select a local project."}</p>}
    <AppSidebarItem disabled={loading || !projectToken} onClick={() => void load()}>{error ? "Retry chats" : "Refresh chats"}</AppSidebarItem>
    {cursor && <AppSidebarItem disabled={loading} onClick={() => void load(true)}>Load more chats</AppSidebarItem>}
    <Dialog open={editing !== null} title="Rename chat" size="compact" returnFocusRef={renameTrigger}
      initialFocusSelector="input" closeDisabled={saving} closeOnEscape={!saving} closeOnBackdrop={!saving}
      onOpenChange={open => { if (!open && !saving) setEditing(null); }}>
      <form onSubmit={event => { event.preventDefault(); void saveName(); }}>
        <label>Chat name<input aria-label="Chat name" value={name} maxLength={200} disabled={saving}
          onChange={event => setName(event.target.value)} /></label>
        {renameError && <p role="alert">Couldn’t rename chat. Try again.</p>}
        <button type="button" disabled={saving} onClick={() => setEditing(null)}>Cancel</button>
        <button type="submit" disabled={saving || !name.trim()}>{saving ? "Saving…" : "Save name"}</button>
      </form>
    </Dialog>
  </div>;
}
