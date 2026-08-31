# Private Poker Coming Soon

A mock replacement for the Private Poker app.

## Flow

1. Splash screen
2. Timed fade
3. Welcome screen explaining Private Poker

## Run

```bash
npm install
npx next-bundle
npm start
```

For local iteration with the same bundled runtime:

```bash
npm run dev
```

`next-bundle` is a local project dependency in `tools/next-bundle`. Its server
template generates `.next-bundle/server.mjs`; the generated server file is not
post-patched.

The app has no wallet, blockchain, RPC, cryptography, or signaling-server
dependencies. It uses Next.js, React, and static assets.
