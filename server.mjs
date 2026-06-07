#!/usr/bin/env node

import crypto from "node:crypto";
import http from "node:http";
import next from "next";

const dev = process.env.NODE_ENV !== "production";
const hostname = process.env.HOST ?? "127.0.0.1";
const port = Number(process.env.PORT ?? 3000);
const holdTimeoutMs = Number(process.env.PRIVATE_MESH_BOOTSTRAP_TIMEOUT_MS ?? 10_000);
const collectDelayMs = Number(process.env.PRIVATE_MESH_COLLECT_DELAY_MS ?? 5_000);
const maxFrameBytes = Number(process.env.PRIVATE_MESH_MAX_FRAME_BYTES ?? 1024 * 1024);

const sockets = new Map();
const interests = new Map();
const adjacency = new Map();

const app = next({ dev, hostname, port });
const handle = app.getRequestHandler();
let handleUpgrade;

function normalizeHex(value) {
  const text = String(value ?? "").trim();
  return text.startsWith("0x") ? `0x${text.slice(2).toLowerCase()}` : `0x${text.toLowerCase()}`;
}

function normalizeAddress(value) {
  const hex = normalizeHex(value);
  return /^0x[0-9a-f]{40}$/.test(hex) ? hex : "";
}

function normalizeHexBytes(value) {
  const hex = normalizeHex(value);
  return /^0x[0-9a-f]+$/.test(hex) && (hex.length - 2) % 2 === 0 ? hex : "";
}

function shortAddress(value) {
  const text = String(value ?? "");
  return text.length > 12 ? `${text.slice(0, 6)}...${text.slice(-4)}` : text;
}

function logAction(action, fields = {}) {
  console.log("[resu]", action, {
    sockets: sockets.size,
    interests: interests.size,
    vertices: adjacency.size,
    ...fields,
  });
}

function bootstrapUrl(req) {
  const url = new URL(req.url ?? "/", `http://${req.headers.host ?? "private.poker"}`);
  return url.pathname === "/resu" ? url : null;
}

function websocketAccept(key) {
  return crypto
    .createHash("sha1")
    .update(`${key}258EAFA5-E914-47DA-95CA-C5AB0DC85B11`)
    .digest("base64");
}

function acceptSocket(req, socket) {
  socket.write([
    "HTTP/1.1 101 Switching Protocols",
    "Upgrade: websocket",
    "Connection: Upgrade",
    `Sec-WebSocket-Accept: ${websocketAccept(req.headers["sec-websocket-key"])}`,
    "",
    "",
  ].join("\r\n"));
}

function sendFrame(socket, value) {
  const payload = Buffer.from(JSON.stringify(value));
  let header;

  if (payload.length < 126) {
    header = Buffer.from([0x81, payload.length]);
  } else if (payload.length <= 0xffff) {
    header = Buffer.alloc(4);
    header[0] = 0x81;
    header[1] = 126;
    header.writeUInt16BE(payload.length, 2);
  } else {
    header = Buffer.alloc(10);
    header[0] = 0x81;
    header[1] = 127;
    header.writeBigUInt64BE(BigInt(payload.length), 2);
  }

  socket.write(Buffer.concat([header, payload]));
}

function readFrames(buffer) {
  const messages = [];
  let offset = 0;

  while (buffer.length - offset >= 2) {
    const first = buffer[offset];
    const second = buffer[offset + 1];
    const opcode = first & 0x0f;
    const masked = Boolean(second & 0x80);
    let length = second & 0x7f;
    let headerLength = 2;

    if (length === 126) {
      if (buffer.length - offset < 4) break;
      length = buffer.readUInt16BE(offset + 2);
      headerLength = 4;
    } else if (length === 127) {
      if (buffer.length - offset < 10) break;
      const bigLength = buffer.readBigUInt64BE(offset + 2);
      if (bigLength > BigInt(maxFrameBytes)) throw new Error("bootstrap frame too large");
      length = Number(bigLength);
      headerLength = 10;
    }

    const maskLength = masked ? 4 : 0;
    const frameLength = headerLength + maskLength + length;
    if (buffer.length - offset < frameLength) break;
    if (length > maxFrameBytes) throw new Error("bootstrap frame too large");

    const maskOffset = offset + headerLength;
    const payloadOffset = maskOffset + maskLength;
    const payload = Buffer.from(buffer.subarray(payloadOffset, payloadOffset + length));

    if (masked) {
      const mask = buffer.subarray(maskOffset, maskOffset + 4);
      for (let index = 0; index < payload.length; index += 1) {
        payload[index] ^= mask[index % 4];
      }
    }

    if (opcode === 0x1) messages.push(payload.toString("utf8"));
    if (opcode === 0x8) messages.push(null);

    offset += frameLength;
  }

  return { messages, rest: buffer.subarray(offset) };
}

