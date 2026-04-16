import { describe, it, expect, vi, afterEach } from "vitest";
import { infoCommand } from "../../src/commands/info.js";
import * as registry from "../../src/registry.js";
import { CliError } from "../../src/errors.js";
import type { RegistryEntry } from "../../src/types.js";

afterEach(() => {
  vi.restoreAllMocks();
});

const mockRegistryEntry: RegistryEntry = {
  name: "nextjs-supabase-saas",
  description: "Full SaaS context for Next.js + Supabase",
  version: "1.0.0",
  keywords: ["nextjs", "supabase", "saas"],
  listed: true,
  repo: "johndoe/tarshub-nextjs-supabase-saas",
  files: ["AGENTS.md", ".cursor/rules/general.mdc", "tasks/setup.md"],
};

describe("infoCommand", () => {
  it("returns package metadata for a valid package", async () => {
    vi.spyOn(registry, "fetchRegistryEntry").mockResolvedValue(mockRegistryEntry);
    const result = await infoCommand("@johndoe/nextjs-supabase-saas");
    expect(result.packageArg).toBe("@johndoe/nextjs-supabase-saas");
    expect(result.version).toBe("1.0.0");
    expect(result.description).toBe("Full SaaS context for Next.js + Supabase");
    expect(result.files).toEqual(["AGENTS.md", ".cursor/rules/general.mdc", "tasks/setup.md"]);
    expect(result.keywords).toEqual(["nextjs", "supabase", "saas"]);
    expect(result.repo).toBe("johndoe/tarshub-nextjs-supabase-saas");
  });

  it("defaults version to 'latest' when registry has no version field", async () => {
    vi.spyOn(registry, "fetchRegistryEntry").mockResolvedValue({
      ...mockRegistryEntry,
      version: undefined,
    });
    const result = await infoCommand("@johndoe/nextjs-supabase-saas");
    expect(result.version).toBe("latest");
  });

  it("defaults keywords to empty array when not present", async () => {
    vi.spyOn(registry, "fetchRegistryEntry").mockResolvedValue({
      ...mockRegistryEntry,
      keywords: undefined,
    });
    const result = await infoCommand("@johndoe/nextjs-supabase-saas");
    expect(result.keywords).toEqual([]);
  });

  it("throws CliError for an invalid package argument format", async () => {
    await expect(infoCommand("not-a-valid-ref")).rejects.toBeInstanceOf(CliError);
  });

  it("propagates CliError when the package is not found", async () => {
    vi.spyOn(registry, "fetchRegistryEntry").mockRejectedValue(
      new CliError("Package @johndoe/missing not found. Check the name and try again."),
    );
    await expect(infoCommand("@johndoe/missing")).rejects.toBeInstanceOf(CliError);
  });
});
