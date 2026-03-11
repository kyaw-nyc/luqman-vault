const { createServer } = require("http");
const { parse } = require("url");
const next = require("next");

const dev = process.env.NODE_ENV !== "production";
const port = parseInt(process.env.PORT || "3000", 10);
const BACKEND_WS = process.env.BACKEND_WS_URL || "ws://127.0.0.1:3001";

const app = next({ dev, port });
const handle = app.getRequestHandler();

app.prepare().then(() => {
  const server = createServer((req, res) => {
    handle(req, res, parse(req.url || "", true));
  });

  try {
    const { WebSocketServer, WebSocket } = require("ws");
    const wss = new WebSocketServer({ noServer: true });

    server.on("upgrade", (req, socket, head) => {
      const { pathname } = parse(req.url || "");

      if (pathname === "/ws/terminal") {
        wss.handleUpgrade(req, socket, head, (clientWs) => {
          const backendWs = new WebSocket(`${BACKEND_WS}/ws/terminal`, {
            handshakeTimeout: 5000,
          });

          backendWs.on("open", () => {
            clientWs.on("message", (data, isBinary) => {
              if (backendWs.readyState === WebSocket.OPEN) {
                backendWs.send(data, { binary: isBinary });
              }
            });

            backendWs.on("message", (data, isBinary) => {
              if (clientWs.readyState === WebSocket.OPEN) {
                clientWs.send(data, { binary: isBinary });
              }
            });
          });

          backendWs.on("close", (code, reason) => {
            const c = code || 1006;
            const r = reason?.toString() || "";
            if (clientWs.readyState <= WebSocket.OPEN) {
              clientWs.close(c >= 4000 ? c : 1000, r);
            }
          });

          backendWs.on("error", (err) => {
            console.error("[ws-proxy] backend error:", err.message);
            if (clientWs.readyState <= WebSocket.OPEN) {
              clientWs.close(4002, "Backend connection failed");
            }
          });

          clientWs.on("close", () => {
            if (backendWs.readyState <= WebSocket.OPEN) backendWs.close();
          });

          clientWs.on("error", () => {
            if (backendWs.readyState <= WebSocket.OPEN) backendWs.close();
          });
        });
      }
    });

    console.log("> Terminal WebSocket proxy enabled at /ws/terminal");
  } catch {
    console.warn("> ws package not found — terminal disabled");
  }

  server.listen(port, "0.0.0.0", () => {
    console.log(`> Ready on http://0.0.0.0:${port} (${dev ? "dev" : "production"})`);
  });
});