function parseBase64UrlJson(value) {
  const text = String(value ?? "");
  const padded = `${text}${"=".repeat((4 - (text.length % 4)) % 4)}`;
  return JSON.parse(Buffer.from(padded.replace(/-/g, "+").replace(/_/g, "/"), "base64").toString("utf8"));
}

function parseSignal(value, fallbackKind = "offer") {
  const from = normalizeAddress(value.originAddress ?? value.sender ?? value.from);
  const to = normalizeAddress(value.targetAddress ?? value.recipient ?? value.to);
  const encryptedData = normalizeHexBytes(value.encryptedData ?? value.payload);
  const kind = String(value.kind ?? value.signalType ?? fallbackKind);
  const lobbyId = String(value.lobbyId ?? "");
  const tableId = String(value.tableId ?? "");

  if (!from) throw new Error("originAddress required");
  if (!to) throw new Error("targetAddress required");
  if (!encryptedData) throw new Error("encryptedData required");
  if (!lobbyId) throw new Error("lobbyId required");
  if (!tableId) throw new Error("tableId required");

  return {
    id: crypto.randomUUID(),
    from,
    to,
    encryptedData,
    kind,
    lobbyId,
    tableId,
    sentAt: Date.now(),
  };
}

function interestKey(signal) {
  return `${signal.lobbyId}:${signal.tableId}:${signal.from}:${signal.to}`;
}

function socketKey(signal) {
  return `${signal.lobbyId}:${signal.tableId}:${signal.from}`;
}

function peerSocketKey(lobbyId, tableId, peer) {
  return `${lobbyId}:${tableId}:${normalizeAddress(peer)}`;
}

function vertexKey(lobbyId, tableId, peer) {
  return peerSocketKey(lobbyId, tableId, peer);
}

function signalLog(signal) {
  return {
    id: signal?.id,
    from: shortAddress(signal?.from),
    to: shortAddress(signal?.to),
    lobbyId: signal?.lobbyId,
    tableId: signal?.tableId,
    kind: signal?.kind,
    payloadBytes: Math.max(0, (String(signal?.encryptedData ?? "").length - 2) / 2),
  };
}

function shortVertex(value) {
  const address = String(value ?? "").split(":").at(-1);
  return shortAddress(address);
}

function interestLog(interest) {
  return {
    key: interest?.key,
    state: interest?.state,
    offer: signalLog(interest?.offer),
    answer: interest?.answer ? signalLog(interest.answer) : null,
  };
}

function envelope(signal, recipient) {
  return {
    id: signal.id,
    sent_at: signal.sentAt,
    sender: signal.from,
    originAddress: signal.from,
    recipient,
    payload: signal.encryptedData,
    encryptedData: signal.encryptedData,
    kind: signal.kind,
    lobbyId: signal.lobbyId,
    tableId: signal.tableId,
  };
}

function socketUsable(entry) {
  return Boolean(entry?.socket && !entry.socket.destroyed && entry.socket.writable);
}

