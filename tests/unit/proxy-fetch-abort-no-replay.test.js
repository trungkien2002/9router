import { it, expect, vi } from "vitest";
const fixture=vi.hoisted(()=>({fetch:vi.fn(),onResolve:null,onCancel:vi.fn()}));
vi.stubGlobal("fetch",fixture.fetch);
vi.mock("dns",()=>({Resolver:class {
  setServers(){}
  resolve4(_name,callback){this.callback=callback;fixture.onResolve?.();}
  cancel(){fixture.onCancel();this.callback(Object.assign(new Error("cancelled"),{code:"ECANCELLED"}));}
}}));
const {proxyAwareFetch}=await import("../../open-sse/utils/proxyFetch.js");
it("cancels in-flight DNS and never replays against system DNS after abort",async()=>{
  const c=new AbortController();const reason=new Error("client stopped");
  fixture.onResolve=()=>queueMicrotask(()=>c.abort(reason));
  await expect(proxyAwareFetch("https://daily-cloudcode-pa.googleapis.com/v1internal:streamGenerateContent",{signal:c.signal})).rejects.toBe(reason);
  expect(fixture.onCancel).toHaveBeenCalledTimes(1);expect(fixture.fetch).not.toHaveBeenCalled();
});
