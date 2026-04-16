import { describe, it, expect, vi, afterEach } from "vitest";
import {
  fetchText,
  fetchJson,
  registryManifestUrl,
  repoFileUrl,
  indexUrl,
  REGISTRY_BASE,
  RAW_BASE,
} from "../src/fetch.js";

afterEach(() => {
  vi.restoreAllMocks();
});

// ---------------------------------------------------------------------------
// URL builders
// ---------------------------------------------------------------------------

describe("registryManifestUrl", () => {
  it("builds the URL for a root package (packages/.../tarshub.json)", () => {
    const url = registryManifestUrl("johndoe/nextjs-supabase-saas");
    expect(url).toBe(`${REGISTRY_BASE}/packages/johndoe/nextjs-supabase-saas/tarshub.json`);
  });

  it("builds the URL for a subdirectory package", () => {
    const url = registryManifestUrl("PatrickJS/awesome-cursorrules/rules/htmx-flask");
    expect(url).toBe(
      `${REGISTRY_BASE}/packages/PatrickJS/awesome-cursorrules/rules/htmx-flask/tarshub.json`,
    );
  });
});

describe("repoFileUrl", () => {
  it("builds the correct URL for a file in a repo", () => {
    const url = repoFileUrl("johndoe/my-repo", "main", "AGENTS.md");
    expect(url).toBe(`${RAW_BASE}/johndoe/my-repo/main/AGENTS.md`);
  });

  it("supports sub-paths", () => {
    const url = repoFileUrl("johndoe/my-repo", "main", ".cursor/rules/general.mdc");
    expect(url).toBe(`${RAW_BASE}/johndoe/my-repo/main/.cursor/rules/general.mdc`);
  });

  it("supports version tags as branch", () => {
    const url = repoFileUrl("johndoe/my-repo", "v1.2.0", "tarshub.json");
    expect(url).toBe(`${RAW_BASE}/johndoe/my-repo/v1.2.0/tarshub.json`);
  });
});

describe("indexUrl", () => {
  it("returns the _index.json URL", () => {
    expect(indexUrl()).toBe(`${REGISTRY_BASE}/_index.json`);
  });
});

// ---------------------------------------------------------------------------
// fetchText
// ---------------------------------------------------------------------------

describe("fetchText", () => {
  it("returns ok:true and text on a 200 response", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue({
      ok: true,
      status: 200,
      text: async () => "hello",
    }));

    const result = await fetchText("https://example.com/file.txt");
    expect(result).toEqual({ ok: true, status: 200, text: "hello" });
  });

  it("returns ok:false and empty text on a 404 response", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue({
      ok: false,
      status: 404,
      text: async () => "not found",
    }));

    const result = await fetchText("https://example.com/missing.txt");
    expect(result).toEqual({ ok: false, status: 404, text: "" });
  });

  it("throws a CliError-friendly message on network failure", async () => {
    vi.stubGlobal("fetch", vi.fn().mockRejectedValue(new Error("ECONNREFUSED")));

    await expect(fetchText("https://example.com")).rejects.toThrow(
      "Network error. Check your connection and try again.",
    );
  });
});

// ---------------------------------------------------------------------------
// fetchJson
// ---------------------------------------------------------------------------

describe("fetchJson", () => {
  it("parses and returns JSON on success", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue({
      ok: true,
      status: 200,
      text: async () => JSON.stringify({ name: "pkg" }),
    }));

    const result = await fetchJson<{ name: string }>("https://example.com/pkg.json");
    expect(result).toEqual({ name: "pkg" });
  });

  it("throws with status on non-200 response", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue({
      ok: false,
      status: 404,
      text: async () => "",
    }));

    await expect(fetchJson("https://example.com/missing.json")).rejects.toMatchObject({
      status: 404,
    });
  });

  it("throws on malformed JSON", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue({
      ok: true,
      status: 200,
      text: async () => "{ not valid json",
    }));

    await expect(fetchJson("https://example.com/bad.json")).rejects.toThrow("Invalid JSON");
  });
});
