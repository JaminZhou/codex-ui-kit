import { useCallback, useEffect, useState } from "react";
import {
  RemoteConnectionsPage,
  type RemoteConnection,
  type RemoteConnectionFormValue,
} from "codex-ui-kit";
import type {
  LiveRemoteConnection,
  RemoteConnectionTestResult,
} from "../electron/live-remote-connections";

const emptyForm: RemoteConnectionFormValue = { detail: "", kind: "ssh", label: "" };

function toUiConnection(connection: LiveRemoteConnection): RemoteConnection {
  return {
    detail: connection.detail,
    id: connection.id,
    kind: connection.kind,
    label: connection.label,
    status: connection.status,
  };
}

/** Host-backed settings route. The renderer receives labels/status, never credentials. */
export function LiveRemoteConnections() {
  const [connections, setConnections] = useState<RemoteConnection[]>([]);
  const [status, setStatus] = useState<"error" | "loading" | "ready">("loading");
  const [formOpen, setFormOpen] = useState(false);
  const [formValue, setFormValue] = useState<RemoteConnectionFormValue>(emptyForm);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [action, setAction] = useState("");

  const refresh = useCallback(async () => {
    if (!window.codexDemo?.listRemoteConnections) {
      setStatus("error");
      setAction("Remote connections are unavailable in this host.");
      return;
    }
    setStatus("loading");
    try {
      const values = await window.codexDemo.listRemoteConnections();
      setConnections(values.map(toUiConnection));
      setStatus("ready");
    } catch {
      setStatus("error");
      setAction("Connection service unavailable");
    }
  }, []);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  const save = async () => {
    if (!window.codexDemo?.saveRemoteConnection || !formValue.label.trim() || !formValue.detail.trim()) return;
    const id = editingId ?? formValue.label.trim().toLocaleLowerCase().replace(/\s+/g, "-");
    try {
      const saved = await window.codexDemo.saveRemoteConnection({
        ...formValue,
        id,
        status: "disconnected",
      });
      setConnections((current) => [
        ...current.filter((connection) => connection.id !== saved.id),
        toUiConnection(saved),
      ]);
      setFormOpen(false);
      setEditingId(null);
      setFormValue(emptyForm);
      setAction(editingId ? `Updated ${saved.label}` : `Saved ${saved.label}`);
      setStatus("ready");
    } catch {
      setStatus("error");
      setAction("Connection could not be saved");
    }
  };

  const test = async (connection: RemoteConnection) => {
    if (!window.codexDemo?.testRemoteConnection) return;
    try {
      const result: RemoteConnectionTestResult = await window.codexDemo.testRemoteConnection({ id: connection.id });
      setConnections((current) =>
        current.map((candidate) =>
          candidate.id === result.id ? { ...candidate, status: result.status } : candidate,
        ),
      );
      setAction(result.message);
      setStatus("ready");
    } catch {
      setStatus("error");
      setAction("Connection test failed");
    }
  };

  const forget = async (connection: RemoteConnection) => {
    if (!window.codexDemo?.forgetRemoteConnection) return;
    try {
      await window.codexDemo.forgetRemoteConnection({ id: connection.id });
      setConnections((current) => current.filter((candidate) => candidate.id !== connection.id));
      setAction(`Forgot ${connection.label}`);
    } catch {
      setStatus("error");
      setAction("Connection could not be forgotten");
    }
  };

  return (
    <>
      <RemoteConnectionsPage
        connections={connections}
        errorMessage={action || "Connections could not be loaded."}
        formOpen={formOpen}
        formValue={formValue}
        onAdd={() => {
          setFormValue(emptyForm);
          setEditingId(null);
          setFormOpen(true);
          setAction("");
        }}
        onCancelForm={() => {
          setFormOpen(false);
          setEditingId(null);
          setFormValue(emptyForm);
          setAction("Form cancelled");
        }}
        onChangeForm={setFormValue}
        onEdit={(connection) => {
          setEditingId(connection.id);
          setFormValue({ detail: connection.detail, kind: connection.kind, label: connection.label });
          setFormOpen(true);
        }}
        onForget={(connection) => void forget(connection)}
        onRetry={() => void refresh()}
        onSave={() => void save()}
        onTest={(connection) => void test(connection)}
        status={status}
        statusMessage={action || undefined}
        title="Connections"
      />
      <span aria-live="polite" className="demo-settings-action-status">{action}</span>
    </>
  );
}
