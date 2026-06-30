import crypto from "node:crypto";
import ws from "next/dist/compiled/ws/index.js";

const { WebSocket, WebSocketServer } = ws;

const maxFrameBytes = Number(process.env.PRIVATE_MESH_MAX_FRAME_BYTES ?? 1024 * 1024);
const peerHeartbeatMs = Number(process.env.PRIVATE_MESH_PEER_HEARTBEAT_MS ?? 10_000);
const enableLogging = Number(process.env.PRIVATE_MESH_ENABLE_LOGGING ?? false);

const sockets = new Map();
const interests = new Map();
const peerInterests = new Map();
const peerActivity = new Map();
const recentPeerEvents = [];

let wss;
let attached = false;
const activityWindowMs = 48 * 60 * 60 * 1000;
const activityBucketMs = 60 * 60 * 1000;

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
  if (enableLogging) {
    console.log("[mesh]", action, {
      sockets: sockets.size,
      interests: interests.size,
      map: peerInterests.size,
      ...fields,
    });
  }
}

function bootstrapUrl(req) {
  const url = new URL(req.url ?? "/", `http://${req.headers.host ?? "private.poker"}`);
  return url.pathname === "/mesh" ? url : null;
}

function meshGridUrl(req) {
  const url = new URL(req.url ?? "/", `http://${req.headers.host ?? "private.poker"}`);
  return url.pathname === "/mesh/grid" ? url : null;
}

