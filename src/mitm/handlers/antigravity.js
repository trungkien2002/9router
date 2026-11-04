const { err, createResponseDumper } = require("../logger");
const { IS_DEV } = require("../config");
const { fetchRouter, pipeSSE } = require("./base");

/**
 * Intercept Antigravity request — forward Gemini body as-is to /v1/chat/completions.
 * Router auto-detects format via body.userAgent==="antigravity" + body.request.contents,
 * runs antigravity→openai→provider→openai→antigravity translators internally.
 */
async function intercept(req, res, bodyBuffer, mappedModel) {
  const dumper = IS_DEV ? createResponseDumper(req, "intercept-antigravity") : null;
  const isStream = req.url.includes(":streamGenerateContent");
  const controller = new AbortController();
  const onAbort = () => controller.abort();
  const onClose = () => { if (!res.writableEnded) onAbort(); };
  req.once("aborted", onAbort);
  res.once("close", onClose);
  if (req.aborted || res.destroyed) onAbort();
  try {
    const body = JSON.parse(bodyBuffer.toString());
    body.model = mappedModel;

    const routerRes = await fetchRouter(body, "/v1/chat/completions", req.headers, controller.signal);
    await pipeSSE(routerRes, res, dumper);
  } catch (error) {
    if (controller.signal.aborted || res.destroyed) return;
    err(`[antigravity] ${error.message}`);
    if (dumper) { dumper.writeChunk(`\n[ERROR] ${error.message}\n`); dumper.end(); }
    // For stream endpoint, send SSE error chunk so SDK doesn't hang waiting
    if (isStream) {
      if (!res.headersSent) res.writeHead(200, { "Content-Type": "text/event-stream" });
      res.end(`data: ${JSON.stringify({ error: { message: error.message } })}\r\n\r\n`);
    } else {
      if (!res.headersSent) res.writeHead(500, { "Content-Type": "application/json" });
      res.end(JSON.stringify({ error: { message: error.message, type: "mitm_error" } }));
    }
  } finally {
    req.removeListener("aborted", onAbort);
    res.removeListener("close", onClose);
  }
}

module.exports = { intercept };
