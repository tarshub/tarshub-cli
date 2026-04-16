export const ALLOWED_EXTENSIONS = new Set([
  ".md",
  ".mdc",
  ".txt",
  ".json",
  ".yaml",
  ".yml",
  ".toml",
]);

export const MAX_FILE_SIZE = 50 * 1024;   // 50 KB
export const MAX_TOTAL_SIZE = 500 * 1024; // 500 KB
export const MAX_FILES = 50;
export const MAX_DEPTH = 2;

export type ValidationResult =
  | { valid: true }
  | { valid: false; reason: string };

export function isAllowedExtension(filePath: string): boolean {
  const lastDot = filePath.lastIndexOf(".");
  if (lastDot === -1) return false;
  const ext = filePath.slice(lastDot).toLowerCase();
  return ALLOWED_EXTENSIONS.has(ext);
}

/** Number of directory separators = depth (e.g. "a/b/c.md" → depth 2). */
export function getDirectoryDepth(filePath: string): number {
  return filePath.replace(/\\/g, "/").split("/").length - 1;
}

export function isSafePath(filePath: string): boolean {
  if (filePath.includes("..")) return false;
  if (filePath.startsWith("/") || filePath.startsWith("\\")) return false;
  if (/^[A-Za-z]:[/\\]/.test(filePath)) return false;
  if (filePath.startsWith("~")) return false;
  return true;
}

export function validateFilePath(filePath: string): ValidationResult {
  if (!isSafePath(filePath)) {
    return { valid: false, reason: `Unsafe path: ${filePath}` };
  }
  if (!isAllowedExtension(filePath)) {
    return { valid: false, reason: `Disallowed file extension: ${filePath}` };
  }
  if (getDirectoryDepth(filePath) > MAX_DEPTH) {
    return {
      valid: false,
      reason: `Path exceeds max depth of ${MAX_DEPTH} levels: ${filePath}`,
    };
  }
  return { valid: true };
}

export function validateFileCount(count: number): ValidationResult {
  if (count > MAX_FILES) {
    return {
      valid: false,
      reason: `Package has too many files (${count} > ${MAX_FILES} max).`,
    };
  }
  return { valid: true };
}

export function validateFileSize(bytes: number, filePath: string): ValidationResult {
  if (bytes > MAX_FILE_SIZE) {
    return {
      valid: false,
      reason: `File ${filePath} exceeds the 50 KB size limit.`,
    };
  }
  return { valid: true };
}

export function validateTotalSize(bytes: number): ValidationResult {
  if (bytes > MAX_TOTAL_SIZE) {
    return { valid: false, reason: `Package exceeds the 500 KB total size limit.` };
  }
  return { valid: true };
}
