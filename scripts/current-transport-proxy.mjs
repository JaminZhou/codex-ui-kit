import http from "node:http";
import net from "node:net";

const port = Number(process.env.CODEX_CURRENT_TRANSPORT_PROXY_PORT);
const allowDrop =
  process.env.CODEX_CURRENT_TRANSPORT_PROXY_ALLOW_DROP === "1";

if (!Number.isInteger(port) || port < 1024 || port > 65535) {
  throw new Error("Set a valid isolated transport-proxy port.");
}
if (!allowDrop) {
  throw new Error(
    "Set CODEX_CURRENT_TRANSPORT_PROXY_ALLOW_DROP=1 to authorize controlled connection drops for an isolated app process.",
  );
}

let acceptingConnections = true;
let nextTunnelId = 1;
const tunnels = new Map();

const emit = (value) => {
  process.stdout.write(`${JSON.stringify(value)}\n`);
};

const closeTunnel = (id) => {
  if (!tunnels.delete(id)) return;
  emit({ activeTunnelCount: tunnels.size, event: "tunnel-closed", id });
};

const server = http.createServer((_request, response) => {
  response.writeHead(502, { "content-type": "text/plain" });
  response.end("CONNECT only\n");
});

server.on("connect", (request, clientSocket, head) => {
  if (!acceptingConnections) {
    clientSocket.write("HTTP/1.1 503 Service Unavailable\r\n\r\n");
    clientSocket.destroy();
    return;
  }

  const authority = request.url ?? "";
  const separator = authority.lastIndexOf(":");
  const host = separator > 0 ? authority.slice(0, separator) : authority;
  const destinationPort =
    separator > 0 ? Number(authority.slice(separator + 1)) : 443;
  if (
    host.length === 0 ||
    !Number.isInteger(destinationPort) ||
    destinationPort !== 443
  ) {
    clientSocket.write("HTTP/1.1 400 Bad Request\r\n\r\n");
    clientSocket.destroy();
    return;
  }

  const id = nextTunnelId++;
  const upstreamSocket = net.connect(destinationPort, host, () => {
    clientSocket.write("HTTP/1.1 200 Connection Established\r\n\r\n");
    if (head.length > 0) upstreamSocket.write(head);
    clientSocket.pipe(upstreamSocket);
    upstreamSocket.pipe(clientSocket);
    tunnels.set(id, { clientSocket, upstreamSocket });
    emit({
      activeTunnelCount: tunnels.size,
      event: "tunnel-opened",
      host,
      id,
      port: destinationPort,
    });
  });

  const close = () => closeTunnel(id);
  clientSocket.on("close", close);
  upstreamSocket.on("close", close);
  clientSocket.on("error", () => upstreamSocket.destroy());
  upstreamSocket.on("error", (error) => {
    emit({ code: error.code ?? null, event: "upstream-error", id });
    clientSocket.destroy();
  });
});

const dropTunnels = () => {
  const ids = [...tunnels.keys()];
  acceptingConnections = false;
  for (const { clientSocket, upstreamSocket } of tunnels.values()) {
    clientSocket.destroy();
    upstreamSocket.destroy();
  }
  emit({ event: "offline", ids });
};

const restoreTunnels = () => {
  acceptingConnections = true;
  emit({ event: "online" });
};

const shutdown = () => {
  acceptingConnections = false;
  for (const { clientSocket, upstreamSocket } of tunnels.values()) {
    clientSocket.destroy();
    upstreamSocket.destroy();
  }
  server.close(() => process.exit(0));
};

process.on("SIGUSR1", dropTunnels);
process.on("SIGUSR2", restoreTunnels);
process.on("SIGINT", shutdown);
process.on("SIGTERM", shutdown);

server.listen(port, "127.0.0.1", () => {
  emit({ event: "ready", pid: process.pid, port });
});
