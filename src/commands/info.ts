import { fetchRegistryEntry } from "../registry.js";
import { parsePackageArg } from "../utils.js";
import { CliError } from "../errors.js";

export interface InfoResult {
  packageArg: string;
  version: string;
  description: string;
  files: string[];
  keywords: string[];
  repo: string;
  subpath: string;
}

export async function infoCommand(packageArg: string): Promise<InfoResult> {
  const parsed = parsePackageArg(packageArg);
  if (!parsed) {
    throw new CliError(
      `Invalid package format "${packageArg}". Use: @<github-username>/<repo>[/<subpath>]`,
    );
  }

  const registryEntry = await fetchRegistryEntry(parsed.id);

  return {
    packageArg: parsed.display,
    version: registryEntry.version ?? "latest",
    description: registryEntry.description,
    files: registryEntry.files ?? [],
    keywords: registryEntry.keywords ?? [],
    repo: registryEntry.repo,
    subpath: registryEntry.subpath ?? "",
  };
}
