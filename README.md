# Private Poker Coming Soon

A mock replacement for the Private Poker app with the `/mesh` bootstrap endpoint
embedded in the bundled Next.js runtime.

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
template attaches the app-local Signal Server while generating
`.next-bundle/server.mjs`; the generated server file is not post-patched.

The app has no wallet, blockchain, RPC, or cryptography dependencies. It uses
Next.js, React, static assets, and the app-local Signal Server bootstrap route.
