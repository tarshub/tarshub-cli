import { describe, it, expect } from "vitest";
import {
  parsePackageArg,
  looksLikePackageRef,
  splitRepoRef,
  githubLocationFromRegistryEntry,
  suggestPackageIdWithoutBranchSegment,
} from "../src/utils.js";

describe("parsePackageArg", () => {
  it("parses @owner/repo", () => {
    expect(parsePackageArg("@johndoe/nextjs-supabase-saas")).toEqual({
      id: "johndoe/nextjs-supabase-saas",
      display: "@johndoe/nextjs-supabase-saas",
    });
  });

  it("parses owner/repo without @", () => {
    expect(parsePackageArg("johndoe/nextjs-supabase-saas")).toEqual({
      id: "johndoe/nextjs-supabase-saas",
      display: "@johndoe/nextjs-supabase-saas",
    });
  });

  it("parses nested subpaths", () => {
    expect(
      parsePackageArg("@PatrickJS/awesome-cursorrules/rules/htmx-flask"),
    ).toEqual({
      id: "PatrickJS/awesome-cursorrules/rules/htmx-flask",
      display: "@PatrickJS/awesome-cursorrules/rules/htmx-flask",
    });
  });

  it("allows GitHub-style repo names (case, underscores)", () => {
    expect(parsePackageArg("@johndoe/MyPkg")).toEqual({
      id: "johndoe/MyPkg",
      display: "@johndoe/MyPkg",
    });
    expect(parsePackageArg("@johndoe/my_pkg")).toEqual({
      id: "johndoe/my_pkg",
      display: "@johndoe/my_pkg",
    });
  });

  it("returns null when the slash is missing", () => {
    expect(parsePackageArg("@johndoe-my-pkg")).toBeNull();
  });

  it("returns null for an empty string", () => {
    expect(parsePackageArg("")).toBeNull();
  });

  it("returns null for path traversal segments", () => {
    expect(parsePackageArg("@johndoe/../evil")).toBeNull();
  });

  it("returns null for GitHub blob/tree URL segments", () => {
    expect(
      parsePackageArg(
        "@PatrickJS/awesome-cursorrules/blob/main/rules/react-mobx-cursorrules-prompt-file",
      ),
    ).toBeNull();
  });
});

describe("splitRepoRef", () => {
  it("splits owner/repo from nested path", () => {
    expect(splitRepoRef("PatrickJS/awesome-cursorrules/rules/foo")).toEqual({
      githubRepo: "PatrickJS/awesome-cursorrules",
      pathInRepo: "rules/foo",
    });
  });

  it("handles two segments only", () => {
    expect(splitRepoRef("johndoe/pkg")).toEqual({
      githubRepo: "johndoe/pkg",
      pathInRepo: "",
    });
  });
});

describe("githubLocationFromRegistryEntry", () => {
  it("uses merged repo when subpath is absent", () => {
    expect(
      githubLocationFromRegistryEntry({
        repo: "PatrickJS/awesome-cursorrules/rules/foo",
      }),
    ).toEqual({
      githubRepo: "PatrickJS/awesome-cursorrules",
      pathInRepo: "rules/foo",
    });
  });

  it("merges legacy repo + subpath", () => {
    expect(
      githubLocationFromRegistryEntry({
        repo: "PatrickJS/awesome-cursorrules",
        subpath: "rules/foo",
      }),
    ).toEqual({
      githubRepo: "PatrickJS/awesome-cursorrules",
      pathInRepo: "rules/foo",
    });
  });
});

describe("suggestPackageIdWithoutBranchSegment", () => {
  it("strips main after owner/repo", () => {
    expect(
      suggestPackageIdWithoutBranchSegment(
        "PatrickJS/awesome-cursorrules/main/rules/react-mobx-cursorrules-prompt-file",
      ),
    ).toBe("PatrickJS/awesome-cursorrules/rules/react-mobx-cursorrules-prompt-file");
  });

  it("returns null when no branch-like segment", () => {
    expect(suggestPackageIdWithoutBranchSegment("PatrickJS/awesome-cursorrules/rules/foo")).toBeNull();
  });
});

describe("looksLikePackageRef", () => {
  it("returns true for @owner/repo", () => {
    expect(looksLikePackageRef("@johndoe/pkg")).toBe(true);
  });

  it("returns true for owner/repo without @", () => {
    expect(looksLikePackageRef("johndoe/pkg")).toBe(true);
  });

  it("returns false for reserved commands", () => {
    expect(looksLikePackageRef("install")).toBe(false);
    expect(looksLikePackageRef("search")).toBe(false);
  });
});
