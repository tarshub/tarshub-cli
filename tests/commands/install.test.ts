import { describe, it, expect, vi, afterEach } from "vitest";
import { installCommand } from "../../src/commands/install.js";
import * as registry from "../../src/registry.js";
import * as fetchModule from "../../src/fetch.js";
import { CliError } from "../../src/errors.js";
import type { RegistryEntry } from "../../src/types.js";

vi.mock("node:fs");

import * as fs from "node:fs";

afterEach(() => {
  vi.restoreAllMocks();
});

const mockRegistryEntry: RegistryEntry = {
  name: "nextjs-supabase-saas",
  description: "Full SaaS context for Next.js + Supabase",
  version: "1.0.0",
  keywords: ["nextjs", "supabase"],
  listed: true,
  repo: "johndoe/tarshub-nextjs-supabase-saas",
  files: ["AGENTS.md", ".cursor/rules/general.mdc"],
};

function setupMocks(registryOverride?: Partial<RegistryEntry>) {
  vi.spyOn(registry, "fetchRegistryEntry").mockResolvedValue({
    ...mockRegistryEntry,
    ...registryOverride,
  });
  vi.spyOn(registry, "resolveContentBranch").mockResolvedValue("main");
  vi.spyOn(fetchModule, "fetchText").mockResolvedValue({
    ok: true,
    status: 200,
    text: "# Agents context content",
  });
  vi.mocked(fs.existsSync).mockReturnValue(false);
  vi.mocked(fs.mkdirSync).mockReturnValue(undefined);
  vi.mocked(fs.writeFileSync).mockReturnValue(undefined);
}

describe("installCommand — argument validation", () => {
  it("throws CliError for an invalid package format (no slash)", async () => {
    await expect(installCommand("@onlyuser")).rejects.toBeInstanceOf(CliError);
  });

  it("throws CliError for an invalid package format", async () => {
    await expect(installCommand("nope")).rejects.toBeInstanceOf(CliError);
  });
});

describe("installCommand — dry run", () => {
  it("returns written and skipped lists without writing any files", async () => {
    setupMocks();
    vi.mocked(fs.existsSync).mockReturnValue(false);

    const result = await installCommand("@johndoe/nextjs-supabase-saas", { dryRun: true });

    expect(result.written).toEqual(["AGENTS.md", ".cursor/rules/general.mdc"]);
    expect(result.skipped).toEqual([]);
    expect(fs.writeFileSync).not.toHaveBeenCalled();
  });

  it("reports existing files as 'skipped' in dry run mode", async () => {
    setupMocks();
    vi.mocked(fs.existsSync).mockReturnValue(true);

    const result = await installCommand("@johndoe/nextjs-supabase-saas", { dryRun: true });

    expect(result.written).toEqual([]);
    expect(result.skipped).toEqual(["AGENTS.md", ".cursor/rules/general.mdc"]);
    expect(fs.writeFileSync).not.toHaveBeenCalled();
  });
});

describe("installCommand — happy path", () => {
  it("writes files when registry repo is a nested slug", async () => {
    setupMocks({
      repo: "johndoe/tarshub-nextjs-supabase-saas/packages/nested",
      files: ["AGENTS.md"],
    });
    const spy = vi.spyOn(fetchModule, "fetchText").mockResolvedValue({
      ok: true,
      status: 200,
      text: "# ok",
    });

    const result = await installCommand("@johndoe/tarshub-nextjs-supabase-saas/packages/nested", {
      force: true,
    });

    expect(result.written).toEqual(["AGENTS.md"]);
    expect(spy).toHaveBeenCalledWith(
      expect.stringMatching(
        /raw\.githubusercontent\.com\/johndoe\/tarshub-nextjs-supabase-saas\/[^/]+\/packages\/nested\/AGENTS\.md/,
      ),
    );
  });

  it("writes all files when none exist", async () => {
    setupMocks();

    const result = await installCommand("@johndoe/nextjs-supabase-saas", { force: true });

    expect(result.written).toEqual(["AGENTS.md", ".cursor/rules/general.mdc"]);
    expect(result.skipped).toEqual([]);
    expect(result.version).toBe("1.0.0");
    expect(fs.writeFileSync).toHaveBeenCalledTimes(2);
  });

  it("defaults version to 'latest' when manifest has no version", async () => {
    setupMocks({ version: undefined });

    const result = await installCommand("@johndoe/nextjs-supabase-saas", { force: true });

    expect(result.version).toBe("latest");
  });

  it("overwrites existing files when --force is set", async () => {
    setupMocks();
    vi.mocked(fs.existsSync).mockReturnValue(true);

    const result = await installCommand("@johndoe/nextjs-supabase-saas", { force: true });

    expect(result.written).toHaveLength(2);
    expect(result.skipped).toHaveLength(0);
  });
});

