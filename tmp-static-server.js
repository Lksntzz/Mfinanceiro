const http = require("http");
const fs = require("fs");
const path = require("path");

const rootDir = path.resolve(__dirname, "public");
const port = Number(process.env.PORT || 4173);

const mimeTypes = {
  ".html": "text/html; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".js": "application/javascript; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".svg": "image/svg+xml",
  ".png": "image/png",
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".webp": "image/webp",
  ".ico": "image/x-icon",
  ".map": "application/json; charset=utf-8",
};

function resolveFile(requestUrl) {
  const rawPath = decodeURIComponent(new URL(requestUrl, `http://127.0.0.1:${port}`).pathname);
  const safePath = path.normalize(rawPath).replace(/^([.][.][/\\])+/, "");
  const candidates = [];

  if (safePath === "/" || safePath === "") {
    candidates.push(path.join(rootDir, "dashboard.html"));
    candidates.push(path.join(__dirname, "index.html"));
  } else {
    candidates.push(path.join(rootDir, safePath));
    candidates.push(path.join(__dirname, safePath));
    candidates.push(path.join(rootDir, safePath, "index.html"));
  }

  for (const candidate of candidates) {
    if (fs.existsSync(candidate) && fs.statSync(candidate).isFile()) {
      return candidate;
    }
  }

  return null;
}

http
  .createServer((req, res) => {
    if (!req.url) {
      res.writeHead(400);
      res.end("Bad Request");
      return;
    }

    const file = resolveFile(req.url);

    if (!file) {
      res.writeHead(404, { "Content-Type": "text/plain; charset=utf-8" });
      res.end("Not found");
      return;
    }

    const ext = path.extname(file).toLowerCase();
    const contentType = mimeTypes[ext] || "application/octet-stream";

    res.writeHead(200, {
      "Content-Type": contentType,
      "Cache-Control": "no-store",
    });
    fs.createReadStream(file).pipe(res);
  })
  .listen(port, "127.0.0.1", () => {
    console.log(`Static server running at http://127.0.0.1:${port}`);
  });
