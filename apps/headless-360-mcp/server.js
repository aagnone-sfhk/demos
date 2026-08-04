// Zero-dep static file server. Serves index.html and vendored assets.
// Heroku sets PORT; locally defaults to 5173.
import { createServer } from "node:http";
import { readFile } from "node:fs/promises";
import { extname, join, normalize, resolve, sep } from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = resolve(fileURLToPath(new URL(".", import.meta.url)));
const PORT = Number(process.env.PORT) || 5173;

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

const server = createServer(async (req, res) => {
  try {
    // Normalize and prevent path traversal outside ROOT.
    const urlPath = decodeURIComponent(new URL(req.url, "http://localhost").pathname);
    const rel = normalize(urlPath === "/" ? "/index.html" : urlPath).replace(/^([/\\])+/, "");
    const abs = resolve(join(ROOT, rel));
    if (!abs.startsWith(ROOT + sep) && abs !== ROOT) {
      res.writeHead(403).end("Forbidden");
      return;
    }
    const body = await readFile(abs);
    res.writeHead(200, {
      "Content-Type": MIME[extname(abs).toLowerCase()] ?? "application/octet-stream",
      "Cache-Control": "public, max-age=300",
    });
    res.end(body);
  } catch (err) {
    if (err.code === "ENOENT" || err.code === "EISDIR") {
      res.writeHead(404, { "Content-Type": "text/plain; charset=utf-8" }).end("Not Found");
    } else {
      res.writeHead(500, { "Content-Type": "text/plain; charset=utf-8" }).end("Server Error");
      console.error(err);
    }
  }
});

server.listen(PORT, () => {
  console.log(`headless-360-mcp listening on http://localhost:${PORT}`);
});
