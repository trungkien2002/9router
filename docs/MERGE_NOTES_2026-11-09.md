# Fork update: upstream 0.5.116 with local fixes

The fork was first synchronized with the latest corrected local source in commit `3acaebcd`, retaining the long Antigravity prefill deadline without the rejected output-token cap. This merge then integrates upstream `1339107e` (tag `v0.5.116`).

The merged source preserves upstream features and fixes, including keep-alive recovery, Undici 8 transport, Gemini tool-result handling, Argon quota tracking and launcher changes. It also retains the fork's client-abort propagation, cancellable retry delays, DNS/HTTPS bypass cancellation and TLS hostname validation, strict Antigravity model mapping, one header deadline per Antigravity account, immediate capacity-refusal fallback, and the configurable extended deadline for long Gemini tool turns.

Git reported no textual conflicts. One upstream test expected a fetch attempt even when the caller had already aborted. It now verifies the fork's pre-dispatch abort and separately verifies that a locked streaming body is never replayed.

Validation: 493 tests passed across 48 selected regression files, zero failures. One pre-existing upstream TODO remains in OpenCode Go Responses/DeepSeek reasoning injection; it is not a passing test. The Next.js production build passed, the standalone server returned health HTTP200 with an isolated data directory and loopback port, and the MITM bundle compiled and passed Node syntax validation. No real-provider inference or installed-app deployment was performed for this merge.

This is a source/fork synchronization. The installed application is a separate deployment and must not be described as upgraded solely because this merge was pushed. Account data, credentials, private logs and machine backups are excluded from the commits.
