import { describe, it, expect, vi } from "vitest";
import { getEventListeners } from "node:events";
import { createStreamController, pipeWithDisconnect } from "../../open-sse/utils/streamHandler.js";
import { abortableDelay } from "../../open-sse/utils/abortableDelay.js";

describe("caller cancellation", () => {
  it("aborts header wait immediately and releases the callback once", () => {
    const caller=new AbortController();const onDisconnect=vi.fn();
    const stream=createStreamController({clientSignal:caller.signal,onDisconnect});
    caller.abort(new Error("cancel"));
    expect(stream.signal.aborted).toBe(true);expect(onDisconnect).toHaveBeenCalledTimes(1);
    stream.handleComplete();expect(getEventListeners(caller.signal,"abort")).toHaveLength(0);
  });
  it("honors already-aborted requests", () => {
    const caller=new AbortController();caller.abort();
    expect(createStreamController({clientSignal:caller.signal}).signal.aborted).toBe(true);
  });
  it("detaches after normal completion and errors", () => {
    for (const finish of [s=>s.handleComplete(),s=>s.handleError(new DOMException("aborted","AbortError"))]) {
      const c=new AbortController();const s=createStreamController({clientSignal:c.signal});finish(s);
      expect(getEventListeners(c.signal,"abort")).toHaveLength(0);c.abort();expect(s.signal.aborted).toBe(false);
    }
  });
  it("interrupts retry backoff and removes its listener", async () => {
    const c=new AbortController();const reason=new Error("stop");
    const wait=abortableDelay(60_000,c.signal);c.abort(reason);
    await expect(wait).rejects.toBe(reason);expect(getEventListeners(c.signal,"abort")).toHaveLength(0);
  });
  it("clears a stalled stream timer even when the client stops pulling", async () => {
    vi.useFakeTimers();
    try {
      const caller=new AbortController();const stream=createStreamController({clientSignal:caller.signal});
      const provider=new Response(new ReadableStream({start(){}}));
      const body=pipeWithDisconnect(provider,new TransformStream(),stream,null,60_000);
      expect(vi.getTimerCount()).toBe(1);caller.abort();expect(vi.getTimerCount()).toBe(0);
      await body.cancel();
    } finally { vi.useRealTimers(); }
  });
});