function sendFrame(socket, value) {
  if (socket.readyState !== WebSocket.OPEN) return false;
  socket.send(JSON.stringify(value));
  return true;
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

  const signal = {
    id: crypto.randomUUID(),
    from,
    to,
    encryptedData,
    kind,
    lobbyId,
    tableId,
    sentAt: Date.now(),
  };
  rememberPeer(from, { kind, lobbyId, tableId });
  rememberPeer(to, { kind: `${kind}.target`, lobbyId, tableId });
  return signal;
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

function shortPeerKey(value) {
  const address = String(value ?? "").split(":").at(-1);
  return shortAddress(address);
}

function prunePeerActivity(now = Date.now()) {
  const cutoff = now - activityWindowMs;
  while (recentPeerEvents.length > 0 && recentPeerEvents[0].at < cutoff) {
    recentPeerEvents.shift();
  }
  for (const [address, peer] of peerActivity.entries()) {
    if (peer.lastSeenAt < cutoff) peerActivity.delete(address);
  }
}

function rememberPeer(peer, fields = {}) {
  const address = normalizeAddress(peer);
  if (!address) return;

  const now = Date.now();
  const current = peerActivity.get(address) ?? {
    address,
    firstSeenAt: now,
    lastSeenAt: now,
    count: 0,
    lobbyId: "",
    tableId: "",
  };

  current.lastSeenAt = now;
  current.count += 1;
  current.lobbyId = fields.lobbyId ?? current.lobbyId;
  current.tableId = fields.tableId ?? current.tableId;
  peerActivity.set(address, current);

  recentPeerEvents.push({
    address,
    at: now,
    kind: fields.kind ?? "activity",
    lobbyId: fields.lobbyId ?? "",
    tableId: fields.tableId ?? "",
  });
  prunePeerActivity(now);
}

function setPeerSeen(peer) {
  const address = normalizeAddress(peer);
  const current = address ? peerActivity.get(address) : null;
  if (current) current.lastSeenAt = Date.now();
}

function meshGridSnapshot() {
  const now = Date.now();
  prunePeerActivity(now);

  const bucketStart = Math.floor(now / activityBucketMs) * activityBucketMs - 47 * activityBucketMs;
  const buckets = Array.from({ length: 48 }, (_, index) => ({
    startedAt: bucketStart + index * activityBucketMs,
    count: 0,
  }));

  for (const event of recentPeerEvents) {
    const index = Math.floor((event.at - bucketStart) / activityBucketMs);
    if (index >= 0 && index < buckets.length) buckets[index].count += 1;
  }

  const activeAddresses = new Set(
    [...sockets.values()]
      .filter((entry) => !entry.forgotten && socketUsable(entry))
      .map((entry) => entry.peer)
  );

  const peers = [...peerActivity.values()]
    .sort((a, b) => b.lastSeenAt - a.lastSeenAt)
    .map((peer) => ({
      address: peer.address,
      display: shortAddress(peer.address),
      count: peer.count,
      active: activeAddresses.has(peer.address),
      firstSeenAt: peer.firstSeenAt,
      lastSeenAt: peer.lastSeenAt,
      lobbyId: peer.lobbyId,
      tableId: peer.tableId,
    }));

  return {
    generatedAt: now,
    windowHours: 48,
    activeCount: activeAddresses.size,
    recentPeerCount: peers.length,
    eventCount48h: recentPeerEvents.length,
    peers,
    buckets,
  };
}

function sendJson(res, statusCode, value) {
  const body = JSON.stringify(value);
  res.writeHead(statusCode, {
    "cache-control": "no-store",
    "content-type": "application/json; charset=utf-8",
    "content-length": Buffer.byteLength(body),
  });
  res.end(body);
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
  return Boolean(entry?.socket && entry.socket.readyState === WebSocket.OPEN);
}

function addMappedInterest(interest) {
  const fromPeer = vertexKey(interest.offer.lobbyId, interest.offer.tableId, interest.offer.from);
  const toPeer = vertexKey(interest.offer.lobbyId, interest.offer.tableId, interest.offer.to);

  addPeerInterest(fromPeer, interest.key);
  addPeerInterest(toPeer, interest.key);

  logAction("map.interest-add", {
    from: shortAddress(interest.offer.from),
    to: shortAddress(interest.offer.to),
    key: interest.key,
    fromInterests: peerInterestLog(fromPeer),
    toInterests: peerInterestLog(toPeer),
  });
}

function removeMappedInterest(interest) {
  const fromPeer = vertexKey(interest.offer.lobbyId, interest.offer.tableId, interest.offer.from);
  const toPeer = vertexKey(interest.offer.lobbyId, interest.offer.tableId, interest.offer.to);

  removePeerInterest(fromPeer, interest.key);
  removePeerInterest(toPeer, interest.key);

  logAction("map.interest-remove", {
    from: shortAddress(interest.offer.from),
    to: shortAddress(interest.offer.to),
    key: interest.key,
    fromInterests: peerInterestLog(fromPeer),
    toInterests: peerInterestLog(toPeer),
  });
}

function addPeerInterest(peer, key) {
  const keys = peerInterests.get(peer) ?? new Set();
  keys.add(key);
  peerInterests.set(peer, keys);
}

function removePeerInterest(peer, key) {
  const keys = peerInterests.get(peer);
  if (!keys) return;
  keys.delete(key);
  if (keys.size === 0) peerInterests.delete(peer);
}

function peerInterestLog(peer) {
  return [...(peerInterests.get(peer) ?? [])];
}

function deleteInterest(key, reason) {
  const interest = interests.get(key);
  if (!interest) return;
  interests.delete(key);
  removeMappedInterest(interest);
  logAction("interest.delete", { reason, interest: interestLog(interest) });
}

function relevantInterests(entry) {
  const peer = vertexKey(entry.lobbyId, entry.tableId, entry.peer);
  return [...(peerInterests.get(peer) ?? [])]
    .map((key) => interests.get(key))
    .filter(Boolean);
}

function interestHasAnySocket(interest) {
  const { lobbyId, tableId, from, to } = interest.offer;
  const fromSocket = sockets.get(peerSocketKey(lobbyId, tableId, from));
  const toSocket = sockets.get(peerSocketKey(lobbyId, tableId, to));
  return socketUsable(fromSocket) || socketUsable(toSocket);
}

function deleteOrphanInterests(entry, reason) {
  for (const interest of relevantInterests(entry)) {
    if (interestHasAnySocket(interest)) {
      logAction("interest.keep", {
        reason,
        interest: interestLog(interest),
      });
      continue;
    }
    deleteInterest(interest.key, reason);
  }
}

function forgetSocket(entry, reason) {
  if (!entry || entry.forgotten) return;
  entry.forgotten = true;
  clearInterval(entry.heartbeatTimer);
  if (sockets.get(entry.key) === entry) sockets.delete(entry.key);
  deleteOrphanInterests(entry, reason);

  logAction("socket.forget", {
    reason,
    peer: shortAddress(entry.peer),
    lobbyId: entry.lobbyId,
    tableId: entry.tableId,
    elapsedMs: Date.now() - entry.createdAt,
  });
}

function markActivity(entry, reason) {
  if (!entry) return;
  logAction("socket.activity", {
    reason,
    peer: shortAddress(entry.peer),
    lobbyId: entry.lobbyId,
    tableId: entry.tableId,
  });
}

function executeInterest(interest, reason) {
  if (!interest || interest.state !== "Open") return false;

  const fromSocket = sockets.get(peerSocketKey(interest.offer.lobbyId, interest.offer.tableId, interest.offer.from));
  const toSocket = sockets.get(peerSocketKey(interest.offer.lobbyId, interest.offer.tableId, interest.offer.to));
  if (!socketUsable(fromSocket) || !socketUsable(toSocket)) {
    logAction("offer.wait", {
      reason,
      interest: interestLog(interest),
      hasFromSocket: socketUsable(fromSocket),
      hasToSocket: socketUsable(toSocket),
    });
    return false;
  }

  const sent = sendFrame(toSocket.socket, {
    type: "bootstrap-offer",
    interestId: interest.key,
    peer: interest.offer.from,
    signal: envelope(interest.offer, interest.offer.to),
  });
  if (!sent) {
    logAction("offer.send-failed", { reason, interest: interestLog(interest) });
    return false;
  }

  interest.state = "Offered";
  interest.offeredAt = Date.now();
  markActivity(fromSocket, "offer.sent.from");
  markActivity(toSocket, "offer.sent.to");
  logAction("offer.forward", { reason, interest: interestLog(interest) });
  return true;
}

function scanPeerInterests(peer, reason) {
  const keys = [...(peerInterests.get(peer) ?? [])];
  logAction("scan.peer", {
    reason,
    peer: shortPeerKey(peer),
    keys,
  });

  for (const key of keys) {
    executeInterest(interests.get(key), reason);
  }
}

function scanInterestSender(interest, reason) {
  if (!interest) return;
  const peer = vertexKey(interest.offer.lobbyId, interest.offer.tableId, interest.offer.from);

  logAction("scan.start", {
    reason,
    peer: shortPeerKey(peer),
  });
  scanPeerInterests(peer, reason);
}

function storeInterest(signal) {
  const key = interestKey(signal);
  const existing = interests.get(key);
  if (existing) removeMappedInterest(existing);
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
  addMappedInterest(interest);
  logAction(existing ? "interest.replace" : "interest.store", { interest: interestLog(interest) });
  scanInterestSender(interest, "interest");
}

function storeAnswer(signal) {
  const key = `${signal.lobbyId}:${signal.tableId}:${signal.to}:${signal.from}`;
  const interest = interests.get(key);
  if (!interest) {
    logAction("answer.no-interest", { answer: signalLog(signal), key });
    return;
  }

  const targetSocket = sockets.get(peerSocketKey(
    interest.offer.lobbyId,
    interest.offer.tableId,
    interest.offer.from,
  ));
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
    signal: envelope(signal, interest.offer.from),
  });

  const sourceSocket = sockets.get(peerSocketKey(signal.lobbyId, signal.tableId, signal.from));
  markActivity(sourceSocket, "answer.sent.from");
  markActivity(targetSocket, "answer.sent.to");
  logAction("answer.forward", { interest: interestLog(interest) });
  scanInterestSender(interest, "answer");
}

