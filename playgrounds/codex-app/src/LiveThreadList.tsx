import { useEffect, useRef, useState } from "react";
import { AppSidebarItem, Button, Dialog } from "codex-ui-kit";
import { CurrentBuildIcon } from "./currentBuildIcons";

type ThreadRow = { id: string; title: string; updatedAt: number };
export function LiveThreadList({ projectToken, selectedId, refreshKey, busy, runningIds, onSelect, onArchived }: {
  projectToken?: string;
  selectedId: string | null;
  refreshKey: string;
  busy: boolean;
  runningIds: string[];
  onSelect(id: string): void;
  onArchived(ids: string[]): void;
}) {
  const [rows, setRows] = useState<ThreadRow[]>([]);
  const [cursor, setCursor] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(false);
  const generation = useRef(0);
  const observedArchives = useRef(new Set<string>());
  const [editing, setEditing] = useState<ThreadRow | null>(null);
  const [name, setName] = useState("");
  const [saving, setSaving] = useState(false);
  const [renameError, setRenameError] = useState(false);
  const mutationGeneration = useRef(0);
  const renameTrigger = useRef<HTMLButtonElement | null>(null);
  const [showArchived, setShowArchived] = useState(false);
  const [archiveTarget, setArchiveTarget] = useState<ThreadRow | null>(null);
  const [archiveError, setArchiveError] = useState(false);
  const archiveTrigger = useRef<HTMLButtonElement | null>(null);
  const changeArchive = async () => {
    if (!archiveTarget || !projectToken || !window.codexDemo || saving) return;
    const epoch = mutationGeneration.current;
    setSaving(true);
    setArchiveError(false);
    try {
      const result = await window.codexDemo.setLiveThreadArchived({ projectToken, threadId: archiveTarget.id, archived: !showArchived });
      if (epoch !== mutationGeneration.current) return;
      if (result.archived) onArchived(result.changedThreadIds);
      setArchiveTarget(null);
      void load();
    } catch {
      if (epoch === mutationGeneration.current) setArchiveError(true);
    } finally {
      if (epoch === mutationGeneration.current) setSaving(false);
    }
  };
  useEffect(() => {
    setEditing(null);
    setSaving(false);
    setRenameError(false);
    setArchiveTarget(null);
    setArchiveError(false);
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
      const page = await window.codexDemo.listLiveThreads({ projectToken, archived: showArchived, ...(append && cursor ? { cursor } : {}) });
      if (id !== generation.current) return;
      const archived = new Set(page.archivedThreadIds ?? []);
      const newlyArchived = [...archived].filter(threadId => !observedArchives.current.has(threadId));
      observedArchives.current = archived;
      if (newlyArchived.length) onArchived(newlyArchived);
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
  }, [projectToken, refreshKey, showArchived]);
  useEffect(() => { observedArchives.current = new Set(); }, [projectToken]);
  const [focusRequest, setFocusRequest] = useState(0);
  const handledFocus = useRef(0);
  useEffect(() => {
    const refresh = () => setFocusRequest(value => value + 1);
    window.addEventListener("focus", refresh);
    return () => window.removeEventListener("focus", refresh);
  }, []);
  useEffect(() => {
    // Coalesce focus events; defer refresh until pagination or an open editor
    // settles instead of discarding a user's draft or losing the refresh.
    if (focusRequest === handledFocus.current || saving || editing || archiveTarget || loading) return;
    handledFocus.current = focusRequest;
    void load();
  }, [focusRequest, saving, editing, archiveTarget, loading]);
  return <div aria-label="Live conversations" aria-busy={loading || busy}>
    {rows.map(row => <AppSidebarItem key={row.id} disabled={busy || showArchived}
      actions={<>{!showArchived && <button type="button" aria-label={`Rename ${row.title || "Untitled chat"}`}
        disabled={busy || loading || saving || runningIds.includes(row.id)}
        onClick={event => { renameTrigger.current = event.currentTarget; setEditing(row); setName(row.title); setRenameError(false); }}><CurrentBuildIcon name="sidebar-project-menu-edit" /></button>}
        <button type="button" aria-label={`${showArchived ? "Restore" : "Archive"} ${row.title || "Untitled chat"}`}
          disabled={busy || loading || saving || runningIds.length > 0}
          onClick={event => { archiveTrigger.current = event.currentTarget; setArchiveTarget(row); setArchiveError(false); }}>
          <CurrentBuildIcon name="sidebar-archive" />
        </button></>}
      status={runningIds.includes(row.id) ? "running" : "idle"}
      statusLabel={runningIds.includes(row.id) ? "Chat is running" : undefined}
      aria-pressed={selectedId === row.id} className="demo-live-thread-row"
      onClick={() => onSelect(row.id)}>{row.title || "Untitled chat"}</AppSidebarItem>)}
    {loading && <p role="status">Loading chats…</p>}
    {error && <p role="alert">Couldn’t load chats.</p>}
    {!loading && !error && rows.length === 0 && <p>{projectToken ? (showArchived ? "No archived chats in this project." : "No chats in this project yet.") : "Select a local project."}</p>}
    <AppSidebarItem disabled={saving || !projectToken} onClick={() => setShowArchived(value => !value)}>{showArchived ? "Show active chats" : "Show archived chats"}</AppSidebarItem>
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
    <Dialog open={archiveTarget !== null} title={showArchived ? "Restore chat" : "Archive chat"} size="compact"
      returnFocusRef={archiveTrigger} closeDisabled={saving} closeOnEscape={!saving} closeOnBackdrop={!saving}
      footer={<>
        <Button disabled={saving} onClick={() => setArchiveTarget(null)}>Cancel</Button>
        <Button tone="primary" disabled={saving || runningIds.length > 0} onClick={() => void changeArchive()}>
          {saving ? "Saving…" : showArchived ? "Confirm restore" : "Confirm archive"}
        </Button>
      </>}
      onOpenChange={open => { if (!open && !saving) setArchiveTarget(null); }}>
      <p>{archiveTarget?.title}</p>
      <p>{showArchived ? "Restore this chat only. Archived child chats are not restored automatically."
        : "Archive this chat and its spawned child chats. This does not permanently delete them."}</p>
      {archiveError && <p role="alert">Couldn’t update chat archive. Try again.</p>}
    </Dialog>
  </div>;
}