function addAdjacentInterest(interest) {
  const fromVertex = vertexKey(interest.offer.lobbyId, interest.offer.tableId, interest.offer.from);
  const toVertex = vertexKey(interest.offer.lobbyId, interest.offer.tableId, interest.offer.to);

  addAdjacentEdge(fromVertex, toVertex, interest.key);
  addAdjacentEdge(toVertex, fromVertex, interest.key);

  logAction("graph.edge-add", {
    from: shortAddress(interest.offer.from),
    to: shortAddress(interest.offer.to),
    key: interest.key,
    fromAdjacent: adjacentVertexLog(fromVertex),
    toAdjacent: adjacentVertexLog(toVertex),
  });
}

function removeAdjacentInterest(interest) {
  const fromVertex = vertexKey(interest.offer.lobbyId, interest.offer.tableId, interest.offer.from);
  const toVertex = vertexKey(interest.offer.lobbyId, interest.offer.tableId, interest.offer.to);

  removeAdjacentEdge(fromVertex, toVertex, interest.key);
  removeAdjacentEdge(toVertex, fromVertex, interest.key);

  logAction("graph.edge-remove", {
    from: shortAddress(interest.offer.from),
    to: shortAddress(interest.offer.to),
    key: interest.key,
    fromAdjacent: adjacentVertexLog(fromVertex),
    toAdjacent: adjacentVertexLog(toVertex),
  });
}

function addAdjacentEdge(vertex, adjacentVertex, key) {
  const adjacent = adjacency.get(vertex) ?? new Map();
  const edges = adjacent.get(adjacentVertex) ?? new Set();
  edges.add(key);
  adjacent.set(adjacentVertex, edges);
  adjacency.set(vertex, adjacent);
}

function removeAdjacentEdge(vertex, adjacentVertex, key) {
  const adjacent = adjacency.get(vertex);
  if (!adjacent) return;

  const edges = adjacent.get(adjacentVertex);
  if (!edges) return;

  edges.delete(key);
  if (edges.size === 0) adjacent.delete(adjacentVertex);
  if (adjacent.size === 0) adjacency.delete(vertex);
}

function adjacentVertexLog(vertex) {
  return [...(adjacency.get(vertex)?.keys() ?? [])].map(shortVertex);
}

function deleteInterest(key, reason) {
  const interest = interests.get(key);
  if (!interest) return;
  interests.delete(key);
  removeAdjacentInterest(interest);
  logAction("interest.delete", { reason, interest: interestLog(interest) });
}

function relevantInterests(entry) {
  const vertex = vertexKey(entry.lobbyId, entry.tableId, entry.peer);
  const keys = new Set(
    [...(adjacency.get(vertex)?.values() ?? [])].flatMap((edges) => [...edges])
  );
  return [...keys]
    .map((key) => interests.get(key))
    .filter(Boolean);
}

function retireSocket(entry, reason) {
  if (!entry || entry.retired) return;
  entry.retired = true;
  clearTimeout(entry.holdTimer);
  clearTimeout(entry.collectTimer);
  sockets.delete(entry.key);

  for (const interest of relevantInterests(entry)) {
    deleteInterest(interest.key, reason);
  }

  logAction("socket.retire", {
    reason,
    peer: shortAddress(entry.peer),
    lobbyId: entry.lobbyId,
    tableId: entry.tableId,
    elapsedMs: Date.now() - entry.createdAt,
  });
}

function markActivity(entry, reason) {
  if (!entry) return;
  clearTimeout(entry.holdTimer);
  logAction("socket.activity", {
    reason,
    peer: shortAddress(entry.peer),
    lobbyId: entry.lobbyId,
    tableId: entry.tableId,
  });
}

function scheduleCollection(entry) {
  if (!entry || entry.collectTimer || entry.retired) return;
  const relevant = relevantInterests(entry);
  if (!entry.good || relevant.some((interest) => interest.state !== "Answered")) return;

  logAction("socket.collect-schedule", {
    peer: shortAddress(entry.peer),
    lobbyId: entry.lobbyId,
    tableId: entry.tableId,
    delayMs: collectDelayMs,
    relevant: relevant.length,
  });

  entry.collectTimer = setTimeout(() => {
    logAction("socket.collect", {
      peer: shortAddress(entry.peer),
      lobbyId: entry.lobbyId,
      tableId: entry.tableId,
    });
    entry.closeReason = "collect";
    entry.socket.end();
  }, collectDelayMs);
}

