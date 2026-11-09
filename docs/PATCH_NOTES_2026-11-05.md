# Local patch 20261105-agent-prefill-timeout

## Trigger and evidence
A long Antigravity Gemini tool turn exceeded the generic 60-second response-header deadline. A full replay retaining the 64,000-token budget completed in 96.1 seconds, with verified TLS/upload in 80ms, headers at 95.9 seconds, 13,518 candidate tokens, one complete function call and finish reason STOP. Thus the generic deadline could abort valid long generation and cause another account to start over. This does not establish Google's internal queueing mechanism or promise that every slow account will recover.

## Change
For Gemini requests containing at least 32 content entries, at least 16 function-call/function-response parts, and an output budget above 8,192 tokens, use a 200-second response-header deadline. Keep the generic deadline for other requests. Preserve output budget, input history, model identity, thinking level and immediate client cancellation. An account still gets only one header deadline before fallback; retries do not multiply that wait on the same account.

`ANTIGRAVITY_AGENT_HEADERS_TIMEOUT_MS` changes the long-turn deadline; `0` disables the extension. Invalid/negative values use 200,000ms. A positive override never shortens the base deadline. The attempted output-budget cap was rejected: a complete live test at 8,192 finished MAX_TOKENS with thinking only and no usable text/function call. That cap is absent from the final patch.

## Validation
- 96 regression tests passed across the prior latency/model-identity suite plus the new prefill tests, including headers after 61 seconds and cancellation during the extended wait.
- Next.js 16.4.4 production build passed; isolated standalone health HTTP200.
- Pre-change real gateway and MITM probes both completed with OK; the MITM sample's 52-second wait belonged to Priority20's upstream call rather than local forwarding.
- Exception requestDetails contain the pre-executor body; successful records contain the final body. Differences in tool grouping and the 65,536 versus 64,000 cap between those records alone are not evidence of inconsistent dispatch.

The patch retains the earlier cancellation, retry and strict model-identity fixes. No npm release or GitHub push is implied by applying the local patch.
