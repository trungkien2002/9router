// Long native Gemini tool turns may legitimately prefill/plan for longer than
// the generic 60s header deadline. Preserve their output budget and abort signal.
export function antigravityHeadersTimeout(model, body, defaultTimeoutMs, override) {
  const request = body?.request;
  if (!String(model).startsWith('gemini-') ||
      !(request?.generationConfig?.maxOutputTokens > 8192) ||
      !Array.isArray(request.contents) || request.contents.length < 32) return defaultTimeoutMs;
  let toolParts = 0;
  for (const content of request.contents) {
    for (const part of content.parts || []) {
      if (part.functionCall || part.functionResponse) toolParts++;
    }
  }
  if (toolParts < 16) return defaultTimeoutMs;
  const value = Number(override);
  if (override !== undefined && value === 0) return defaultTimeoutMs;
  const configured = Number.isInteger(value) && value > 0 ? value : 200000;
  return Math.max(defaultTimeoutMs, configured);
}
