# Local patch: request cancellation and Antigravity model identity

Base: 9Router 0.5.112. This patch does not change the package version.

## Changes

- Propagate client cancellation from Antigravity MITM through the gateway handler, stream controller and executor. Cancel DNS lookup, HTTPS connection/header/body waits and retry backoff. Do not dispatch another account after client cancellation.
- Keep DNS bypass pinned to the resolved IP while preserving Host, SNI and certificate hostname verification.
- Distinguish an internal response-header timeout from a client cancellation. Antigravity hands a full header timeout or an explicit model-capacity refusal back to account fallback instead of repeating the same slow attempt on that connection. Other providers retain their retry policies.
- Use exact, synonym and legacy exact Antigravity MITM mappings. Unknown variants stay native instead of being matched to a different model through a broad prefix or flash pattern. Read the thinking level of base/tiered Flash requests.
- Log model routing metadata without request bodies or authorization headers. Clear stream timers/listeners when the caller disconnects.
- Close and isolate SQLite fixtures before removing them on Windows.

## Validation

93 tests passed across 14 targeted test files on Windows, including real loopback TCP/TLS and HTTP cancellation tests. Production build passed with Next.js 16.4.4, an isolated data/profile directory and a temporary 6 GiB Node heap limit. Standalone health/auth checks and live gateway/MITM smoke requests passed.

This is not a full repository test run or a macOS runtime validation. Upstream capacity, account-specific latency and large-context inference can still cause slow requests. The patch does not lower thinking levels, truncate conversation history, disable accounts or rewrite upstream model-version metadata.
