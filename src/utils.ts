export interface ParsedPackageArg {
  /**
   * Normalized package id without @, mirrors registry + GitHub:
   * `owner/repo` or `owner/repo/nested/subfolder` (never use `blob/` or `tree/` — those are website-only).
   */
  id: string;
  /** Display form with leading @ */
  display: string;
}

/** First two segments = GitHub `owner/repo`; remainder = path inside that repo. */
export function splitRepoRef(fullSlug: string): { githubRepo: string; pathInRepo: string } {
  const parts = fullSlug.split("/").filter(Boolean);
  if (parts.length < 2) {
    return { githubRepo: fullSlug, pathInRepo: "" };
  }
  const githubRepo = `${parts[0]}/${parts[1]}`;
  const pathInRepo = parts.slice(2).join("/");
  return { githubRepo, pathInRepo };
}

/** Common default branch names that appear in github.com/.../tree/<branch>/path but are not folder names. */
const BRANCH_LIKE_SEGMENT = new Set(["main", "master", "develop"]);

/**
 * If the id looks like owner/repo/<branch>/rest, suggest owner/repo/rest — branch is not part of the TarsHub path.
 */
export function suggestPackageIdWithoutBranchSegment(packageId: string): string | null {
  const parts = packageId.split("/").filter(Boolean);
  if (parts.length < 3 || !BRANCH_LIKE_SEGMENT.has(parts[2])) return null;
  const rest = parts.slice(3);
  if (rest.length === 0) return `${parts[0]}/${parts[1]}`;
  return [parts[0], parts[1], ...rest].join("/");
}

/**
 * Parse @owner/repo or @owner/repo/sub/path (or the same without @).
 * Rejects empty segments and path traversal.
 */
export function parsePackageArg(arg: string): ParsedPackageArg | null {
  const trimmed = arg.trim();
  if (!trimmed) return null;

  const withoutAt = trimmed.startsWith("@") ? trimmed.slice(1) : trimmed;
  const parts = withoutAt.split("/").filter((p) => p.length > 0);
  if (parts.length < 2) return null;

  for (const p of parts) {
    if (p === "." || p === ".." || p.includes("..")) return null;
  }

  const id = parts.join("/");
  if (id.includes("/blob/") || id.includes("/tree/")) {
    return null;
  }
  return { id, display: `@${id}` };
}

/** True if the first CLI token looks like a package ref (implicit install). */
export function looksLikePackageRef(arg: string): boolean {
  const t = arg.trim();
  if (!t || t.startsWith("-")) return false;
  const reserved = new Set([
    "install",
    "info",
    "search",
    "--help",
    "-h",
    "--version",
    "-v",
  ]);
  if (reserved.has(t)) return false;
  const withoutAt = t.startsWith("@") ? t.slice(1) : t;
  return withoutAt.includes("/");
}
