import * as fs from "node:fs";
import * as path from "node:path";
import * as readline from "node:readline";
import { fetchText, repoFileUrl, joinRepoPath } from "../fetch.js";
import { fetchRegistryEntry, resolveContentBranch } from "../registry.js";
import { parsePackageArg, githubLocationFromRegistryEntry } from "../utils.js";
import {
  validateFileCount,
  validateFilePath,
  validateFileSize,
  validateTotalSize,
} from "../validate.js";
import { CliError } from "../errors.js";

export interface InstallOptions {
  force?: boolean;
  dryRun?: boolean;
  version?: string;
}

export interface InstallResult {
  packageArg: string;
  version: string;
  written: string[];
  skipped: string[];
  warnings: string[];
}

type OverwriteAll = { value: boolean };

/**
 * Ask whether to overwrite one file, or all remaining conflicts.
 * `a` / `all` sets the ref so later files skip the prompt.
 */
async function promptOverwrite(filePath: string, overwriteAll: OverwriteAll): Promise<boolean> {
  if (overwriteAll.value) return true;
  if (!process.stdin.isTTY) return false;
  return new Promise((resolve) => {
    const rl = readline.createInterface({
      input: process.stdin,
      output: process.stdout,
    });
    rl.question(
      `File ${filePath} already exists. Overwrite? [y]es / [n]o / [a]ll remaining: `,
      (answer) => {
        rl.close();
        const a = answer.trim().toLowerCase();
        if (a === "a" || a === "all") {
          overwriteAll.value = true;
          resolve(true);
        } else if (a === "y" || a === "yes") {
          resolve(true);
        } else {
          resolve(false);
        }
      },
    );
  });
}

export async function installCommand(
  packageArg: string,
  options: InstallOptions = {},
): Promise<InstallResult> {
  const parsed = parsePackageArg(packageArg);
  if (!parsed) {
    throw new CliError(
      `Invalid package format "${packageArg}". Use @owner/repo or @owner/repo/path/to/package — not GitHub blob/tree URLs.`,
    );
  }

  const warnings: string[] = [];

  const registryEntry = await fetchRegistryEntry(parsed.id);
  const { githubRepo, pathInRepo } = githubLocationFromRegistryEntry(registryEntry);

  const allFiles = registryEntry.files ?? [];
  if (allFiles.length === 0) {
    throw new CliError("No files listed in the TarsHub registry manifest for this package.");
  }

  const countCheck = validateFileCount(allFiles.length);
  if (!countCheck.valid) {
    throw new CliError(`Error: ${countCheck.reason}`);
  }

  const validFiles: string[] = [];
  for (const filePath of allFiles) {
    const result = validateFilePath(filePath);
    if (!result.valid) {
      warnings.push(`Skipping ${filePath} — ${result.reason}`);
    } else {
      validFiles.push(filePath);
    }
  }

  if (validFiles.length === 0) {
    throw new CliError("No valid files to install after validation.");
  }

  const displayArg = parsed.display;

  if (options.dryRun) {
    const drySkipped: string[] = [];
    for (const f of validFiles) {
      if (fs.existsSync(path.join(process.cwd(), f))) {
        drySkipped.push(f);
      }
    }
    return {
      packageArg: displayArg,
      version: registryEntry.version ?? "latest",
      written: validFiles.filter((f) => !drySkipped.includes(f)),
      skipped: drySkipped,
      warnings,
    };
  }

  const branch = await resolveContentBranch(githubRepo, pathInRepo, validFiles[0], options.version);

  let totalBytes = 0;
  const fileContents: Array<{ filePath: string; content: string }> = [];

  for (const filePath of validFiles) {
    const rel = joinRepoPath(pathInRepo || undefined, filePath);
    const url = repoFileUrl(githubRepo, branch, rel);
    let ok: boolean;
    let text: string;
    try {
      ({ ok, text } = await fetchText(url));
    } catch (err: unknown) {
      warnings.push(`Network error fetching ${filePath}, skipping.`);
      continue;
    }

    if (!ok) {
      warnings.push(`File ${filePath} not found in repository, skipping.`);
      continue;
    }

    const bytes = Buffer.byteLength(text, "utf8");
    const sizeCheck = validateFileSize(bytes, filePath);
    if (!sizeCheck.valid) {
      warnings.push(`${sizeCheck.reason} Skipping.`);
      continue;
    }

    totalBytes += bytes;
    const totalCheck = validateTotalSize(totalBytes);
    if (!totalCheck.valid) {
      throw new CliError(`Error: ${totalCheck.reason}`);
    }

    fileContents.push({ filePath, content: text });
  }

  const written: string[] = [];
  const skipped: string[] = [];
  const overwriteAll: OverwriteAll = { value: false };

  for (const { filePath, content } of fileContents) {
    const destPath = path.join(process.cwd(), filePath);
    const exists = fs.existsSync(destPath);

    if (exists && !options.force) {
      const overwrite = await promptOverwrite(filePath, overwriteAll);
      if (!overwrite) {
        skipped.push(filePath);
        continue;
      }
    }

    fs.mkdirSync(path.dirname(destPath), { recursive: true });
    fs.writeFileSync(destPath, content, "utf8");
    written.push(filePath);
  }

  return {
    packageArg: displayArg,
    version: registryEntry.version ?? "latest",
    written,
    skipped,
    warnings,
  };
}
