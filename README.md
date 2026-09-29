<p align="center">
    <img title="CreditChek" height="200" src="https://docs.creditchek.africa/img/nav_logo.svg" width="50%"/>
</p>

# CreditChek React SDK

Add CreditChek identity verification to your React app. With a few lines of code your customers can:

- verify their identity with a **BVN** or **NIN**
- complete a **face liveness** check, matched against their BVN or NIN photo

The SDK opens the hosted CreditChek widget in a modal on your page, tells you as each step finishes, and tells you when the customer is done. It works with React 17+, Vite, Create React App and Next.js.

---

## Contents

1. [How integration works](#how-integration-works)
2. [Before you start](#before-you-start)
3. [Installation](#installation)
4. [Step 1: Create a session on your server](#step-1-create-a-session-on-your-server)
5. [Step 2: Open the widget](#step-2-open-the-widget)
6. [Step 3: Know when the customer is done](#step-3-know-when-the-customer-is-done)
7. [Step 4: Confirm the result on your server](#step-4-confirm-the-result-on-your-server)
8. [Complete example](#complete-example)
9. [API reference](#api-reference)
10. [Modules](#modules)
11. [Testing](#testing)
12. [Errors and troubleshooting](#errors-and-troubleshooting)
13. [Security checklist](#security-checklist)
14. [Migrating from v1](#migrating-from-v1)

---

## How integration works

Every verification takes four steps. Two happen on your server and two in your React app:

| # | Where | What happens |
|---|---|---|
| 1 | **Your server** | Creates a **widget session** with your **secret key**, and returns its `sessionId` to your app |
| 2 | **Your React app** | Calls `open()` from this SDK. The widget opens in a modal with your **public key** and the `sessionId` |
| 3 | **Your React app** | The customer completes the steps. The SDK calls `onStep` as each one finishes, and `onClose` when the modal closes |
| 4 | **Your server** | Reads the session with your secret key to find out what the customer actually completed |

```
 Customer        Your React app            Your server             CreditChek
    │  click "Verify"  │                        │                        │
    │─────────────────▶│  POST /api/session     │                        │
    │                  │───────────────────────▶│  1. create session     │
    │                  │                        │───────────────────────▶│
    │                  │       sessionId        │◀───────────────────────│
    │                  │◀───────────────────────│                        │
    │  2. modal opens (publicKey + sessionId)   │                        │
    │◀─────────────────│                        │                        │
    │  completes steps │  3. onStep … onClose   │                        │
    │─────────────────▶│  GET /api/session/:id  │                        │
    │                  │───────────────────────▶│  4. read session       │
    │                  │                        │───────────────────────▶│
    │                  │   verified: true/false │◀───────────────────────│
    │                  │◀───────────────────────│                        │
```

**Why a server?** Creating and reading sessions needs your secret key, and the secret key must never reach the browser. This SDK runs only in the browser and never touches your secret key.

**How the modal works.** The SDK adds a modal to your page with the widget inside an iframe, and removes it when the customer finishes, cancels, or hits an error screen. It slides up as a full-screen sheet on phones. The customer never leaves your page, and no other window or tab opens.

---

## Before you start

**Keys.** Your keys are on the [CreditChek B2B dashboard](https://app.creditchek.africa/), in the **App** section. Each app has a live and a test pair:

| Key | Where it's used | Keep it secret? |
|---|---|---|
| **Secret key** | Your server only: creating and reading sessions | **Yes.** Never put it in React code, a `VITE_` / `NEXT_PUBLIC_` / `REACT_APP_` variable, or a URL |
| **Public key** | Your React app, passed to the SDK | No, it identifies your business |

Always use a secret key and a public key **from the same app and the same pair** (both live, or both test).

**API base URL** (your server): `https://api.creditchek.africa/v1`

**Your site's security headers.** If your site sends these headers, allow the widget in them:

| Header | What to allow |
|---|---|
| `Content-Security-Policy` | `frame-src https://securedwidget.creditchek.africa` |
| `Permissions-Policy` | `camera=(self "https://securedwidget.creditchek.africa")`, so the liveness step can use the camera |

---

## Installation

The SDK is published to GitHub Packages, so npm needs to know where to find it and needs a GitHub token to download it.

**1. Point the `@creditcliq` scope at GitHub Packages.** Add an `.npmrc` file to the root of your project:

```
@creditcliq:registry=https://npm.pkg.github.com
```

**2. Add a GitHub token.** Create a [personal access token (classic)](https://github.com/settings/tokens) with the `read:packages` scope, and add it to the `.npmrc` in your home directory (`~/.npmrc`), not the one in your project:

```
//npm.pkg.github.com/:_authToken=YOUR_GITHUB_TOKEN
```

In CI, store the token as a secret and write this line before `npm install`.

**3. Install:**

```bash
npm install @creditcliq/react-sdk
# or
yarn add @creditcliq/react-sdk
# or
pnpm add @creditcliq/react-sdk
```

`react` 17 or later is a peer dependency. The SDK has no other dependencies.

---

## Step 1: Create a session on your server

Each verification needs its own widget session. The session records which services the customer must complete, and tracks their progress. Create it when the customer clicks to start: sessions are short-lived.

```http
POST https://api.creditchek.africa/v1/auth/widget-session/token
token: <your secret key>
Content-Type: application/json

{ "services": ["bvn", "liveness"] }
```

| Field | Type | Description |
|---|---|---|
| `services` | `("bvn" \| "nin" \| "liveness")[]` | Services for this verification. Defaults to `["bvn"]` |
| `sessionId` | `string` | Optional. Your own unique ID for the session |

The services decide which identity document the customer uses: `bvn` and `nin` lets them choose, `nin` only means NIN, and otherwise it's BVN.

**Example** (Node.js 18+ with Express; any server language works):

```js
// server.js
import express from "express";

const API_BASE = "https://api.creditchek.africa/v1";
const SECRET_KEY = process.env.CREDITCHEK_SECRET_KEY; // server only

async function creditchek(path, init = {}) {
  const res = await fetch(`${API_BASE}${path}`, {
    ...init,
    headers: { "Content-Type": "application/json", token: SECRET_KEY, ...init.headers },
  });
  const body = await res.json();
  if (!res.ok || !body.success) throw new Error(body.message ?? `CreditChek HTTP ${res.status}`);
  return body.data;
}

const app = express();

app.post("/api/verification/session", async (req, res) => {
  try {
    const session = await creditchek("/auth/widget-session/token", {
      method: "POST",
      body: JSON.stringify({ services: ["bvn", "liveness"] }),
    });
    await saveSessionForCustomer(req, session.sessionId); // your storage
    res.json({ sessionId: session.sessionId });
  } catch {
    res.status(502).json({ error: "Could not start verification" });
  }
});
```

The response `data` looks like this:

```json
{
  "sessionId": "a78e8b61-469b-4ec6-8d1a-5f0ef30d927c",
  "status": "active",
  "services": { "bvn": { "status": "pending" }, "liveness": { "status": "pending" } },
  "expiresAt": "2026-09-09T14:10:00.000Z"
}
```

---

## Step 2: Open the widget

Use the `useCreditChek` hook and call `open` from a click handler:

```jsx
import { useCreditChek } from "@creditcliq/react-sdk";

async function createSession() {
  const res = await fetch("/api/verification/session", { method: "POST" });
  if (!res.ok) throw new Error("Could not start verification");
  return (await res.json()).sessionId;
}

export function VerifyButton() {
  const { open, isOpen } = useCreditChek({
    publicKey: "YOUR_PUBLIC_KEY",
    modules: ["identity", "liveness"],
    onClose: ({ sessionId }) => {
      // Step 3: the customer is done. Ask your server for the result.
    },
  });

  return (
    <button onClick={() => open(createSession)} disabled={isOpen}>
      Verify my identity
    </button>
  );
}
```

**Pass the session as a function** (`open(createSession)`). The modal opens straight away with a loading spinner, calls your function, then loads the widget. If you already have a session ID, `open("the-session-id")` works too.

Prefer a ready-made button? `CreditChekButton` does the same. Any other props go to the `<button>`:

```jsx
import { CreditChekButton } from "@creditcliq/react-sdk";

<CreditChekButton
  publicKey="YOUR_PUBLIC_KEY"
  sessionId={createSession}
  modules={["identity", "liveness"]}
  onClose={({ sessionId }) => checkResult(sessionId)}
  className="btn btn-primary"
>
  Verify my identity
</CreditChekButton>
```

---

## Step 3: Know when the customer is done

The SDK gives you two callbacks:

| Callback | When | Use it for |
|---|---|---|
| `onStep({ module, status })` | Each time a step finishes in the widget | Progress in your UI, analytics |
| `onClose({ sessionId, steps })` | Once, when the widget closes for any reason: the customer finished, hit an error screen, or closed it | Asking your server for the result |

> **The widget closing means "the customer is done", not "the customer passed".** Step events are hints for your UI. Always decide the outcome on your server (Step 4).

If something goes wrong before the widget loads, `onError` fires instead of `onClose`. See [Errors](#errors-and-troubleshooting).

---

## Step 4: Confirm the result on your server

The session is the source of truth:

```http
GET https://api.creditchek.africa/v1/auth/widget-session/<sessionId>
token: <your secret key>
```

```js
// server.js (continued)
app.get("/api/verification/session/:sessionId", async (req, res) => {
  try {
    if (!(await customerOwnsSession(req, req.params.sessionId))) return res.sendStatus(404);
    const session = await creditchek(`/auth/widget-session/${encodeURIComponent(req.params.sessionId)}`);
    const services = Object.values(session.services);
    const verified = services.length > 0 && services.every((s) => s?.status === "completed");
    res.json({ verified, services: session.services });
  } catch {
    res.status(502).json({ error: "Could not read verification" });
  }
});
```

| Field | Value | Meaning |
|---|---|---|
| `services.<name>.status` | `pending` | Not done yet, or the customer left before finishing |
| | `completed` | Verified |
| | `failed` | The last attempt failed. Liveness can be retried in the same session |
| `status` | `active` | Services are still outstanding |
| | `completed` | Every service on the session is completed |

For the name, date of birth and gender behind a completed BVN, call `GET /auth/widget-session/bvn-data/<sessionId>` with your secret key.

---

## Complete example

```jsx
import { useState } from "react";
import { useCreditChek } from "@creditcliq/react-sdk";

export default function Verification({ customer }) {
  const [message, setMessage] = useState("");

  const { open, isOpen, steps } = useCreditChek({
    publicKey: import.meta.env.VITE_CREDITCHEK_PUBLIC_KEY,
    modules: ["identity", "liveness"],
    themeColor: "#0046E6",
    prefill: { firstName: customer.firstName, lastName: customer.lastName },
    onClose: async ({ sessionId }) => {
      setMessage("Checking your result…");
      const result = await fetch(`/api/verification/session/${sessionId}`).then((r) => r.json());
      setMessage(result.verified ? "You're verified." : "Verification isn't complete yet.");
    },
    onError: () => setMessage("Something went wrong. Please try again."),
  });

  const createSession = async () => {
    const res = await fetch("/api/verification/session", { method: "POST" });
    if (!res.ok) throw new Error("Could not start verification");
    return (await res.json()).sessionId;
  };

  return (
    <div>
      <button onClick={() => open(createSession)} disabled={isOpen}>
        Verify my identity
      </button>
      <ul>
        {steps.map((s, i) => (
          <li key={i}>{s.module}: {s.status}</li>
        ))}
      </ul>
      <p>{message}</p>
    </div>
  );
}
```

---

## API reference

### `useCreditChek(options)`

```ts
const { open, close, isOpen, steps, error } = useCreditChek(options);
```

**Options**

| Option | Type | Default | Description |
|---|---|---|---|
| `publicKey` | `string` | **required** | Your public key. Must be from the same app and pair as the secret key that created the session |
| `modules` | `("identity" \| "liveness")[]` | `["identity"]` | Steps to run, in order. See [Modules](#modules) |
| `environment` | `"production" \| "development"` | from your key | `"development"` runs the widget in test mode and shows a Test mode notice. Left out, the widget takes live or test mode from your public key. See [Testing](#testing) |
| `themeColor` | `string` | | Brand colour as hex, with or without `#`. Also colours the modal's loading spinner |
| `prefill` | `WidgetPrefill` | | Details you already hold: `firstName`, `lastName`, `dob` (`YYYY-MM-DD`), `bvn`, `nin`, `email`. Prefilled identity fields are locked in the widget |
| `onStep` | `(event: WidgetStepEvent) => void` | | A step finished |
| `onClose` | `(result: WidgetCloseResult) => void` | | The widget closed |
| `onError` | `(error: CreditChekError) => void` | | The widget couldn't open |

Options are read when `open` is called, so they can change between renders.

**Returns**

| Field | Type | Description |
|---|---|---|
| `open` | `(sessionId: string \| () => string \| Promise<string>) => void` | Opens the widget. If it's already open, focuses it |
| `close` | `() => void` | Closes the widget. `onClose` fires as normal |
| `isOpen` | `boolean` | True from `open` until the widget closes or fails |
| `steps` | `WidgetStepEvent[]` | Step events since the last `open` |
| `error` | `CreditChekError \| null` | The error from the last `open` |

If the component unmounts while the widget is open, the modal is removed and callbacks stop firing.

### `<CreditChekButton />`

Takes every `useCreditChek` option, plus `sessionId` (a string or a function), plus any `<button>` props. `children` defaults to "Verify with CreditChek". An `onClick` prop runs before the widget opens; call `event.preventDefault()` in it to stop the widget opening.

### `openCreditChekWidget(options)`

The same behaviour without React, for use outside components. Takes every `useCreditChek` option plus `sessionId`, and returns a handle:

```ts
const handle = openCreditChekWidget({ publicKey, sessionId: createSession, onClose });
handle.isOpen;   // boolean
handle.focus();  // focus the widget
handle.close();  // close the widget; onClose fires
handle.detach(); // remove the modal without calling onClose
```

Exactly one of `onClose` or `onError` fires for each call.

### `buildWidgetUrl(config, sessionId)`

Returns the full widget URL, if you want to host the widget yourself.

### Types

```ts
type WidgetModule = "identity" | "liveness";

interface WidgetStepEvent {
  module: WidgetModule;
  status: "successful" | "failed";
}

interface WidgetCloseResult {
  sessionId: string;
  steps: WidgetStepEvent[]; // oldest first
}
```

All types are exported from the package.

---

## Modules

| Module | What the customer does | What they need |
|---|---|---|
| `identity` | Enters their name, date of birth and BVN or NIN. At least two name words and the exact date of birth must match the official record | Their 11-digit BVN or NIN |
| `liveness` | Centres their face in the camera, then follows prompts: look left, right, up and down, blink, smile. Their face is matched against the BVN or NIN photo | A camera, good lighting, no glasses or hat |

- **Put `identity` before `liveness`**, in the same session: `modules: ["identity", "liveness"]`. Liveness compares the customer's face with the photo from their BVN or NIN.
- **Completed steps are skipped.** If identity or liveness is already `completed` on the session, the widget skips it. If both are, the customer sees a success screen straight away.

More modules (credit reports, income and Recova mandates) are coming to the React SDK.

---

## Testing

Use the **test** public and secret keys from the App section of the [dashboard](https://app.creditchek.africa/). They work with the same API URL and the same widget as your live keys.

Set `environment` to match the keys, so the widget runs in the right mode:

```jsx
useCreditChek({
  publicKey: import.meta.env.VITE_CREDITCHEK_PUBLIC_KEY,
  environment: import.meta.env.PROD ? "production" : "development",
});
```

`environment` is sent to the widget in its URL. It doesn't change the widget address: both environments use `https://securedwidget.creditchek.africa`.

**Next.js:** the package is marked `"use client"`, so you can import it into App Router client components directly. Keep the session routes in a Route Handler or API route, where the secret key stays on the server.

---

## Errors and troubleshooting

**`CreditChekError` codes** (passed to `onError` and stored in `error`):

| Code | Cause | Fix |
|---|---|---|
| `session_failed` | Your `sessionId` function threw or returned nothing | Check your server route. The widget is closed for you |
| `invalid_config` | `publicKey` is missing or `modules` is empty | Fix the options |

**Error screens inside the widget.** If the widget can't start, the customer sees an error screen with a code and their session ID. Closing it closes the widget, so `onClose` fires.

| Code on screen | Cause | Fix |
|---|---|---|
| `missing` / `invalid` | No session, or it doesn't exist | Pass the `sessionId` from Step 1 unmodified |
| `expired` | The session expired | Create the session when the customer clicks, not in advance |
| `inactive` | The session was already completed | Create a new session for each verification |
| `mismatch` | Session and public key are from different apps | Use the secret and public keys of the **same** app |
| `validate-public-key` | The public key is invalid | Check the key, and that it's from the same live or test pair as the secret key |

**Common problems**

| Symptom | Likely cause |
|---|---|
| The modal stays blank | Your `Content-Security-Policy` blocks the widget. Add it to `frame-src` |
| The camera doesn't start | The customer denied camera access, or your `Permissions-Policy` blocks the camera for the widget |
| The camera doesn't start inside Instagram, WhatsApp or similar apps | Their in-app browsers often block the camera. Ask the customer to open your site in their browser |
| Liveness can't match the face | `liveness` ran without `identity` before it in the same session |
| Your server shows `pending` | The customer closed the widget before finishing |

---

## Security checklist

- [ ] The secret key lives only on your server.
- [ ] You create one session per verification, when the customer starts.
- [ ] Your server stores each `sessionId` against its customer, and only reports a session's result to that customer.
- [ ] You decide "verified" on your server from `GET /auth/widget-session/:sessionId`, never from `onStep` or `onClose` alone.
- [ ] Your pages are served over HTTPS in production.

---

## Migrating from v1

v2 follows the new session-based widget, which needs a `sessionId` created by your server.

| v1 | v2 |
|---|---|
| `import creditchekSDK from "creditchek-react-sdk"` | `import { useCreditChek } from "@creditcliq/react-sdk"` |
| `creditchekSDK.open({ publicKey, module, onComplete, onClose })` | `const { open } = useCreditChek({ publicKey, modules, onStep, onClose })`, then `open(sessionId)` |
| `module: ["identity"]` | `modules: ["identity"]` or `["identity", "liveness"]` |
| `"income"`, `"credit"`, `"recova"` modules | Not available in v2 yet |
| `onComplete(result)` for each step | `onStep({ module, status })` |
| `onClose()` | `onClose({ sessionId, steps })` |
| Opens a new tab | Opens a modal on your page |
| No server needed | Your server creates and reads sessions ([Step 1](#step-1-create-a-session-on-your-server), [Step 4](#step-4-confirm-the-result-on-your-server)) |

---

## Support

For help with this library, open an issue on the [GitHub repo](https://github.com/creditcliq/approval-web/issues) or email [support@creditchek.africa](mailto:support@creditchek.africa).