describe("installCommand — validation", () => {
  it("skips files with disallowed extensions and records a warning", async () => {
    setupMocks({ files: ["AGENTS.md", "script.sh", "notes.txt"] });

    const result = await installCommand("@johndoe/nextjs-supabase-saas", { force: true });

    expect(result.warnings.some((w) => w.includes("script.sh"))).toBe(true);
    expect(result.written.some((f) => f.includes("script.sh"))).toBe(false);
  });

  it("skips files with path-traversal attempts and records a warning", async () => {
    setupMocks({ files: ["AGENTS.md", "../evil.md"] });

    const result = await installCommand("@johndoe/nextjs-supabase-saas", { force: true });

    expect(result.warnings.some((w) => w.includes("../evil.md"))).toBe(true);
    expect(result.written.some((f) => f.includes("evil.md"))).toBe(false);
  });

  it("throws CliError when file count exceeds the maximum", async () => {
    setupMocks({ files: Array.from({ length: 51 }, (_, i) => `file${i}.md`) });

    await expect(
      installCommand("@johndoe/nextjs-supabase-saas", { force: true }),
    ).rejects.toBeInstanceOf(CliError);
  });

  it("skips files that return 404 from the CDN and records a warning", async () => {
    vi.spyOn(registry, "fetchRegistryEntry").mockResolvedValue(mockRegistryEntry);
    vi.spyOn(registry, "resolveContentBranch").mockResolvedValue("main");
    vi.spyOn(fetchModule, "fetchText")
      .mockResolvedValueOnce({ ok: true, status: 200, text: "# content" })
      .mockResolvedValueOnce({ ok: false, status: 404, text: "" });
    vi.mocked(fs.existsSync).mockReturnValue(false);
    vi.mocked(fs.mkdirSync).mockReturnValue(undefined);
    vi.mocked(fs.writeFileSync).mockReturnValue(undefined);

    const result = await installCommand("@johndoe/nextjs-supabase-saas", { force: true });

    expect(result.written).toHaveLength(1);
    expect(result.warnings.some((w) => w.includes("not found"))).toBe(true);
  });

  it("throws CliError when total package size exceeds 500 KB", async () => {
    const manyFiles = Array.from({ length: 12 }, (_, i) => `file${i}.md`);
    vi.spyOn(registry, "fetchRegistryEntry").mockResolvedValue({
      ...mockRegistryEntry,
      files: manyFiles,
    });
    vi.spyOn(registry, "resolveContentBranch").mockResolvedValue("main");
    const nearLimitContent = "x".repeat(45 * 1024);
    vi.spyOn(fetchModule, "fetchText").mockResolvedValue({
      ok: true,
      status: 200,
      text: nearLimitContent,
    });
    vi.mocked(fs.existsSync).mockReturnValue(false);
    vi.mocked(fs.mkdirSync).mockReturnValue(undefined);
    vi.mocked(fs.writeFileSync).mockReturnValue(undefined);

    await expect(
      installCommand("@johndoe/nextjs-supabase-saas", { force: true }),
    ).rejects.toBeInstanceOf(CliError);
  });
});

describe("installCommand — registry errors", () => {
  it("propagates CliError when registry entry is not found", async () => {
    vi.spyOn(registry, "fetchRegistryEntry").mockRejectedValue(
      new CliError("Package @johndoe/missing not found. Check the name and try again."),
    );

    await expect(
      installCommand("@johndoe/missing", { force: true }),
    ).rejects.toBeInstanceOf(CliError);
  });

  it("propagates CliError when registry manifest fetch fails", async () => {
    vi.spyOn(registry, "fetchRegistryEntry").mockRejectedValue(
      new CliError("Package @johndoe/x not found on TarsHub."),
    );

    await expect(
      installCommand("@johndoe/nextjs-supabase-saas", { force: true }),
    ).rejects.toBeInstanceOf(CliError);
  });
});
