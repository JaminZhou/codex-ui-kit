import { useCallback, useEffect, useRef, useState } from "react";
import {
  RemoteConnectionsPage,
  type RemoteConnection,
  type RemoteConnectionFormStatus,
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

/** Host-backed exploratory registry; it is not the installed Connections settings route. */
export function LiveRemoteConnections() {
  const [connections, setConnections] = useState<RemoteConnection[]>([]);
  const [status, setStatus] = useState<"error" | "loading" | "ready">("loading");
  const [formOpen, setFormOpen] = useState(false);
  const [formValue, setFormValue] = useState<RemoteConnectionFormValue>(emptyForm);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [formStatus, setFormStatus] = useState<RemoteConnectionFormStatus>("idle");
  const [operationBusy, setOperationBusy] = useState(false);
  const [action, setAction] = useState("");
  const operationBusyRef = useRef(false);

  const beginOperation = () => {
    if (operationBusyRef.current) return false;
    operationBusyRef.current = true;
    setOperationBusy(true);
    return true;
  };

  const endOperation = () => {
    operationBusyRef.current = false;
    setOperationBusy(false);
  };

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

  useEffect(() => {
    if (!window.codexDemo?.onLiveRemoteConnectionsChange) return;
    return window.codexDemo.onLiveRemoteConnectionsChange(() => {
      if (!operationBusyRef.current) void refresh();
    });
  }, [refresh]);

  const save = async () => {
    if (
      !window.codexDemo?.saveRemoteConnection ||
      !formValue.label.trim() ||
      !formValue.detail.trim() ||
      formStatus === "saving" ||
      !beginOperation()
    ) {
      return;
    }
    const isEditing = editingId !== null;
    setFormStatus("saving");
    setAction("Saving connection…");
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
      setFormStatus("idle");
      setAction(isEditing ? `Updated ${saved.label}` : `Saved ${saved.label}`);
      setStatus("ready");
    } catch {
      setFormStatus("error");
      setStatus("error");
      setAction("Connection could not be saved");
    } finally {
      endOperation();
    }
  };

  const test = async (connection: RemoteConnection) => {
    if (!window.codexDemo?.testRemoteConnection || !beginOperation()) return;
    setAction(`Testing ${connection.label}…`);
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
    } finally {
      endOperation();
    }
  };

  const forget = async (connection: RemoteConnection) => {
    if (!window.codexDemo?.forgetRemoteConnection || !beginOperation()) return;
    setAction(`Forgetting ${connection.label}…`);
    try {
      await window.codexDemo.forgetRemoteConnection({ id: connection.id });
      setConnections((current) => current.filter((candidate) => candidate.id !== connection.id));
      setAction(`Forgot ${connection.label}`);
      setStatus("ready");
    } catch {
      setStatus("error");
      setAction("Connection could not be forgotten");
    } finally {
      endOperation();
    }
  };

  return (
    <>
      <RemoteConnectionsPage
        connections={connections}
        data-surface-kind="exploratory-registry"
        disabled={operationBusy}
        description="Exploratory local registry, separate from Settings → Connections. The renderer receives labels and status, never credentials."
        errorMessage={action || "Connections could not be loaded."}
        formOpen={formOpen}
        formValue={formValue}
        formStatus={formStatus}
        formStatusMessage={formStatus === "error" ? action : undefined}
        formRetryLabel="Try again"
        onAdd={() => {
          setFormValue(emptyForm);
          setEditingId(null);
          setFormStatus("idle");
          setFormOpen(true);
          setAction("");
        }}
        onCancelForm={() => {
          setFormOpen(false);
          setEditingId(null);
          setFormValue(emptyForm);
          setFormStatus("idle");
          setAction("Form cancelled");
        }}
        onChangeForm={setFormValue}
        onEdit={(connection) => {
          setEditingId(connection.id);
          setFormValue({ detail: connection.detail, kind: connection.kind, label: connection.label });
          setFormStatus("idle");
          setFormOpen(true);
        }}
        onFormRetry={() => void save()}
        onForget={(connection) => void forget(connection)}
        onRetry={() => void refresh()}
        onSave={() => void save()}
        onTest={(connection) => void test(connection)}
        status={status}
        statusMessage={action || undefined}
        title="Remote connection registry"
      />
      <span aria-live="polite" className="demo-settings-action-status">{action}</span>
    </>
  );
}
