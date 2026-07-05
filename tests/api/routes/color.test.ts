import { SELF } from "cloudflare:test";
import { describe, expect, it } from "vitest";

describe("GET /api/color/:oklch", () => {
  describe("path validation", () => {
    it("rejects non-OKLCH path with 400", async () => {
      const res = await SELF.fetch("http://localhost/api/color/not-an-oklch");
      expect(res.status).toBe(400);
    });

    it("rejects wrong decimal precision (must be L.LLL-C.CCC-H)", async () => {
      const res = await SELF.fetch("http://localhost/api/color/0.5-0.12-240");
      expect(res.status).toBe(400);
    });
  });

  describe("adhoc=true (math-only fast path)", () => {
    it("returns full ColorValue with status=found, 11-position scale, harmonies, no intelligence", async () => {
      const res = await SELF.fetch("http://localhost/api/color/0.700-0.150-260?adhoc=true");
      expect(res.status).toBe(200);
      const body = (await res.json()) as {
        status: string;
        color: {
          scale: Array<{ l: number; c: number; h: number }>;
          harmonies: Record<string, unknown>;
          intelligence?: unknown;
        };
      };
      expect(body.status).toBe("found");
      expect(body.color.scale).toHaveLength(11);
      expect(body.color.scale[0]).toMatchObject({
        l: expect.any(Number),
        c: expect.any(Number),
        h: expect.any(Number),
      });
      expect(body.color.harmonies).toMatchObject({
        complementary: expect.any(Object),
        triadic: expect.any(Array),
        analogous: expect.any(Array),
      });
      expect(body.color.intelligence).toBeUndefined();
    });
  });

  describe("default (no sync, no adhoc)", () => {
    it.skip("returns 202 with status=generating when Vectorize misses (requires real Vectorize binding)", async () => {
      const res = await SELF.fetch("http://localhost/api/color/0.500-0.120-240");
      expect(res.status).toBe(202);
      const body = (await res.json()) as { status: string };
      expect(body.status).toBe("generating");
    });
  });

  describe("GET /api/color/search", () => {
    it("rejects a missing q with 400 (validated before any binding is touched)", async () => {
      const res = await SELF.fetch("http://localhost/api/color/search");
      expect(res.status).toBe(400);
    });

    it("rejects an unknown hue category with 400", async () => {
      const res = await SELF.fetch("http://localhost/api/color/search?q=ocean&hue=teal");
      expect(res.status).toBe(400);
    });

    it("rejects limit above 100 with 400", async () => {
      const res = await SELF.fetch("http://localhost/api/color/search?q=ocean&limit=101");
      expect(res.status).toBe(400);
    });

    it.skip("returns semantic matches (requires AI + Vectorize remote bindings)", async () => {
      const res = await SELF.fetch("http://localhost/api/color/search?q=ocean%20blue");
      expect(res.status).toBe(200);
    });
  });

  describe("sync=true (full AI pipeline)", () => {
    it.skip("generates intelligence and persists (requires AI Gateway + Vectorize remote bindings)", async () => {
      const res = await SELF.fetch("http://localhost/api/color/0.500-0.120-240?sync=true");
      expect(res.status).toBe(200);
      const body = (await res.json()) as {
        status: string;
        color: { intelligence?: { reasoning: string } };
      };
      expect(body.status).toBe("found");
      expect(body.color.intelligence?.reasoning).toBeTruthy();
    });
  });
});