function registerSocket(socket, signal) {
  const key = socketKey(signal);
  const existing = sockets.get(key);
  if (existing) {
    logAction("socket.supersede", {
      key,
      existingPeer: shortAddress(existing.peer),
      peer: shortAddress(signal.from),
    });
    forgetSocket(existing, "superseded");
  }

  const entry = {
    key,
    socket,
    peer: signal.from,
    lobbyId: signal.lobbyId,
    tableId: signal.tableId,
    forgotten: false,
    createdAt: Date.now(),
    closeReason: "peer-close",
    sawCloseFrame: false,
    awaitingPong: false,
    heartbeatTimer: null,
  };
  sockets.set(key, entry);
  rememberPeer(entry.peer, {
    kind: "socket",
    lobbyId: entry.lobbyId,
    tableId: entry.tableId,
  });

  wireSocket(entry);
  entry.heartbeatTimer = setInterval(() => {
    if (entry.forgotten) return;
    if (entry.awaitingPong) {
      entry.closeReason = "keepalive-failed";
      logAction("keepalive.failed", {
        peer: shortAddress(entry.peer),
        lobbyId: entry.lobbyId,
        tableId: entry.tableId,
        heartbeatMs: peerHeartbeatMs,
      });
      entry.socket.terminate();
      forgetSocket(entry, "keepalive-failed");
      return;
    }

    entry.awaitingPong = true;
    try {
      logAction("keepalive.ping", {
        peer: shortAddress(entry.peer),
        lobbyId: entry.lobbyId,
        tableId: entry.tableId,
        heartbeatMs: peerHeartbeatMs,
      });
      entry.socket.ping();
    } catch {
      entry.closeReason = "keepalive-failed";
      forgetSocket(entry, "keepalive-failed");
    }
  }, peerHeartbeatMs);
  socket.on("close", (code, reason) => {
    if (entry.forgotten) {
      logAction("socket.close-forgotten", {
        reason: entry.closeReason,
        closeFrame: entry.sawCloseFrame,
        peer: shortAddress(entry.peer),
        lobbyId: entry.lobbyId,
        tableId: entry.tableId,
        elapsedMs: Date.now() - entry.createdAt,
        code,
        closeReasonText: reason.toString(),
      });
      return;
    }

    entry.sawCloseFrame = code !== 1006;
    logAction("socket.close", {
      reason: entry.closeReason,
      closeFrame: entry.sawCloseFrame,
      peer: shortAddress(entry.peer),
      lobbyId: entry.lobbyId,
      tableId: entry.tableId,
      elapsedMs: Date.now() - entry.createdAt,
      code,
      closeReasonText: reason.toString(),
    });
    forgetSocket(entry, entry.closeReason);
  });
  socket.on("error", (error) => {
    entry.closeReason = "peer-close";
    logAction("socket.error", {
      peer: shortAddress(entry.peer),
      error: error?.message ?? String(error),
    });
    forgetSocket(entry, "peer-close");
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
  entry.socket.on("pong", () => {
    entry.awaitingPong = false;
    logAction("websocket.pong", {
      peer: shortAddress(entry.peer),
      lobbyId: entry.lobbyId,
      tableId: entry.tableId,
    });
  });

  entry.socket.on("ping", (payload) => {
    entry.awaitingPong = false;
    logAction("websocket.ping", {
      peer: shortAddress(entry.peer),
      lobbyId: entry.lobbyId,
      tableId: entry.tableId,
      bytes: payload.length,
    });
  });

  entry.socket.on("message", (data) => {
    if (entry.forgotten) return;
    try {
      entry.awaitingPong = false;
      const value = JSON.parse(data.toString());
      setPeerSeen(entry.peer);
      if (value?.type === "bootstrap-interest") {
        const signal = parseSignal(value.signal, "offer");
        if (signal.from !== entry.peer || signal.lobbyId !== entry.lobbyId || signal.tableId !== entry.tableId) {
          logAction("interest.reject-socket-mismatch", { signal: signalLog(signal) });
          return;
        }
        storeInterest(signal);
        return;
      }

      if (value?.type === "bootstrap-answer") {
        const signal = parseSignal(value.signal, "answer");
        if (signal.from !== entry.peer || signal.lobbyId !== entry.lobbyId || signal.tableId !== entry.tableId) {
          logAction("answer.reject-socket-mismatch", { answer: signalLog(signal) });
          return;
        }
        storeAnswer(signal);
        return;
      }

      if (value?.type === "bootstrap-bye") {
        entry.closeReason = "bye";
        logAction("peer.bye", {
          peer: shortAddress(entry.peer),
          lobbyId: entry.lobbyId,
          tableId: entry.tableId,
        });
        forgetSocket(entry, "bye");
        return;
      }

      logAction("message.ignore", { type: value?.type });
    } catch (error) {
      logAction("websocket.data-error", {
        peer: shortAddress(entry.peer),
        error: error?.message ?? String(error),
      });
    }
  });
}

function handleBootstrapUpgrade(req, socket, head = Buffer.alloc(0)) {
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
    wss.handleUpgrade(req, socket, head, (websocket) => {
      registerSocket(websocket, signal);
    });
  } catch (error) {
    logAction("request.reject-invalid-interest", {
      path: req.url,
      error: error?.message ?? String(error),
    });
    socket.destroy();
  }

  return true;
}

export function handleMeshRequest(req, res) {
  const url = meshGridUrl(req);
  if (!url) return false;

  if (req.method !== "GET" && req.method !== "HEAD") {
    res.writeHead(405, {
      allow: "GET, HEAD",
      "content-type": "text/plain; charset=utf-8",
    });
    res.end("Method Not Allowed\n");
    return true;
  }

  if (req.method === "HEAD") {
    res.writeHead(200, {
      "cache-control": "no-store",
      "content-type": "application/json; charset=utf-8",
    });
    res.end();
    return true;
  }

  sendJson(res, 200, meshGridSnapshot());
  return true;
}

export function attachMesh(server, options = {}) {
  if (attached) return;
  attached = true;

  wss = new WebSocketServer({
    noServer: true,
    maxPayload: maxFrameBytes,
  });

  server.timeout = 0;
  server.requestTimeout = 0;
  server.headersTimeout = 0;
  server.keepAliveTimeout = 0;

  server.on("upgrade", (req, socket, head) => {
    if (handleBootstrapUpgrade(req, socket, head)) return;
    if (options.onUnhandledUpgrade) {
      options.onUnhandledUpgrade(req, socket, head);
      return;
    }
    socket.destroy();
  });

  logAction("server.ready", {
    endpoint: "/mesh",
  });
}
