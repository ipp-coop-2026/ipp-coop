import { describe, expect, it } from "vitest";
import {
  clientIp,
  crossSite,
  PER_IP_HOURLY,
  takeAiQuota,
  takeGroqQuota,
  underIpLimit,
} from "@/lib/p03/desk-server";

const req = (headers: Record<string, string>, url = "https://ipp.example/api/p02/ai") =>
  new Request(url, { method: "POST", headers });

describe("P03 API guards", () => {
  it("refuses POSTs that a browser sends from another website", () => {
    expect(crossSite(req({ origin: "https://evil.example" }))).toBe(true);
    expect(crossSite(req({ origin: "https://ipp.example" }))).toBe(false);
    expect(crossSite(req({}))).toBe(false);
    expect(crossSite(req({ origin: "not a url" }))).toBe(true);
  });

  it("reads the visitor IP from the host's headers", () => {
    expect(clientIp(req({ "cf-connecting-ip": "203.0.113.7" }))).toBe("203.0.113.7");
    expect(clientIp(req({ "x-forwarded-for": "198.51.100.2, 10.0.0.1" }))).toBe("198.51.100.2");
    expect(clientIp(req({}))).toBe("unknown");
  });

  it("stops one IP after its hourly limit and leaves other IPs alone", async () => {
    const a = req({ "cf-connecting-ip": "192.0.2.10" });
    const b = req({ "cf-connecting-ip": "192.0.2.11" });
    for (let i = 0; i < PER_IP_HOURLY.admin; i++) expect(await underIpLimit(a, "admin")).toBe(true);
    expect(await underIpLimit(a, "admin")).toBe(false);
    expect(await underIpLimit(b, "admin")).toBe(true);
  });

  it("counts AI calls per IP before the shared daily cap", async () => {
    const c = req({ "cf-connecting-ip": "192.0.2.20" });
    let allowed = 0;
    for (let i = 0; i < PER_IP_HOURLY.ai + 5; i++) if (await takeAiQuota(c)) allowed++;
    expect(allowed).toBe(PER_IP_HOURLY.ai);
  });

  it("limits Groq calls per IP on their own counter", async () => {
    const d = req({ "cf-connecting-ip": "192.0.2.30" });
    let allowed = 0;
    for (let i = 0; i < PER_IP_HOURLY.groq + 5; i++) if (await takeGroqQuota(d)) allowed++;
    expect(allowed).toBe(PER_IP_HOURLY.groq);
    expect(await takeAiQuota(d)).toBe(true);
  });
});
