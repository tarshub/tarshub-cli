import { describe, it, expect } from "vitest";
import {
  isAllowedExtension,
  getDirectoryDepth,
  isSafePath,
  validateFilePath,
  validateFileCount,
  validateFileSize,
  validateTotalSize,
  MAX_FILE_SIZE,
  MAX_TOTAL_SIZE,
  MAX_FILES,
  MAX_DEPTH,
} from "../src/validate.js";

describe("isAllowedExtension", () => {
  it.each([".md", ".mdc", ".txt", ".json", ".yaml", ".yml", ".toml"])(
    "allows %s",
    (ext) => {
      expect(isAllowedExtension(`file${ext}`)).toBe(true);
    },
  );

  it.each([".js", ".ts", ".py", ".sh", ".exe", ".html", ".css"])(
    "rejects %s",
    (ext) => {
      expect(isAllowedExtension(`file${ext}`)).toBe(false);
    },
  );

  it("is case-insensitive", () => {
    expect(isAllowedExtension("README.MD")).toBe(true);
    expect(isAllowedExtension("data.JSON")).toBe(true);
    expect(isAllowedExtension("file.JS")).toBe(false);
  });

  it("returns false when there is no extension", () => {
    expect(isAllowedExtension("Makefile")).toBe(false);
    expect(isAllowedExtension("README")).toBe(false);
  });
});

describe("getDirectoryDepth", () => {
  it("returns 0 for a root-level file", () => {
    expect(getDirectoryDepth("AGENTS.md")).toBe(0);
  });

  it("returns 1 for one directory deep", () => {
    expect(getDirectoryDepth(".cursor/rules.mdc")).toBe(1);
  });

  it("returns 2 for two directories deep", () => {
    expect(getDirectoryDepth(".cursor/rules/general.mdc")).toBe(2);
  });

  it("returns 3 for three directories deep", () => {
    expect(getDirectoryDepth("a/b/c/deep.md")).toBe(3);
  });

  it("normalises backslashes", () => {
    expect(getDirectoryDepth(".cursor\\rules\\general.mdc")).toBe(2);
  });
});

describe("isSafePath", () => {
  it("accepts normal relative paths", () => {
    expect(isSafePath("AGENTS.md")).toBe(true);
    expect(isSafePath(".cursor/rules/general.mdc")).toBe(true);
    expect(isSafePath("tasks/setup.md")).toBe(true);
  });

  it("rejects paths with ..", () => {
    expect(isSafePath("../secret.md")).toBe(false);
    expect(isSafePath("tasks/../../etc/passwd")).toBe(false);
  });

  it("rejects absolute Unix paths", () => {
    expect(isSafePath("/etc/passwd")).toBe(false);
  });

  it("rejects absolute Windows paths", () => {
    expect(isSafePath("C:\\secret.txt")).toBe(false);
    expect(isSafePath("C:/secret.txt")).toBe(false);
  });

  it("rejects backslash-absolute paths", () => {
    expect(isSafePath("\\etc\\passwd")).toBe(false);
  });

  it("rejects home-directory shortcuts", () => {
    expect(isSafePath("~/.ssh/id_rsa")).toBe(false);
  });
});

describe("validateFilePath", () => {
  it("passes for a valid file", () => {
    const result = validateFilePath(".cursor/rules/general.mdc");
    expect(result.valid).toBe(true);
  });

  it("fails for a path-traversal attempt", () => {
    const result = validateFilePath("../evil.md");
    expect(result.valid).toBe(false);
    if (!result.valid) expect(result.reason).toMatch(/unsafe path/i);
  });

  it("fails for a disallowed extension", () => {
    const result = validateFilePath("script.sh");
    expect(result.valid).toBe(false);
    if (!result.valid) expect(result.reason).toMatch(/disallowed/i);
  });

  it("fails when the path is too deep", () => {
    const result = validateFilePath("a/b/c/d/deep.md");
    expect(result.valid).toBe(false);
    if (!result.valid) expect(result.reason).toMatch(/depth/i);
  });
});

describe("validateFileCount", () => {
  it("passes when count is within the limit", () => {
    expect(validateFileCount(0).valid).toBe(true);
    expect(validateFileCount(MAX_FILES).valid).toBe(true);
  });

  it("fails when count exceeds the limit", () => {
    const result = validateFileCount(MAX_FILES + 1);
    expect(result.valid).toBe(false);
    if (!result.valid) expect(result.reason).toMatch(/too many files/i);
  });
});

describe("validateFileSize", () => {
  it("passes when size is within the limit", () => {
    expect(validateFileSize(0, "file.md").valid).toBe(true);
    expect(validateFileSize(MAX_FILE_SIZE, "file.md").valid).toBe(true);
  });

  it("fails when file exceeds 50 KB", () => {
    const result = validateFileSize(MAX_FILE_SIZE + 1, "big.md");
    expect(result.valid).toBe(false);
    if (!result.valid) {
      expect(result.reason).toMatch(/50 kb/i);
      expect(result.reason).toContain("big.md");
    }
  });
});

describe("validateTotalSize", () => {
  it("passes when total is within the limit", () => {
    expect(validateTotalSize(0).valid).toBe(true);
    expect(validateTotalSize(MAX_TOTAL_SIZE).valid).toBe(true);
  });

  it("fails when total exceeds 500 KB", () => {
    const result = validateTotalSize(MAX_TOTAL_SIZE + 1);
    expect(result.valid).toBe(false);
    if (!result.valid) expect(result.reason).toMatch(/500 kb/i);
  });
});
