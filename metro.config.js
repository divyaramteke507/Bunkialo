const { getDefaultConfig } = require("expo/metro-config");
const { withNativeWind } = require("nativewind/metro");
const https = require("node:https");
const http = require("node:http");
const { URL } = require("node:url");

const config = getDefaultConfig(__dirname);

// Fix for Zustand import.meta crash on Expo Web
config.resolver.unstable_enablePackageExports = false;

function makeProxyRequest(
  targetUrlStr,
  method,
  reqHeaders,
  bodyBuffer,
  res,
  accumulatedSetCookies = [],
  redirectCount = 0,
) {
  if (redirectCount > 5) {
    res.writeHead(508, { "Content-Type": "application/json" });
    res.end(JSON.stringify({ error: "Too many redirects in proxy" }));
    return;
  }

  let targetUrl;
  try {
    targetUrl = new URL(targetUrlStr);
  } catch {
    res.writeHead(400, { "Content-Type": "application/json" });
    res.end(JSON.stringify({ error: "Invalid target URL" }));
    return;
  }

  const clientHeaders = { ...reqHeaders };
  delete clientHeaders.host;
  delete clientHeaders["x-target-url"];
  delete clientHeaders["content-length"];
  delete clientHeaders["accept-encoding"]; // request plain uncompressed stream for proxy simplicity

  if (bodyBuffer && bodyBuffer.length > 0) {
    clientHeaders["content-length"] = bodyBuffer.length.toString();
  }

  if (clientHeaders["x-cookie-header"]) {
    clientHeaders["cookie"] = clientHeaders["x-cookie-header"];
    delete clientHeaders["x-cookie-header"];
  }

  clientHeaders["user-agent"] =
    "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36";
  clientHeaders.host = targetUrl.host;

  const options = {
    hostname: targetUrl.hostname,
    port: targetUrl.port || (targetUrl.protocol === "https:" ? 443 : 80),
    path: targetUrl.pathname + targetUrl.search,
    method: method,
    headers: clientHeaders,
  };

  const requester = targetUrl.protocol === "https:" ? https : http;

  const proxyReq = requester.request(options, (proxyRes) => {
    // Collect cookies across redirects
    const setCookieHeader = proxyRes.headers["set-cookie"];
    if (setCookieHeader) {
      const newCookies = Array.isArray(setCookieHeader)
        ? setCookieHeader
        : [setCookieHeader];
      accumulatedSetCookies.push(...newCookies);

      let existingCookie = clientHeaders["cookie"] || "";
      for (const sc of newCookies) {
        const nameVal = sc.split(";")[0];
        if (nameVal) {
          const [k] = nameVal.split("=");
          if (k) {
            const reg = new RegExp(`${k.trim()}=[^;]*`);
            if (existingCookie.match(reg)) {
              existingCookie = existingCookie.replace(reg, nameVal.trim());
            } else {
              existingCookie = existingCookie
                ? `${existingCookie}; ${nameVal.trim()}`
                : nameVal.trim();
            }
          }
        }
      }
      clientHeaders["cookie"] = existingCookie;
    }

    // Handle 3xx Redirects server-side
    if (
      proxyRes.statusCode &&
      proxyRes.statusCode >= 300 &&
      proxyRes.statusCode < 400 &&
      proxyRes.headers.location
    ) {
      let redirectUrl = proxyRes.headers.location;
      if (redirectUrl.startsWith("/")) {
        redirectUrl = `${targetUrl.protocol}//${targetUrl.host}${redirectUrl}`;
      }
      const nextMethod =
        proxyRes.statusCode === 303 || proxyRes.statusCode === 302
          ? "GET"
          : method;
      const nextBody = nextMethod === "GET" ? Buffer.alloc(0) : bodyBuffer;

      makeProxyRequest(
        redirectUrl,
        nextMethod,
        clientHeaders,
        nextBody,
        res,
        accumulatedSetCookies,
        redirectCount + 1,
      );
      return;
    }

    const resHeaders = {
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
      "Access-Control-Allow-Headers":
        "Content-Type, X-Target-Url, X-Cookie-Header, X-Retry-After-Reauth, Authorization",
      "Access-Control-Expose-Headers": "*",
    };

    for (const [key, val] of Object.entries(proxyRes.headers)) {
      if (
        key.toLowerCase() !== "set-cookie" &&
        key.toLowerCase() !== "transfer-encoding" &&
        key.toLowerCase() !== "location"
      ) {
        resHeaders[key] = val;
      }
    }

    if (accumulatedSetCookies.length > 0) {
      resHeaders["x-set-cookie"] = accumulatedSetCookies.join(";;;");
    }

    res.writeHead(proxyRes.statusCode || 200, resHeaders);
    proxyRes.pipe(res);
  });

  proxyReq.on("error", (err) => {
    res.writeHead(502, { "Content-Type": "application/json" });
    res.end(JSON.stringify({ error: err.message }));
  });

  if (bodyBuffer && bodyBuffer.length > 0) {
    proxyReq.write(bodyBuffer);
  }
  proxyReq.end();
}

config.server = {
  ...config.server,
  enhanceMiddleware: (metroMiddleware) => {
    return (req, res, next) => {
      if (req.url && req.url.startsWith("/lms-proxy")) {
        if (req.method === "OPTIONS") {
          res.writeHead(200, {
            "Access-Control-Allow-Origin": "*",
            "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
            "Access-Control-Allow-Headers":
              "Content-Type, X-Target-Url, X-Cookie-Header, X-Retry-After-Reauth, Authorization",
            "Access-Control-Expose-Headers": "*",
          });
          res.end();
          return;
        }

        const targetUrlStr = req.headers["x-target-url"];
        if (!targetUrlStr) {
          res.writeHead(400, { "Content-Type": "application/json" });
          res.end(JSON.stringify({ error: "Missing x-target-url header" }));
          return;
        }

        const bodyChunks = [];
        req.on("data", (chunk) => bodyChunks.push(chunk));
        req.on("end", () => {
          const bodyBuffer = Buffer.concat(bodyChunks);
          makeProxyRequest(
            targetUrlStr,
            req.method || "GET",
            req.headers,
            bodyBuffer,
            res,
          );
        });

        return;
      }

      return metroMiddleware(req, res, next);
    };
  },
};

module.exports = withNativeWind(config, { input: "./src/global.css" });
