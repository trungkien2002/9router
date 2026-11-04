import https from "node:https";
import { Readable } from "node:stream";

// Pin only DNS resolution; retain the original Host, SNI and public-CA checks.
// Node's request signal cancels TCP/TLS, header wait AND the response stream.
export function createBypassRequest(parsedUrl, realIP, options = {}) {
  options.signal?.throwIfAborted();
  return new Promise((resolve, reject) => {
    const req = https.request({
      hostname: parsedUrl.hostname,
      port: parsedUrl.port || 443,
      servername: parsedUrl.hostname,
      path: parsedUrl.pathname + parsedUrl.search,
      method: options.method || "POST",
      headers: { ...options.headers, Host: parsedUrl.host },
      agent: false,
      signal: options.signal,
      lookup: (_hostname, lookupOptions, callback) => {
        const family = realIP.includes(":") ? 6 : 4;
        if (lookupOptions?.all) callback(null, [{ address: realIP, family }]);
        else callback(null, realIP, family);
      },
    }, res => {
      const response = {
        ok: res.statusCode >= 200 && res.statusCode < 300,
        status: res.statusCode,
        statusText: res.statusMessage,
        headers: new Map(Object.entries(res.headers)),
        body: Readable.toWeb(res),
        text: async () => {
          const chunks = [];
          for await (const chunk of res) chunks.push(chunk);
          return Buffer.concat(chunks).toString();
        },
        json: async () => JSON.parse(await response.text()),
      };
      resolve(response);
    });
    req.on("error", reject);
    try {
      if (options.body) req.write(typeof options.body === "string" ? options.body : JSON.stringify(options.body));
      req.end();
    } catch (error) {
      req.destroy();
      reject(error);
    }
  });
}
