import { createReadStream } from "node:fs";
import { readFile, stat } from "node:fs/promises";
import { createServer, request as httpRequest } from "node:http";
import { extname, resolve, sep } from "node:path";
import { fileURLToPath } from "node:url";
import { injectRouteMetadata, isKnownRoute, normalizePath, publicOriginFor, renderPublicPage } from "./seo-server.mjs";

const port = Number(process.env.PORT ?? 19975);
const apiPort = Number(process.env.GBLOC_API_PORT ?? 8080);
const publicDir = fileURLToPath(new URL("./dist/public/", import.meta.url));
const resolvedPublicDir = resolve(publicDir);
const mimeTypes = {
  ".css": "text/css; charset=utf-8",
  ".html": "text/html; charset=utf-8",
  ".ico": "image/x-icon",
  ".jpeg": "image/jpeg",
  ".jpg": "image/jpeg",
  ".js": "text/javascript; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".mp3": "audio/mpeg",
  ".mp4": "video/mp4",
  ".ogg": "audio/ogg",
  ".png": "image/png",
  ".svg": "image/svg+xml",
  ".txt": "text/plain; charset=utf-8",
  ".webm": "video/webm",
  ".webp": "image/webp",
  ".woff": "font/woff",
  ".woff2": "font/woff2",
};

function sendText(response, statusCode, message) {
  response.writeHead(statusCode, {
    "Content-Type": "text/plain; charset=utf-8",
    "Cache-Control": "no-store",
    "X-Content-Type-Options": "nosniff",
  });
  response.end(message);
}

async function serveProfileShare(request, response, requestUrl) {
  const publicOrigin = new URL(publicOriginFor(request));
  const forwardedFor = request.headers["x-forwarded-for"];

  try {
    const upstreamResponse = await new Promise((resolveResponse, reject) => {
      const headers = {
        Accept: "*/*",
        Host: publicOrigin.host,
        "X-Forwarded-Host": publicOrigin.host,
        "X-Forwarded-Proto": publicOrigin.protocol.slice(0, -1),
      };
      if (forwardedFor) {
        headers["X-Forwarded-For"] = Array.isArray(forwardedFor)
          ? forwardedFor.join(", ")
          : forwardedFor;
      }

      const upstreamRequest = httpRequest(
        {
          hostname: "127.0.0.1",
          port: apiPort,
          method: "GET",
          path: `${requestUrl.pathname}${requestUrl.search}`,
          headers,
        },
        (upstream) => {
          const chunks = [];
          upstream.on("data", (chunk) => chunks.push(chunk));
          upstream.on("end", () => {
            resolveResponse({
              status: upstream.statusCode ?? 502,
              contentType: upstream.headers["content-type"],
              location: upstream.headers.location,
              body: Buffer.concat(chunks),
            });
          });
          upstream.on("error", reject);
        },
      );
      upstreamRequest.setTimeout(5000, () => {
        upstreamRequest.destroy(new Error("Profile API request timed out."));
      });
      upstreamRequest.on("error", reject);
      upstreamRequest.end();
    });
    response.writeHead(upstreamResponse.status, {
      ...(upstreamResponse.location ? { Location: upstreamResponse.location } : {}),
      "Content-Type": upstreamResponse.contentType ?? "text/html; charset=utf-8",
      "Content-Length": upstreamResponse.body.length,
      "Cache-Control": "public, max-age=300, stale-while-revalidate=3600",
      "X-Content-Type-Options": "nosniff",
    });
    response.end(request.method === "HEAD" ? undefined : upstreamResponse.body);
  } catch {
    sendText(response, 502, "Profile preview is temporarily unavailable.");
  }
}

async function serveStatic(request, response, pathname) {
  let decodedPath;
  try {
    decodedPath = decodeURIComponent(pathname);
  } catch {
    sendText(response, 400, "Invalid URL path.");
    return;
  }

  const filePath = resolve(resolvedPublicDir, `.${decodedPath}`);
  if (filePath !== resolvedPublicDir && !filePath.startsWith(`${resolvedPublicDir}${sep}`)) {
    sendText(response, 403, "Forbidden.");
    return;
  }

  try {
    const fileInfo = await stat(filePath);
    if (!fileInfo.isFile()) throw new Error("Not a file.");
    response.writeHead(200, {
      "Content-Type": mimeTypes[extname(filePath).toLowerCase()] ?? "application/octet-stream",
      "Content-Length": fileInfo.size,
      "Cache-Control": "public, max-age=0, must-revalidate",
      "X-Content-Type-Options": "nosniff",
    });
    if (request.method === "HEAD") {
      response.end();
      return;
    }
    createReadStream(filePath).pipe(response);
    return;
  } catch {
    if (extname(decodedPath)) {
      sendText(response, 404, "Not found.");
      return;
    }
  }

  const indexPath = resolve(resolvedPublicDir, "index.html");
  try {
    const normalizedPath = normalizePath(decodedPath);
    const content = await renderPublicPage(normalizedPath, () => import("./dist/server/entry-server.js"));
    const html = injectRouteMetadata(await readFile(indexPath, "utf8"), request, normalizedPath)
      .replace('<div id="root"></div>', `<div id="root">${content}</div>`);
    const body = Buffer.from(html);
    response.writeHead(isKnownRoute(normalizedPath) ? 200 : 404, {
      "Content-Type": "text/html; charset=utf-8",
      "Content-Length": body.length,
      "Cache-Control": "no-cache",
      "X-Content-Type-Options": "nosniff",
    });
    response.end(request.method === "HEAD" ? undefined : body);
  } catch {
    sendText(response, 503, "The GBLOC public page is temporarily unavailable.");
  }
}

const server = createServer((request, response) => {
  if (request.method !== "GET" && request.method !== "HEAD") {
    sendText(response, 405, "Method not allowed.");
    return;
  }

  let requestUrl;
  try {
    requestUrl = new URL(request.url ?? "/", "http://localhost");
  } catch {
    sendText(response, 400, "Invalid request URL.");
    return;
  }

  if (/^\/@[^/]+\/?$/.test(requestUrl.pathname)) {
    void serveProfileShare(request, response, requestUrl);
    return;
  }

  const normalizedPath = requestUrl.pathname === "/" ? "/" : requestUrl.pathname.replace(/\/+$/, "");
  if (normalizedPath === "/terms" || normalizedPath === "/privacy") {
    const section = normalizedPath === "/terms" ? "terms" : "privacy";
    response.writeHead(301, {
      Location: `/legal#${section}`,
      "Cache-Control": "public, max-age=3600",
      "X-Content-Type-Options": "nosniff",
    });
    response.end();
    return;
  }

  if (!isKnownRoute(normalizedPath) && /^\/[A-Za-z0-9_]{3,20}$/.test(normalizedPath)) {
    response.writeHead(301, { Location: `/@${normalizedPath.slice(1).toLowerCase()}` });
    response.end();
    return;
  }

  void serveStatic(request, response, requestUrl.pathname);
});

if (!Number.isInteger(port) || port < 1 || port > 65535) {
  throw new Error(`Invalid PORT value: "${process.env.PORT}"`);
}

server.listen(port, "0.0.0.0", () => {
  console.log(`GBLOC web server listening on ${port}`);
});
