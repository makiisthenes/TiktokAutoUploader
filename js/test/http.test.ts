import assert from "node:assert/strict";
import { createServer, type IncomingMessage, type Server } from "node:http";
import { connect, type AddressInfo } from "node:net";
import { test } from "node:test";
import { CookieJar, HttpClient, NetworkError } from "../src/http.ts";
import { Proxy } from "../src/proxy.ts";

test("cookie jar: domain and path matching, expiry, replacement", () => {
  const jar = new CookieJar();
  jar.set("sessionid", "s");
  const www = new URL("https://www.tiktok.com/api/x");
  jar.store(www, [
    "msToken=MS1; Domain=.tiktok.com; Path=/",
    "hostonly=1; Path=/",
    "scoped=1; Path=/api",
    "other=1; Domain=evil.example; Path=/",
  ]);
  assert.equal(jar.header(www), "scoped=1; sessionid=s; msToken=MS1; hostonly=1");
  assert.equal(jar.header(new URL("https://upload.tiktok.com/")), "sessionid=s; msToken=MS1");
  assert.equal(jar.header(new URL("https://www.tiktok.com/apis")), "sessionid=s; msToken=MS1; hostonly=1");
  assert.equal(jar.header(new URL("https://tiktok.com.evil.example/")), undefined);

  jar.store(www, "msToken=MS2; Domain=tiktok.com; Path=/");
  assert.equal(jar.get("msToken"), "MS2");
  jar.store(www, "msToken=; Domain=.tiktok.com; Path=/; Max-Age=0");
  assert.equal(jar.get("msToken"), undefined);
});

async function listen(server: Server): Promise<number> {
  await new Promise<void>((resolve) => server.listen(0, "127.0.0.1", resolve));
  return (server.address() as AddressInfo).port;
}

test("requests go through the account proxy, not HTTPS_PROXY", async (t) => {
  const target = createServer((req, res) => {
    if (req.url === "/redirect") {
      res.writeHead(302, { location: "/final", "set-cookie": "hop=1; Path=/" }).end();
    } else {
      res.writeHead(200, { "content-type": "application/json" }).end(JSON.stringify({ cookie: req.headers.cookie ?? null }));
    }
  });
  const seen: string[] = [];
  const proxy = createServer();
  proxy.on("connect", (req: IncomingMessage, socket, head) => {
    seen.push(`${req.url} ${req.headers["proxy-authorization"]}`);
    const [host, port] = req.url!.split(":");
    const upstream = connect(Number(port), host, () => {
      socket.write("HTTP/1.1 200 Connection Established\r\n\r\n");
      upstream.write(head);
      upstream.pipe(socket);
      socket.pipe(upstream);
    });
    upstream.on("error", () => socket.destroy());
    socket.on("error", () => upstream.destroy());
  });
  const targetPort = await listen(target);
  const proxyPort = await listen(proxy);
  t.after(() => {
    target.close();
    proxy.close();
  });

  process.env.HTTPS_PROXY = process.env.HTTP_PROXY = "http://127.0.0.1:9";
  const http = new HttpClient({ proxy: Proxy.parse(`127.0.0.1:${proxyPort}:user:p:ss`), jar: new CookieJar() });
  try {
    const r = await http.request(`http://127.0.0.1:${targetPort}/redirect`);
    assert.equal(r.status, 200);
    // The cookie set on the redirect hop was kept and sent to the final URL.
    assert.deepEqual(r.json(), { cookie: "hop=1" });
    assert.equal(seen[0], `127.0.0.1:${targetPort} Basic ${Buffer.from("user:p:ss").toString("base64")}`);
  } finally {
    await http.close();
    delete process.env.HTTPS_PROXY;
    delete process.env.HTTP_PROXY;
  }
});

test("network failures and timeouts are NetworkErrors", async (t) => {
  const hang = createServer(() => {});
  const port = await listen(hang);
  t.after(() => hang.close());
  hang.on("connection", (socket) => t.after(() => socket.destroy()));

  const http = new HttpClient({ timeoutMs: 200 });
  await assert.rejects(http.request(`http://127.0.0.1:${port}/`), (error: Error) => {
    assert.ok(error instanceof NetworkError);
    assert.match(error.message, /timed out after 200 ms/);
    return true;
  });
  await assert.rejects(new HttpClient().request("http://127.0.0.1:9/"), NetworkError);
});
