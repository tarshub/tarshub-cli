import { describe, it, expect, vi, afterEach } from "vitest";
import { fetchRegistryEntry, fetchTarsHubJson, fetchPackageIndex } from "../src/registry.js";
import * as fetchModule from "../src/fetch.js";
import { CliError } from "../src/errors.js";
import type { RegistryEntry, TarsHubJson, PackageIndex } from "../src/types.js";

afterEach(() => {
  vi.restoreAllMocks();
});

const mockRegistryEntry: RegistryEntry = {
  name: "nextjs-supabase-saas",
  description: "Full SaaS context for Next.js + Supabase",
  version: "1.0.0",
  repo: "johndoe/tarshub-nextjs-supabase-saas",
  files: ["AGENTS.md"],
};

const mockManifest: TarsHubJson = {
  name: "nextjs-supabase-saas",
  description: "Full SaaS context for Next.js + Supabase",
  version: "1.0.0",
  files: ["AGENTS.md"],
};

// ---------------------------------------------------------------------------
// fetchRegistryEntry
// ---------------------------------------------------------------------------

describe("fetchRegistryEntry", () => {
  it("returns the registry entry on success", async () => {
    vi.spyOn(fetchModule, "fetchJson").mockResolvedValue(mockRegistryEntry);
    const entry = await fetchRegistryEntry("johndoe/nextjs-supabase-saas");
    expect(entry).toEqual(mockRegistryEntry);
  });

  it("throws a CliError with a helpful message on 404", async () => {
    const err = Object.assign(new Error("HTTP 404"), { status: 404 });
    vi.spyOn(fetchModule, "fetchJson").mockRejectedValue(err);

    await expect(
      fetchRegistryEntry("johndoe/missing-pkg"),
    ).rejects.toBeInstanceOf(CliError);

    try {
      await fetchRegistryEntry("johndoe/missing-pkg");
    } catch (e) {
      expect((e as CliError).message).toMatch(/not found/i);
    }
  });

  it("throws a CliError wrapping a generic network error", async () => {
    vi.spyOn(fetchModule, "fetchJson").mockRejectedValue(
      new Error("Network error. Check your connection and try again."),
    );

    await expect(
      fetchRegistryEntry("johndoe/nextjs-supabase-saas"),
    ).rejects.toBeInstanceOf(CliError);
  });
});

// ---------------------------------------------------------------------------
// fetchTarsHubJson
// ---------------------------------------------------------------------------

describe("fetchTarsHubJson", () => {
  it("fetches from main branch on success", async () => {
    vi.spyOn(fetchModule, "fetchText")
      .mockResolvedValueOnce({ ok: true, status: 200, text: JSON.stringify(mockManifest) });

    const { manifest, branch } = await fetchTarsHubJson("johndoe/my-repo");
    expect(branch).toBe("main");
    expect(manifest).toEqual(mockManifest);
  });

  it("falls back to master branch when main returns 404", async () => {
    vi.spyOn(fetchModule, "fetchText")
      .mockResolvedValueOnce({ ok: false, status: 404, text: "" })
      .mockResolvedValueOnce({ ok: true, status: 200, text: JSON.stringify(mockManifest) });

    const { manifest, branch } = await fetchTarsHubJson("johndoe/my-repo");
    expect(branch).toBe("master");
    expect(manifest).toEqual(mockManifest);
  });

  it("throws CliError when both main and master are 404", async () => {
    vi.spyOn(fetchModule, "fetchText").mockResolvedValue({ ok: false, status: 404, text: "" });

    await expect(fetchTarsHubJson("johndoe/my-repo")).rejects.toBeInstanceOf(CliError);
  });

  it("throws CliError on invalid JSON in tarshub.json", async () => {
    vi.spyOn(fetchModule, "fetchText").mockResolvedValue({
      ok: true,
      status: 200,
      text: "{ bad json",
    });

    await expect(fetchTarsHubJson("johndoe/my-repo")).rejects.toBeInstanceOf(CliError);
  });

  it("tries v-prefixed tag first when version is specified", async () => {
    const spy = vi.spyOn(fetchModule, "fetchText")
      .mockResolvedValueOnce({ ok: true, status: 200, text: JSON.stringify(mockManifest) });

    const { branch } = await fetchTarsHubJson("johndoe/my-repo", "1.2.0");
    expect(branch).toBe("v1.2.0");
    expect(spy).toHaveBeenCalledWith(expect.stringContaining("v1.2.0"));
  });

  it("falls back to unprefixed tag if v-prefixed 404s", async () => {
    vi.spyOn(fetchModule, "fetchText")
      .mockResolvedValueOnce({ ok: false, status: 404, text: "" })
      .mockResolvedValueOnce({ ok: true, status: 200, text: JSON.stringify(mockManifest) });

    const { branch } = await fetchTarsHubJson("johndoe/my-repo", "1.2.0");
    expect(branch).toBe("1.2.0");
  });
});

// ---------------------------------------------------------------------------
// fetchPackageIndex
// ---------------------------------------------------------------------------

describe("fetchPackageIndex", () => {
  it("returns the package index on success", async () => {
    const mockIndex: PackageIndex = { updated: "2026-04-15T00:00:00Z", packages: [] };
    vi.spyOn(fetchModule, "fetchJson").mockResolvedValue(mockIndex);

    const index = await fetchPackageIndex();
    expect(index).toEqual(mockIndex);
  });

  it("throws a CliError on network failure", async () => {
    vi.spyOn(fetchModule, "fetchJson").mockRejectedValue(
      new Error("Network error. Check your connection and try again."),
    );

    await expect(fetchPackageIndex()).rejects.toBeInstanceOf(CliError);
  });
});
