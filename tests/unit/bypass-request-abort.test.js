import { describe, it, expect, vi, afterEach } from "vitest";
import https from "node:https";
import net from "node:net";
import { once } from "node:events";
import { createRequire } from "node:module";
import { createBypassRequest } from "../../open-sse/utils/bypassRequest.js";
const require=createRequire(import.meta.url);
const forge=require("node-forge");
const keys=forge.pki.rsa.generateKeyPair(2048);const cert=forge.pki.createCertificate();
cert.publicKey=keys.publicKey;cert.serialNumber="01";cert.validity.notBefore=new Date(Date.now()-60_000);cert.validity.notAfter=new Date(Date.now()+3600_000);
cert.setSubject([{name:"commonName",value:"router.test"}]);cert.setIssuer(cert.subject.attributes);
cert.setExtensions([{name:"basicConstraints",cA:true},{name:"subjectAltName",altNames:[{type:2,value:"router.test"}]}]);cert.sign(keys.privateKey,forge.md.sha256.create());
const pem=forge.pki.certificateToPem(cert);const key=forge.pki.privateKeyToPem(keys.privateKey);
const servers=[];const sockets=new Set();
async function listen(server){servers.push(server);server.on("connection",s=>{sockets.add(s);s.on("close",()=>sockets.delete(s));});server.listen(0,"127.0.0.1");await once(server,"listening");return server.address().port;}
afterEach(async()=>{vi.restoreAllMocks();for(const s of sockets)s.destroy();await Promise.all(servers.splice(0).map(s=>new Promise(r=>s.close(r))));});
function trustFixture(){const original=https.request;vi.spyOn(https,"request").mockImplementation((opts,cb)=>original({...opts,ca:pem},cb));}
describe("DNS bypass uses a cancellable real socket",()=>{
 it("aborts TLS/header wait and closes the actual connection",async()=>{
  let accepted;const connected=new Promise(r=>accepted=r);let closed;const gone=new Promise(r=>closed=r);
  const port=await listen(net.createServer(socket=>{socket.on("data",()=>{});socket.on("close",closed);accepted();}));
  const c=new AbortController();const pending=createBypassRequest(new URL(`https://router.test:${port}/`),"127.0.0.1",{signal:c.signal});
  await connected;c.abort();await expect(pending).rejects.toMatchObject({name:"AbortError"});
  await Promise.race([gone,new Promise((_,reject)=>setTimeout(()=>reject(new Error("socket stayed open")),1000))]);
 });
 it("does not connect for an already-aborted request",async()=>{
  const c=new AbortController();c.abort();const spy=vi.spyOn(https,"request");
  expect(()=>createBypassRequest(new URL("https://router.test"),"127.0.0.1",{signal:c.signal})).toThrow();expect(spy).not.toHaveBeenCalled();
 });
 it("preserves SNI, Host, POST body and response streaming over pinned DNS",async()=>{
  trustFixture();let received;
  const port=await listen(https.createServer({key,cert:pem},(req,res)=>{let body="";req.on("data",x=>body+=x);req.on("end",()=>{received={host:req.headers.host,sni:req.socket.servername,body};res.writeHead(200,{"content-type":"text/event-stream"});res.end("data: OK\n\n");});}));
  const response=await createBypassRequest(new URL(`https://router.test:${port}/chat`),"127.0.0.1",{method:"POST",body:"fixture"});
  expect(await response.text()).toBe("data: OK\n\n");expect(received).toEqual({host:`router.test:${port}`,sni:"router.test",body:"fixture"});
 });
 it("cancels a stalled body after headers have arrived",async()=>{
  trustFixture();const port=await listen(https.createServer({key,cert:pem},(_req,res)=>{res.writeHead(200);res.write("first");}));
  const c=new AbortController();const response=await createBypassRequest(new URL(`https://router.test:${port}/`),"127.0.0.1",{signal:c.signal});
  const reader=response.body.getReader();await reader.read();c.abort();await expect(reader.read()).rejects.toBeDefined();
 });
 it("continues to reject a certificate for the wrong hostname",async()=>{
  trustFixture();const port=await listen(https.createServer({key,cert:pem},(_req,res)=>res.end("unexpected")));
  await expect(createBypassRequest(new URL(`https://wrong.test:${port}/`),"127.0.0.1")).rejects.toMatchObject({code:"ERR_TLS_CERT_ALTNAME_INVALID"});
 });
});
