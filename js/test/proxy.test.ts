import assert from "node:assert/strict";
import { inspect } from "node:util";
import { test } from "node:test";
import { parseProxy, Proxy, ValidationError } from "../src/index.ts";

// Expected values come from the Python package (autotok.proxy.Proxy), so both parse alike.
const PYTHON = [
  { raw: "host.example:8000", url: "http://host.example:8000", username: null, password: null, port: 8000 },
  { raw: "http://host.example:80", url: "http://host.example:80", username: null, password: null, port: 80 },
  { raw: "HTTP://User:P%40ss@Host.Example:8000/path?q=1", url: "http://User:P%40ss@host.example:8000", username: "User", password: "P@ss", port: 8000 },
  { raw: "host.example:8000:user:pa:ss", url: "http://user:pa%3Ass@host.example:8000", username: "user", password: "pa:ss", port: 8000 },
  { raw: "host.example:8000:us er:p!a*s(s)~", url: "http://us%20er:p%21a%2As%28s%29~@host.example:8000", username: "us er", password: "p!a*s(s)~", port: 8000 },
  { raw: "socks5h://[::1]:1080", url: "socks5h://[::1]:1080", username: null, password: null, port: 1080 },
  { raw: "https://u:p%40w@h.example:443", url: "https://u:p%40w@h.example:443", username: "u", password: "p@w", port: 443 },
  { raw: "user@host.example:3128", url: "http://user@host.example:3128", username: "user", password: null, port: 3128 },
  { raw: "socks4://10.0.0.1:1080", url: "socks4://10.0.0.1:1080", username: null, password: null, port: 1080 },
  { raw: "user:pass@host.example:8000", url: "http://user:pass@host.example:8000", username: "user", password: "pass", port: 8000 },
  { raw: "socks5://u:p@10.0.0.1:1080", url: "socks5://u:p@10.0.0.1:1080", username: "u", password: "p", port: 1080 },
];

test("parses every format the same way as the Python package", () => {
  for (const { raw, url, username, password, port } of PYTHON) {
    const p = Proxy.parse(raw);
    assert.equal(p.url, url, raw);
    assert.equal(p.username, username, raw);
    assert.equal(p.password, password, raw);
    assert.equal(p.port, port, raw);
  }
});

test("the password never shows up in logs", () => {
  const p = Proxy.parse("http://user:topsecret@h.example:8000");
  assert.equal(p.masked(), "http://user:****@h.example:8000");
  assert.equal(String(p), "http://user:****@h.example:8000");
  assert.ok(!inspect(p).includes("topsecret"));
  assert.ok(!JSON.stringify(p).includes("topsecret"));
  assert.ok(!`${p}`.includes("topsecret"));
});

test("playwright form", () => {
  assert.deepEqual(Proxy.parse("socks5h://h.example:1080").forPlaywright(), { server: "socks5://h.example:1080" });
  assert.deepEqual(Proxy.parse("http://u:p@h.example:8000").forPlaywright(), {
    server: "http://h.example:8000",
    username: "u",
    password: "p",
  });
  assert.throws(() => Proxy.parse("socks5://u:p@h.example:1080").forPlaywright(), ValidationError);
});

test("invalid proxies", () => {
  for (const bad of ["", "ftp://h:1", "h.example", "h.example:99999", "http://:80", "h.example:0", "h.example:abc:user:pass"]) {
    assert.throws(() => Proxy.parse(bad), ValidationError, bad);
  }
});

test("errors about bad proxies mask the password", () => {
  // The second is the provider format with a scheme added, which isn't valid.
  for (const bad of ["http://user:topsecret@h.example:99999", "http://h.example:8000:user:topsecret"]) {
    assert.throws(() => Proxy.parse(bad), (error: Error) => {
      assert.ok(!error.message.includes("topsecret"), error.message);
      return true;
    });
  }
});

test("parseProxy: empty is null, Proxy passes through", () => {
  assert.equal(parseProxy(null), null);
  assert.equal(parseProxy(undefined), null);
  assert.equal(parseProxy("  "), null);
  const p = Proxy.parse("h.example:1");
  assert.equal(parseProxy(p), p);
});
