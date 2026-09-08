import { useEffect, useRef, useState } from "react";
import { AppSidebarItem } from "codex-ui-kit";

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
      status={runningIds.includes(row.id) ? "running" : "idle"}
      statusLabel={runningIds.includes(row.id) ? "Chat is running" : undefined}
      aria-pressed={selectedId === row.id} className="demo-live-thread-row"
      onClick={() => onSelect(row.id)}>{row.title || "Untitled chat"}</AppSidebarItem>)}
    {loading && <p role="status">Loading chats…</p>}
    {error && <p role="alert">Couldn’t load chats.</p>}
    {!loading && !error && rows.length === 0 && <p>{projectToken ? "No chats in this project yet." : "Select a local project."}</p>}
    <AppSidebarItem disabled={loading || !projectToken} onClick={() => void load()}>{error ? "Retry chats" : "Refresh chats"}</AppSidebarItem>
    {cursor && <AppSidebarItem disabled={loading} onClick={() => void load(true)}>Load more chats</AppSidebarItem>}
  </div>;
}