function scanInterests(reason) {
  logAction("scan.start", { reason });

  for (const interest of interests.values()) {
    if (interest.state !== "Open") continue;

    const fromSocket = sockets.get(peerSocketKey(interest.offer.lobbyId, interest.offer.tableId, interest.offer.from));
    const toSocket = sockets.get(peerSocketKey(interest.offer.lobbyId, interest.offer.tableId, interest.offer.to));
    if (!socketUsable(fromSocket) || !socketUsable(toSocket)) continue;

    sendFrame(toSocket.socket, {
      type: "bootstrap-offer",
      interestId: interest.key,
      peer: interest.offer.from,
      signal: envelope(interest.offer, interest.offer.to),
    });
    interest.state = "Offered";
    interest.offeredAt = Date.now();
    markActivity(fromSocket, "offer.sent.from");
    markActivity(toSocket, "offer.sent.to");
    logAction("offer.forward", { interest: interestLog(interest) });
  }

  for (const entry of sockets.values()) {
    scheduleCollection(entry);
  }
}

function storeInterest(signal) {
  const key = interestKey(signal);
  const existing = interests.get(key);
  if (existing) removeAdjacentInterest(existing);
  const interest = {
    key,
    state: "Open",
    offer: signal,
    answer: null,
    createdAt: Date.now(),
    offeredAt: null,
    answeredAt: null,
  };
  interests.set(key, interest);
  addAdjacentInterest(interest);
  logAction(existing ? "interest.replace" : "interest.store", { interest: interestLog(interest) });
  scanInterests("interest");
}

function storeAnswer(signal) {
  const key = `${signal.lobbyId}:${signal.tableId}:${signal.to}:${signal.from}`;
  const interest = interests.get(key);
  if (!interest || interest.state !== "Offered") {
    logAction("answer.no-open-interest", { answer: signalLog(signal), key });
    return;
  }

  const targetSocket = sockets.get(peerSocketKey(signal.lobbyId, signal.tableId, signal.to));
  if (!socketUsable(targetSocket)) {
    logAction("answer.no-target-socket", { answer: signalLog(signal), key });
    return;
  }

  interest.answer = signal;
  interest.state = "Answered";
  interest.answeredAt = Date.now();
  sendFrame(targetSocket.socket, {
    type: "bootstrap-answer",
    interestId: interest.key,
    peer: signal.from,
    signal: envelope(signal, signal.to),
  });

  const sourceSocket = sockets.get(peerSocketKey(signal.lobbyId, signal.tableId, signal.from));
  markActivity(sourceSocket, "answer.sent.from");
  markActivity(targetSocket, "answer.sent.to");
  logAction("answer.forward", { interest: interestLog(interest) });
  scanInterests("answer");
}

function registerSocket(req, socket, signal) {
  const key = socketKey(signal);
  const existing = sockets.get(key);
  if (existing) {
    logAction("socket.replace", {
      key,
      existingPeer: shortAddress(existing.peer),
      peer: shortAddress(signal.from),
    });
    retireSocket(existing, "replaced");
    existing.socket.destroy();
  }

  const entry = {
    key,
    socket,
    peer: signal.from,
    lobbyId: signal.lobbyId,
    tableId: signal.tableId,
    good: false,
    retired: false,
    createdAt: Date.now(),
    closeReason: "close",
    timedOut: false,
    holdTimer: null,
    collectTimer: null,
  };
  sockets.set(key, entry);

  entry.holdTimer = setTimeout(() => {
    entry.timedOut = true;
    entry.closeReason = "hold-timeout";
    logAction("socket.hold-timeout", {
      peer: shortAddress(entry.peer),
      lobbyId: entry.lobbyId,
      tableId: entry.tableId,
      elapsedMs: Date.now() - entry.createdAt,
    });
    entry.socket.destroy();
  }, holdTimeoutMs);

  acceptSocket(req, socket);
  wireSocket(entry);
  socket.on("close", (hadError) => {
    logAction("socket.close", {
      reason: entry.closeReason,
      peer: shortAddress(entry.peer),
      lobbyId: entry.lobbyId,
      tableId: entry.tableId,
      elapsedMs: Date.now() - entry.createdAt,
      hadError,
      timedOut: entry.timedOut,
    });
    retireSocket(entry, entry.closeReason);
  });
  socket.on("error", (error) => {
    entry.closeReason = "error";
    logAction("socket.error", {
      peer: shortAddress(entry.peer),
      error: error?.message ?? String(error),
    });
    retireSocket(entry, "error");
  });

  logAction("socket.register", {
    key,
    peer: shortAddress(entry.peer),
    lobbyId: entry.lobbyId,
    tableId: entry.tableId,
  });
  return entry;
}

