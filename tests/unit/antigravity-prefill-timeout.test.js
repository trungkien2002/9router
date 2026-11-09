import { describe, it, expect, vi, afterEach } from 'vitest';
import { antigravityHeadersTimeout } from '../../open-sse/utils/antigravityPrefillTimeout.js';
vi.mock('../../open-sse/services/thoughtSignatureStore.js',()=>({getGeminiThoughtSignatureSync:()=>null}));
const fetchMock=vi.fn();
vi.mock('../../open-sse/utils/proxyFetch.js',()=>({proxyAwareFetch:(...args)=>fetchMock(...args)}));
const { AntigravityExecutor }=await import('../../open-sse/executors/antigravity.js');
const body=()=>({model:'gemini-3.8-flash-medium',request:{sessionId:'123',generationConfig:{maxOutputTokens:64000,thinkingConfig:{thinkingLevel:'MEDIUM'}},contents:Array.from({length:40},(_,i)=>({role:i%2?'user':'model',parts:i%2?[{functionResponse:{name:'read_file',response:{output:'synthetic'}}}]:[{functionCall:{name:'read_file',args:{}},thoughtSignature:'synthetic'}]}))}});
afterEach(()=>{vi.useRealTimers();vi.unstubAllEnvs();fetchMock.mockReset();});
describe('Antigravity long tool prefill deadline',()=>{
 it('extends only large Gemini tool turns and keeps overrides bounded by the base deadline',()=>{
  expect(antigravityHeadersTimeout(body().model,body(),60000)).toBe(200000);
  expect(antigravityHeadersTimeout(body().model,body(),60000,'120000')).toBe(120000);
  expect(antigravityHeadersTimeout(body().model,body(),60000,'1')).toBe(60000);
  expect(antigravityHeadersTimeout(body().model,body(),60000,'0')).toBe(60000);
  expect(antigravityHeadersTimeout(body().model,body(),60000,'invalid')).toBe(200000);
  expect(antigravityHeadersTimeout('claude-sonnet-4-6',body(),60000)).toBe(60000);
  const short=body();short.request.contents=short.request.contents.slice(0,4);
  expect(antigravityHeadersTimeout(short.model,short,60000)).toBe(60000);
  const small=body();small.request.generationConfig.maxOutputTokens=8192;
  expect(antigravityHeadersTimeout(small.model,small,60000)).toBe(60000);
 });
 it('allows a real executor dispatch to receive headers after the generic deadline without cutting output',async()=>{
  vi.useFakeTimers();let sent;
  fetchMock.mockImplementation((_url,options)=>{sent=JSON.parse(options.body);return new Promise(resolve=>setTimeout(()=>resolve({status:200,headers:{get:()=>null}}),61000));});
  const executor=new AntigravityExecutor();
  const pending=executor.execute({model:body().model,body:body(),stream:true,credentials:{projectId:'synthetic',accessToken:'synthetic'}});
  await vi.advanceTimersByTimeAsync(61000);
  expect((await pending).response.status).toBe(200);
  expect(sent.request.generationConfig.maxOutputTokens).toBe(64000);
  expect(sent.request.generationConfig.thinkingConfig.thinkingLevel).toBe('MEDIUM');
 });
 it('still cancels immediately when the client disconnects during extended prefill',async()=>{
  const client=new AbortController();
  fetchMock.mockImplementation((_url,{signal})=>new Promise((_,reject)=>signal.addEventListener('abort',()=>reject(signal.reason),{once:true})));
  const pending=new AntigravityExecutor().execute({model:body().model,body:body(),stream:true,credentials:{projectId:'synthetic'},signal:client.signal});
  const assertion=expect(pending).rejects.toThrow('client stopped');
  client.abort(new Error('client stopped'));await assertion;
  expect(fetchMock).toHaveBeenCalledTimes(1);
 });
});
