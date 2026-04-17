import {
  fetchJson,
  fetchText,
  indexUrl,
  registryManifestUrl,
  repoFileUrl,
  joinRepoPath,
} from "./fetch.js";
import type { PackageIndex, RegistryEntry, TarsHubJson } from "./types.js";
import { CliError } from "./errors.js";
import { suggestPackageIdWithoutBranchSegment } from "./utils.js";

export async function fetchRegistryEntry(packageId: string): Promise<RegistryEntry> {
  const url = registryManifestUrl(packageId);
  try {
    return await fetchJson<RegistryEntry>(url);
  } catch (err: unknown) {
    const e = err as Error & { status?: number };
    if (e.status === 404) {
      const alt = suggestPackageIdWithoutBranchSegment(packageId);
      const hint =
        alt != null
          ? ` In GitHub URLs, "main"/"master" is the branch, not a folder — try @${alt} if that matches the folder you want.`
          : "";
      throw new CliError(
        `Package @${packageId} not found on TarsHub.${hint} Or submit the repo at https://tarshub.com/publish`,
      );
    }
    throw new CliError(e.message ?? "Network error. Check your connection and try again.");
  }
}

/**
 * Find a ref (branch or tag) that contains the first listed file.
 * `githubRepo` is always `owner/repo`; `pathInRepo` is the package root inside the repo (may be empty).
 */
export async function resolveContentBranch(
  githubRepo: string,
  pathInRepo: string,
  sampleFile: string,
  version?: string,
): Promise<string> {
  const rel = joinRepoPath(pathInRepo || undefined, sampleFile);
  const branches = version ? [`v${version}`, version, "main", "master"] : ["main", "master"];
  for (const b of branches) {
    const { ok } = await fetchText(repoFileUrl(githubRepo, b, rel));
    if (ok) return b;
  }
  throw new CliError(
    `Could not find ${sampleFile} in ${githubRepo} (tried: ${branches.join(", ")}).`,
  );
}

/** Fetch tarshub.json from a developer repo root (optional helper; install uses registry manifest). */
export async function fetchTarsHubJson(
  repo: string,
  version?: string,
): Promise<{ manifest: TarsHubJson; branch: string }> {
  const branches = version ? [`v${version}`, version] : ["main", "master"];

  for (const branch of branches) {
    const url = repoFileUrl(repo, branch, "tarshub.json");
    let result: { ok: boolean; text: string };
    try {
      result = await fetchText(url);
    } catch (err: unknown) {
      throw new CliError((err as Error).message);
    }
    if (!result.ok) continue;
    try {
      const manifest = JSON.parse(result.text) as TarsHubJson;
      return { manifest, branch };
    } catch {
      throw new CliError("Invalid tarshub.json in package repository.");
    }
  }

  if (version) {
    throw new CliError(
      `Version ${version} not found. Make sure the repo has a git tag v${version} or ${version}.`,
    );
  }
  throw new CliError("No tarshub.json found in the package repository.");
}

export async function fetchPackageIndex(): Promise<PackageIndex> {
  try {
    return await fetchJson<PackageIndex>(indexUrl());
  } catch (err: unknown) {
    throw new CliError((err as Error).message ?? "Network error. Check your connection and try again.");
  }
}
