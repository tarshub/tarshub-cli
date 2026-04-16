export interface ParsedPackageArg {
  /**
   * Normalized package id without @, mirrors registry + GitHub:
   * `owner/repo` or `owner/repo/nested/subfolder`
   */
  id: string;
  /** Display form with leading @ */
  display: string;
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
