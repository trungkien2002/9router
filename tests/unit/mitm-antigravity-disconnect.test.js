import { it, expect } from "vitest";
import http from "node:http";
import { once } from "node:events";
import { createRequire } from "node:module";
const require=createRequire(import.meta.url);
it("closes the real gateway HTTP connection when the IDE disconnects before headers",async()=>{
  const sockets=new Set();let arrived;const received=new Promise(r=>arrived=r);let lost;const disconnected=new Promise(r=>lost=r);
  const gateway=http.createServer((_req,res)=>{res.on("close",()=>{if(!res.writableEnded)lost();});arrived();});
  gateway.on("connection",s=>{sockets.add(s);s.on("close",()=>sockets.delete(s));});
  gateway.listen(0,"127.0.0.1");await once(gateway,"listening");
  const old=process.env.MITM_ROUTER_BASE;process.env.MITM_ROUTER_BASE=`http://127.0.0.1:${gateway.address().port}`;
  const {intercept}=require("../../src/mitm/handlers/antigravity.js");
  const mitm=http.createServer((req,res)=>{const chunks=[];req.on("data",c=>chunks.push(c));req.on("end",()=>{void intercept(req,res,Buffer.concat(chunks),"ag/gemini-3.8-flash-medium");});});
  mitm.on("connection",s=>{sockets.add(s);s.on("close",()=>sockets.delete(s));});
  mitm.listen(0,"127.0.0.1");await once(mitm,"listening");
  let timer;
  try {
    const client=http.request({host:"127.0.0.1",port:mitm.address().port,path:"/v1internal:streamGenerateContent",method:"POST"});client.on("error",()=>{});client.end('{"model":"gemini-3.8-flash-medium","request":{"contents":[]}}');
    await received;client.destroy();
    await Promise.race([disconnected,new Promise((_,reject)=>{timer=setTimeout(()=>reject(new Error("gateway kept waiting after IDE disconnect")),1500);})]);
    expect(true).toBe(true);
  } finally {
    clearTimeout(timer);if(old===undefined)delete process.env.MITM_ROUTER_BASE;else process.env.MITM_ROUTER_BASE=old;
    for(const s of sockets)s.destroy();await Promise.all([gateway,mitm].map(s=>new Promise(r=>s.close(r))));
  }
});
