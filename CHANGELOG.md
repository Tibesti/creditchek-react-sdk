# Changelog

## 2.0.0

Rewritten for the session-based CreditChek widget. See "Migrating from v1" in the README.

- New `useCreditChek` hook and `CreditChekButton` component.
- New `openCreditChekWidget` for use outside React components.
- The widget opens in a modal on your page, with an iframe, a loading state and enter/exit transitions. It becomes a full-screen sheet on phones. No other window or tab opens.
- Requires a `sessionId` created by your server with your secret key. `open` also accepts a function that creates the session on click.
- `onStep` reports each finished step; `onClose` reports the session ID and the steps once the widget closes; `onError` reports a failed session or invalid options.
- Only messages from the widget's frame or window, and its origin, are accepted. The widget is told this page's origin, so it addresses its messages to this page only.
- Supports the `identity` and `liveness` modules. Credit, income and Recova are coming later.
- Options: `publicKey`, `modules`, `environment`, `themeColor`, `prefill`, `widgetUrl`.
- `environment` (`"production"` or `"development"`) is passed to the widget as a URL parameter. Both environments use `https://securedwidget.creditchek.africa`; the development widget address is no longer used.
- `WIDGET_URL` exports the widget address.
- ESM and CommonJS builds with TypeScript types. Marked `"use client"` for Next.js. React is now a peer dependency (17+).
- Removed the default `creditchekSDK` export, and the `module`, `onComplete` and `postMessageParam` options.

## 1.0.1

- Initial public release.
