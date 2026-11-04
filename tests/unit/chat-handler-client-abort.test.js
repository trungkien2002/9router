// Research reproducer: actual handler function bodies; all imported dependencies
// replaced with in-memory fixtures. No module imports from the application, DB,
// server startup, network, production account or environment credential reads.
import fs from 'node:fs';
import vm from 'node:vm';
import crypto from 'node:crypto';
import assert from 'node:assert/strict';
import { it } from 'vitest';
it('stops fallback after cancellation (dependency-stub handler harness)',async()=>{
const path=new URL('../../src/sse/handlers/chat.js',import.meta.url);
const raw=fs.readFileSync(path,'utf8');
const body=raw.slice(raw.indexOf('export async function handleChat(')).replace('export async function handleChat(', 'async function handleChat(');
assert.ok(body.startsWith('async function handleChat('));
const cases=[];
for (const mode of ['already_aborted','abort_while_first_core_is_pending']) {
  const controller=new AbortController();
  const calls=[];
  const log=new Proxy({}, {get:()=>()=>{}});
  const accountIds=['fixture-A','fixture-B'];
  const context=vm.createContext({URL,Response,console:{log(){},warn(){},error(){}},Set,Date,Promise,
    log,HTTP_STATUS:{BAD_REQUEST:400,UNAUTHORIZED:401,FORBIDDEN:403,NOT_FOUND:404,SERVICE_UNAVAILABLE:503},
    DEFAULT_HEADROOM_URL:'http://fixture.invalid',appendPxpipeEvent(){},
    stripModelContextMarker:model=>({model,contextMarker:null}),resolveSessionIdentity:()=>null,
    extractApiKey:()=>null,getSettings:async()=>({requireApiKey:false}),isValidApiKey:async()=>true,
    getKeyAccessContext:async()=>null,enforceKeyAccess:async()=>null,
    handleBypassRequest:()=>null,detectRequiredCapabilities:()=>new Set(),getComboModels:async()=>null,
    augmentModelsWithCapacityAdapter:models=>models,filterAdapterModels:async(_ctx,models)=>models,
    getModelInfo:async()=>({provider:'fixture',model:'model'}),
    getProviderCredentials:async(_provider,excluded)=>{
      const id=accountIds.find(id=>!excluded.has(id));
      return id?{connectionId:id,connectionName:id,providerSpecificData:{}}:null;
    },
    checkAndRefreshToken:async(_provider,credentials)=>credentials,
    detectFormatByEndpoint:()=> 'openai',
    markAccountUnavailable:async()=>({shouldFallback:true}),
    upstreamResponseHeaders:()=>({}),
    errorResponse:(status,message)=>new Response(JSON.stringify({error:{message}}),{status}),
    unavailableResponse:(status,message)=>new Response(JSON.stringify({error:{message}}),{status}),
    handleChatCore:async options=>{
      calls.push({connectionId:options.connectionId,caller_signal_already_aborted:controller.signal.aborted,
        receives_top_level_signal:options.signal instanceof AbortSignal,
        receives_client_raw_signal:options.clientRawRequest?.signal instanceof AbortSignal,
        client_raw_keys:Object.keys(options.clientRawRequest??{}).sort()});
      if(calls.length===1){
        if(mode==='abort_while_first_core_is_pending')controller.abort(new Error('fixture client cancelled'));
        await new Promise(resolve=>setTimeout(resolve,25));
        return{success:false,status:503,error:'fixture unavailable',response:new Response('',{status:503})};
      }
      return{success:true,response:new Response('OK',{status:200})};
    },
  });
  vm.runInContext(body+'\nglobalThis.__fixtureHandle=handleChat;',context,{timeout:1000});
  const request=new Request('http://fixture.invalid/v1/chat/completions',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({model:'fixture/model',messages:[{role:'user',content:'fixture'}],stream:true}),signal:controller.signal});
  if(mode==='already_aborted')controller.abort(new Error('fixture already cancelled'));
  const response=await context.__fixtureHandle(request);
  assert.equal(calls.length,mode==='already_aborted'?0:1);assert.equal(response.status,499);
  assert.ok(calls.every(c=>c.receives_client_raw_signal));

  cases.push({mode,request_aborted:request.signal.aborted,dispatch_count:calls.length,response_status:response.status,calls});
}

});
