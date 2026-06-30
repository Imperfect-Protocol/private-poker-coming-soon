#!/usr/bin/env node

import crypto from "node:crypto";

const defaults = {
  count: 24,
  intervalMs: 80,
  keepMs: 45_000,
  lobbyId: "grid",
  maxOpenPerSecond: 5,
  maxSockets: 80,
  minOpenPerSecond: 1,
  randomCloseChance: 0.24,
  randomCloseEveryMs: 1000,
  tableId: String(Date.now()),
  url: "ws://127.0.0.1:3000/mesh",
};

function argValue(name, fallback) {
  const prefix = `--${name}=`;
  const inline = process.argv.find((arg) => arg.startsWith(prefix));
  if (inline) return inline.slice(prefix.length);

  const index = process.argv.indexOf(`--${name}`);
  if (index >= 0 && process.argv[index + 1]) return process.argv[index + 1];
  return fallback;
}

function numericArg(name, fallback) {
  const value = Number(argValue(name, fallback));
  return Number.isFinite(value) && value >= 0 ? value : fallback;
}

function usage() {
  console.log(`
Usage:
  node scripts/mesh-random-requests.mjs [options]

Options:
  --url <ws-url>          Mesh websocket URL. Default: ${defaults.url}
  --count <number>        Number of random connection requests. Default: ${defaults.count}
  --interval-ms <number>  Delay between opening sockets. Default: ${defaults.intervalMs}
  --keep-ms <number>      How long to keep sockets open. Default: ${defaults.keepMs}
  --loop                  Keep opening and closing random sockets until stopped.
  --min-open-rate <n>     Loop mode: minimum new sockets per second. Default: ${defaults.minOpenPerSecond}
  --max-open-rate <n>     Loop mode: maximum new sockets per second. Default: ${defaults.maxOpenPerSecond}
  --max-sockets <number>  Loop mode: maximum sockets kept open. Default: ${defaults.maxSockets}
  --close-chance <0..1>   Loop mode: chance to close each open socket per tick. Default: ${defaults.randomCloseChance}
  --close-every-ms <n>    Loop mode: close tick interval. Default: ${defaults.randomCloseEveryMs}
  --lobby-id <value>      Lobby id attached to generated requests. Default: ${defaults.lobbyId}
  --table-id <value>      Table id attached to generated requests. Default: current timestamp

Examples:
  node scripts/mesh-random-requests.mjs --url ws://127.0.0.1:3000/mesh --count 80 --keep-ms 60000
  node scripts/mesh-random-requests.mjs --loop --url ws://127.0.0.1:3000/mesh --min-open-rate 1 --max-open-rate 5
`);
}

if (process.argv.includes("--help") || process.argv.includes("-h")) {
  usage();
  process.exit(0);
}

const config = {
  closeEveryMs: numericArg("close-every-ms", defaults.randomCloseEveryMs),
  count: numericArg("count", defaults.count),
  intervalMs: numericArg("interval-ms", defaults.intervalMs),
  keepMs: numericArg("keep-ms", defaults.keepMs),
  lobbyId: String(argValue("lobby-id", defaults.lobbyId)),
  loop: process.argv.includes("--loop"),
  maxOpenPerSecond: numericArg("max-open-rate", defaults.maxOpenPerSecond),
  maxSockets: numericArg("max-sockets", defaults.maxSockets),
  minOpenPerSecond: numericArg("min-open-rate", defaults.minOpenPerSecond),
  randomCloseChance: Math.min(1, numericArg("close-chance", defaults.randomCloseChance)),
  tableId: String(argValue("table-id", defaults.tableId)),
  url: String(argValue("url", defaults.url)),
};

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function randomAddress() {
  return `0x${crypto.randomBytes(20).toString("hex")}`;
}

function randomInt(min, max) {
  const lower = Math.ceil(Math.min(min, max));
  const upper = Math.floor(Math.max(min, max));
  return lower + crypto.randomInt(Math.max(1, upper - lower + 1));
}

function randomPayload(bytes = 192) {
  return `0x${crypto.randomBytes(bytes).toString("hex")}`;
}

function base64UrlJson(value) {
  return Buffer
    .from(JSON.stringify(value), "utf8")
    .toString("base64")
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=+$/g, "");
}

function makeSignal(from, to, kind = "offer") {
  return {
    encryptedData: randomPayload(),
    kind,
    lobbyId: config.lobbyId,
    originAddress: from,
    tableId: config.tableId,
    targetAddress: to,
  };
}

async function loadWebSocket() {
  if (globalThis.WebSocket) return globalThis.WebSocket;

  const ws = await import("next/dist/compiled/ws/index.js");
  return ws.WebSocket ?? ws.default?.WebSocket ?? ws.default;
}

function websocketUrl(signal) {
  const url = new URL(config.url);
  url.searchParams.set("i", base64UrlJson(signal));
  return url.toString();
}

function onSocket(socket, eventName, handler) {
  if (typeof socket.addEventListener === "function") {
    socket.addEventListener(eventName, handler);
    return;
  }
  socket.on(eventName, handler);
}

