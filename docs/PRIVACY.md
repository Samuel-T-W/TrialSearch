# Privacy

Patient data never leaves the device. This is enforced by the architecture, not a promise.

```
build time:  ClinicalTrials.gov -> LLM (public trial text only) -> static JSON
run time:    phone downloads the same static files as everyone else
             profile -> matcher (JS on the phone) -> results
```

## What the LLM sees

Only public trial text from ClinicalTrials.gov, at build time.
No patient input is ever sent to any model.

## What the server sees

A static host serving identical files to every visitor.
It learns only that someone loaded the site, and which language bundle.

## How it is enforced

- Content Security Policy (`vercel.json` and a meta tag): `connect-src 'self'`, no third-party scripts, fonts, or analytics. The browser blocks any attempt to send data elsewhere.
- `Referrer-Policy: no-referrer`; `Permissions-Policy` disables camera, microphone, geolocation.
- Service worker precaches the app and data, so it works in airplane mode.
- `web/tests/network-audit.spec.ts` fails if any request is made after load, or if any URL or body contains the ZIP, age, or a condition id.

## Saved profile (optional)

Off by default. When on, the profile is stored in IndexedDB, encrypted with AES-GCM using a non-extractable WebCrypto key.
"Delete my data" erases both.

## Verify it yourself

1. Open the site once.
2. Turn on airplane mode.
3. Run a full search. It still works, because nothing needs the network.