function wireSocket(entry) {
  let buffer = Buffer.alloc(0);

  entry.socket.on("data", (chunk) => {
    try {
      buffer = Buffer.concat([buffer, chunk]);
      const parsed = readFrames(buffer);
      buffer = parsed.rest;

      for (const message of parsed.messages) {
        if (message == null) {
          entry.closeReason = "client-close-frame";
          logAction("websocket.close-frame", {
            peer: shortAddress(entry.peer),
            lobbyId: entry.lobbyId,
            tableId: entry.tableId,
          });
          entry.socket.end();
          return;
        }

        const value = JSON.parse(message);
        if (value?.type === "bootstrap-interest") {
          const signal = parseSignal(value.signal, "offer");
          if (signal.from !== entry.peer || signal.lobbyId !== entry.lobbyId || signal.tableId !== entry.tableId) {
            logAction("interest.reject-socket-mismatch", { signal: signalLog(signal) });
            continue;
          }
          storeInterest(signal);
          continue;
        }

        if (value?.type === "bootstrap-answer") {
          const signal = parseSignal(value.signal, "answer");
          if (signal.from !== entry.peer || signal.lobbyId !== entry.lobbyId || signal.tableId !== entry.tableId) {
            logAction("answer.reject-socket-mismatch", { answer: signalLog(signal) });
            continue;
          }
          storeAnswer(signal);
          continue;
        }

        if (value?.type === "bootstrap-good") {
          entry.good = true;
          logAction("peer.good", {
            peer: shortAddress(entry.peer),
            lobbyId: entry.lobbyId,
            tableId: entry.tableId,
          });
          scanInterests("good");
          continue;
        }

        logAction("message.ignore", { type: value?.type });
      }
    } catch (error) {
      logAction("websocket.data-error", {
        peer: shortAddress(entry.peer),
        error: error?.message ?? String(error),
      });
      entry.closeReason = "data-error";
      entry.socket.destroy();
    }
  });
}

function handleBootstrapUpgrade(req, socket) {
  const url = bootstrapUrl(req);
  if (!url) return false;

  const key = req.headers["sec-websocket-key"];
  if (!key || String(req.headers.upgrade ?? "").toLowerCase() !== "websocket") {
    logAction("request.reject-not-websocket", { path: req.url });
    socket.destroy();
    return true;
  }

  try {
    const signal = parseSignal(parseBase64UrlJson(url.searchParams.get("i")), "offer");
    registerSocket(req, socket, signal);
    storeInterest(signal);
  } catch (error) {
    logAction("request.reject-invalid-interest", {
      path: req.url,
      error: error?.message ?? String(error),
    });
    socket.destroy();
  }

  return true;
}

await app.prepare();
handleUpgrade = app.getUpgradeHandler();

const server = http.createServer((req, res) => {
  handle(req, res);
});

server.on("upgrade", (req, socket, head) => {
  if (handleBootstrapUpgrade(req, socket, head)) return;
  handleUpgrade(req, socket, head);
});

server.listen(port, hostname, () => {
  logAction("server.ready", {
    url: `http://${hostname}:${port}`,
    endpoint: "/resu",
    holdTimeoutMs,
    collectDelayMs,
  });
  console.log(`> Private Poker app ready on http://${hostname}:${port}`);
});
