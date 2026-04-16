import { describe, it, expect, vi, afterEach } from "vitest";
import { searchCommand } from "../../src/commands/search.js";
import * as registry from "../../src/registry.js";
import type { PackageIndex } from "../../src/types.js";

afterEach(() => {
  vi.restoreAllMocks();
});

const mockIndex: PackageIndex = {
  updated: "2026-04-15T00:00:00Z",
  packages: [
    {
      id: "johndoe/nextjs-supabase-saas",
      name: "nextjs-supabase-saas",
      author: "johndoe",
      avatar: "https://avatars.githubusercontent.com/johndoe",
      repo: "johndoe/tarshub-nextjs-supabase-saas",
      description: "Full SaaS context for Next.js + Supabase",
      keywords: ["nextjs", "supabase", "saas", "tailwind"],
      files: 4,
      version: "1.0.0",
    },
    {
      id: "janecoder/nextjs-prisma",
      name: "nextjs-prisma",
      author: "janecoder",
      avatar: "https://avatars.githubusercontent.com/janecoder",
      repo: "janecoder/tarshub-nextjs-prisma",
      description: "Next.js + Prisma ORM context package",
      keywords: ["nextjs", "prisma", "orm"],
      files: 3,
      version: "1.0.0",
    },
    {
      id: "vikram/fastapi-starter",
      name: "fastapi-starter",
      author: "vikram",
      avatar: "https://avatars.githubusercontent.com/vikram",
      repo: "vikram/tarshub-fastapi-starter",
      description: "FastAPI + Python starter context",
      keywords: ["fastapi", "python"],
      files: 2,
      version: "0.1.0",
    },
  ],
};

function mockFetchIndex() {
  vi.spyOn(registry, "fetchPackageIndex").mockResolvedValue(mockIndex);
}

describe("searchCommand", () => {
  it("returns all matching packages for a broad keyword", async () => {
    mockFetchIndex();
    const result = await searchCommand("nextjs");
    expect(result.query).toBe("nextjs");
    expect(result.packages).toHaveLength(2);
    expect(result.packages.map((p) => p.name)).toContain("nextjs-supabase-saas");
    expect(result.packages.map((p) => p.name)).toContain("nextjs-prisma");
  });

  it("matches against the description field", async () => {
    mockFetchIndex();
    const result = await searchCommand("prisma orm");
    expect(result.packages).toHaveLength(1);
    expect(result.packages[0].name).toBe("nextjs-prisma");
  });

  it("matches against the keywords field", async () => {
    mockFetchIndex();
    const result = await searchCommand("saas");
    expect(result.packages).toHaveLength(1);
    expect(result.packages[0].name).toBe("nextjs-supabase-saas");
  });

  it("matches against the author field", async () => {
    mockFetchIndex();
    const result = await searchCommand("vikram");
    expect(result.packages).toHaveLength(1);
    expect(result.packages[0].author).toBe("vikram");
  });

  it("is case-insensitive", async () => {
    mockFetchIndex();
    const result = await searchCommand("NEXTJS");
    expect(result.packages).toHaveLength(2);
  });

  it("returns an empty array when nothing matches", async () => {
    mockFetchIndex();
    const result = await searchCommand("ruby-on-rails");
    expect(result.packages).toHaveLength(0);
  });

  it("propagates errors from the registry", async () => {
    vi.spyOn(registry, "fetchPackageIndex").mockRejectedValue(
      new Error("Network error"),
    );
    await expect(searchCommand("nextjs")).rejects.toThrow("Network error");
  });
});
