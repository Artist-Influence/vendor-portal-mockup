// Portable static server for the mockup. Run from this folder: `bun serve.js`
// (or just open index.html directly — no server required).
import { dirname } from "path";
import { fileURLToPath } from "url";
const dir = dirname(fileURLToPath(import.meta.url));
Bun.serve({
  port: 8123,
  hostname: "127.0.0.1",
  async fetch(req) {
    let p = new URL(req.url).pathname;
    if (p === "/" || p === "") p = "/index.html";
    const f = Bun.file(dir + p);
    if (await f.exists()) return new Response(f);
    return new Response("Not found", { status: 404 });
  },
});
console.log("vendor-portal-mockup on http://127.0.0.1:8123");