function openRequest(WebSocketImpl, from, to, index) {
  const signal = makeSignal(from, to, "offer");
  const socket = new WebSocketImpl(websocketUrl(signal));
  const label = `${String(index + 1).padStart(3, "0")} ${from.slice(0, 10)} -> ${to.slice(0, 10)}`;

  onSocket(socket, "open", () => {
    console.log(`[mesh-random] open ${label}`);
    socket.send(JSON.stringify({
      signal,
      type: "bootstrap-interest",
    }));
  });

  const handleMessage = (eventOrData) => {
    const raw = eventOrData?.data ?? eventOrData;
    const text = Buffer.isBuffer(raw) ? raw.toString("utf8") : String(raw);
    let value;
    try {
      value = JSON.parse(text);
    } catch {
      return;
    }

    if (value?.type !== "bootstrap-offer" || !value.peer) return;
    const answer = makeSignal(from, value.peer, "answer");
    socket.send(JSON.stringify({
      signal: answer,
      type: "bootstrap-answer",
    }));
    console.log(`[mesh-random] answer ${from.slice(0, 10)} -> ${String(value.peer).slice(0, 10)}`);
  };

  onSocket(socket, "message", handleMessage);

  const handleClose = () => {
    console.log(`[mesh-random] close ${label}`);
  };
  onSocket(socket, "close", handleClose);

  const handleError = (eventOrError) => {
    const message = eventOrError?.message ?? eventOrError?.error?.message ?? "connection failed";
    console.error(`[mesh-random] error ${label}: ${message}`);
  };
  onSocket(socket, "error", handleError);

  return socket;
}

function closeSocket(socket) {
  try {
    if (socket.readyState === 0 || socket.readyState === 1) {
      socket.close();
    }
  } catch {
    try {
      socket.terminate?.();
    } catch {
      // best effort
    }
  }
}

function randomPeerPair(peers) {
  const fromIndex = crypto.randomInt(peers.length);
  let toIndex = crypto.randomInt(peers.length);
  if (toIndex === fromIndex) toIndex = (toIndex + 1) % peers.length;
  return [peers[fromIndex], peers[toIndex]];
}

async function runOnce(WebSocketImpl) {
  const peers = Array.from({ length: Math.max(2, config.count) }, randomAddress);
  const sockets = [];

  console.log("[mesh-random] mode once");
  console.log("[mesh-random] target", config.url);
  console.log("[mesh-random] count", config.count);
  console.log("[mesh-random] lobby/table", `${config.lobbyId}/${config.tableId}`);

  for (let index = 0; index < config.count; index += 1) {
    const from = peers[index % peers.length];
    const to = peers[(index + 1) % peers.length];
    sockets.push(openRequest(WebSocketImpl, from, to, index));
    if (config.intervalMs > 0) await sleep(config.intervalMs);
  }

  console.log(`[mesh-random] keeping ${sockets.length} sockets open for ${config.keepMs}ms`);
  await sleep(config.keepMs);

  for (const socket of sockets) closeSocket(socket);
  await sleep(250);
  console.log("[mesh-random] done");
}

async function runLoop(WebSocketImpl) {
  const peerCount = Math.max(8, config.maxSockets * 2);
  const peers = Array.from({ length: peerCount }, randomAddress);
  const sockets = new Set();
  let index = 0;
  let stopping = false;

  function closeAll() {
    if (stopping) return;
    stopping = true;
    console.log("[mesh-random] stopping, closing open sockets...");
    for (const socket of sockets) closeSocket(socket);
  }

  process.once("SIGINT", closeAll);
  process.once("SIGTERM", closeAll);

  console.log("[mesh-random] mode loop");
  console.log("[mesh-random] target", config.url);
  console.log("[mesh-random] open rate", `${config.minOpenPerSecond}-${config.maxOpenPerSecond}/sec`);
  console.log("[mesh-random] max sockets", config.maxSockets);
  console.log("[mesh-random] close chance", config.randomCloseChance);
  console.log("[mesh-random] lobby/table", `${config.lobbyId}/${config.tableId}`);

  let lastCloseTick = Date.now();
  while (!stopping) {
    const opensThisSecond = Math.min(
      Math.max(0, config.maxSockets - sockets.size),
      randomInt(config.minOpenPerSecond, config.maxOpenPerSecond),
    );

    for (let openIndex = 0; openIndex < opensThisSecond && !stopping; openIndex += 1) {
      const [from, to] = randomPeerPair(peers);
      const socket = openRequest(WebSocketImpl, from, to, index);
      sockets.add(socket);

      const forget = () => sockets.delete(socket);
      onSocket(socket, "close", forget);
      onSocket(socket, "error", forget);

      index += 1;
      await sleep(Math.max(50, Math.floor(1000 / Math.max(1, opensThisSecond))));
    }

    const now = Date.now();
    if (now - lastCloseTick >= config.closeEveryMs) {
      lastCloseTick = now;
      for (const socket of [...sockets]) {
        if (Math.random() < config.randomCloseChance) {
          closeSocket(socket);
          sockets.delete(socket);
        }
      }
      console.log(`[mesh-random] pool open=${sockets.size}`);
    }

    await sleep(100);
  }

  await sleep(250);
  console.log("[mesh-random] done");
}

async function main() {
  const WebSocketImpl = await loadWebSocket();
  if (config.loop) {
    await runLoop(WebSocketImpl);
    return;
  }
  await runOnce(WebSocketImpl);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
