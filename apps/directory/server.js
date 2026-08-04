// Zero-dep static file server for the built Vite output.
// Serves dist/ with SPA fallback to index.html.
// Heroku sets PORT; locally defaults to 4173.
import { createServer } from "node:http";
import { readFile } from "node:fs/promises";
import { extname, join, normalize, resolve, sep } from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = resolve(fileURLToPath(new URL("./dist", import.meta.url)));
const PORT = Number(process.env.PORT) || 4173;

const MIME = {
  ".html": "text/html; charset=utf-8",
  ".js": "application/javascript; charset=utf-8",
  ".mjs": "application/javascript; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".svg": "image/svg+xml",
  ".png": "image/png",
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".ico": "image/x-icon",
  ".woff": "font/woff",
  ".woff2": "font/woff2",
};

async function tryReadFile(abs) {
  try {
    return await readFile(abs);
  } catch (err) {
    if (err.code === "ENOENT" || err.code === "EISDIR") return null;
    throw err;
  }
}

const server = createServer(async (req, res) => {
  try {
    const urlPath = decodeURIComponent(new URL(req.url, "http://localhost").pathname);
    const rel = normalize(urlPath === "/" ? "/index.html" : urlPath).replace(/^([/\\])+/, "");
    const abs = resolve(join(ROOT, rel));
    if (!abs.startsWith(ROOT + sep) && abs !== ROOT) {
      res.writeHead(403).end("Forbidden");
      return;
    }
    let body = await tryReadFile(abs);
    let ext = extname(abs).toLowerCase();
    if (!body) {
      // SPA fallback: serve index.html for unknown paths without a file extension.
      if (!ext) {
        body = await tryReadFile(join(ROOT, "index.html"));
        ext = ".html";
      }
    }
    if (!body) {
      res.writeHead(404, { "Content-Type": "text/plain; charset=utf-8" }).end("Not Found");
      return;
    }
    res.writeHead(200, {
      "Content-Type": MIME[ext] ?? "application/octet-stream",
      "Cache-Control": ext === ".html" ? "no-cache" : "public, max-age=31536000, immutable",
    });
    res.end(body);
  } catch (err) {
    res.writeHead(500, { "Content-Type": "text/plain; charset=utf-8" }).end("Server Error");
    console.error(err);
  }
});

server.listen(PORT, () => {
  console.log(`directory listening on http://localhost:${PORT}`);
});
