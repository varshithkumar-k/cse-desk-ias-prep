import { createServer } from "node:http";
import { readFile, stat } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const siteRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const mimeTypes = new Map([
  [".html", "text/html; charset=utf-8"],
  [".css", "text/css; charset=utf-8"],
  [".js", "text/javascript; charset=utf-8"],
  [".mjs", "text/javascript; charset=utf-8"],
  [".json", "application/json; charset=utf-8"],
  [".xml", "application/xml; charset=utf-8"],
  [".txt", "text/plain; charset=utf-8"],
  [".svg", "image/svg+xml"],
  [".png", "image/png"]
]);

const server = createServer(async (request, response) => {
  if (request.method !== "GET" && request.method !== "HEAD") {
    response.writeHead(405, { Allow: "GET, HEAD" }).end();
    return;
  }

  let pathname;
  try { pathname = decodeURIComponent(new URL(request.url, "http://localhost").pathname); }
  catch { response.writeHead(400).end("Bad request"); return; }

  let target = path.resolve(siteRoot, `.${pathname}`);
  const relative = path.relative(siteRoot, target);
  if (relative.startsWith("..") || path.isAbsolute(relative)) {
    response.writeHead(403).end("Forbidden");
    return;
  }

  try {
    const info = await stat(target);
    if (info.isDirectory()) target = path.join(target, "index.html");
    else if (!path.extname(target)) {
      const directoryIndex = path.join(target, "index.html");
      try { await stat(directoryIndex); target = directoryIndex; }
      catch { target += ".html"; }
    }
    const contents = await readFile(target);
    const type = mimeTypes.get(path.extname(target).toLowerCase()) || "application/octet-stream";
    response.writeHead(200, { "Content-Type": type, "X-Content-Type-Options": "nosniff" });
    response.end(request.method === "HEAD" ? undefined : contents);
  } catch {
    try {
      const notFound = await readFile(path.join(siteRoot, "404.html"));
      response.writeHead(404, { "Content-Type": "text/html; charset=utf-8" });
      response.end(request.method === "HEAD" ? undefined : notFound);
    } catch {
      response.writeHead(404).end("Not found");
    }
  }
});

const port = Number(process.env.PORT || 4173);
server.listen(port, "127.0.0.1", () => console.log(`CSE Desk preview: http://127.0.0.1:${port}/`));
