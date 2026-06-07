export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export function GET() {
  return new Response("Upgrade required\n", {
    status: 426,
    headers: {
      "cache-control": "no-store",
      "content-type": "text/plain; charset=utf-8",
      "upgrade": "websocket",
    },
  });
}

export function POST() {
  return new Response("Upgrade required\n", {
    status: 426,
    headers: {
      "cache-control": "no-store",
      "content-type": "text/plain; charset=utf-8",
      "upgrade": "websocket",
    },
  });
}
