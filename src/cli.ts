import * as fs from "node:fs";
import * as path from "node:path";
import { fileURLToPath } from "node:url";
import { installCommand } from "./commands/install.js";
import { infoCommand } from "./commands/info.js";
import { searchCommand } from "./commands/search.js";
import { CliError } from "./errors.js";
import { looksLikePackageRef } from "./utils.js";

function getVersion(): string {
  try {
    const __dirname = path.dirname(fileURLToPath(import.meta.url));
    const pkgPath = path.resolve(__dirname, "../package.json");
    const pkg = JSON.parse(fs.readFileSync(pkgPath, "utf8")) as { version: string };
    return pkg.version;
  } catch {
    return "unknown";
  }
}

function printHelp(version: string): void {
  console.log(`
tarshub v${version} — Agent context package manager

Usage:
  npx tarshub @<github-username>/<repo>[/<subpath>] [flags]
  npx tarshub install @<github-username>/<repo>[/<subpath>] [flags]
  npx tarshub info    @<github-username>/<repo>[/<subpath>]
  npx tarshub search  <query>

Commands:
  (shorthand)  Same as install — first argument is a package ref like @owner/repo
  install      Install a context package into the current directory
  info         Show package metadata without installing
  search       Search packages by keyword

Flags (install only):
  --force              Overwrite all existing files without prompting (no y/n/a questions)
  --dry-run            Preview what would be installed without writing files
  --version <tag>      Install a specific version (git tag)

When a file exists and --force is not used, you are prompted: [y]es this file,
[n]o skip, or [a]ll remaining (overwrite every other conflict in this run).

Examples:
  npx tarshub @johndoe/my-repo
  npx tarshub @PatrickJS/awesome-cursorrules/rules/htmx-flask
  npx tarshub install @johndoe/my-repo --force
  npx tarshub install @johndoe/my-repo --version 1.2.0
  npx tarshub info @johndoe/my-repo
  npx tarshub search nextjs

Learn more: https://tarshub.com
`);
}

function printInstallResult(result: Awaited<ReturnType<typeof installCommand>>, dryRun: boolean): void {
  for (const w of result.warnings) {
    console.warn(`  Warning: ${w}`);
  }

  if (dryRun) {
    console.log(`\nDry run — ${result.packageArg} v${result.version}`);
    console.log(`\nFiles that would be written (${result.written.length}):`);
    for (const f of result.written) console.log(`  ${f}`);
    if (result.skipped.length > 0) {
      console.log(`\nFiles that already exist (${result.skipped.length}):`);
      for (const f of result.skipped) console.log(`  ${f}  (would prompt)`);
    }
    return;
  }

  console.log(`\nInstalled ${result.packageArg} v${result.version}`);
  if (result.written.length > 0) {
    console.log(
      `${result.written.length} file${result.written.length !== 1 ? "s" : ""} added to your project:`,
    );
    for (const f of result.written) console.log(`  ${f}`);
  }
  if (result.skipped.length > 0) {
    console.log(
      `${result.skipped.length} file${result.skipped.length !== 1 ? "s" : ""} skipped:`,
    );
    for (const f of result.skipped) console.log(`  ${f}`);
  }
}

function printInfoResult(result: Awaited<ReturnType<typeof infoCommand>>): void {
  console.log(`\n${result.packageArg} v${result.version}`);
  console.log(`\n${result.description}`);
  console.log(`\nFiles (${result.files.length}):`);
  for (const f of result.files) console.log(`  ${f}`);
  if (result.keywords.length > 0) {
    console.log(`\nKeywords: ${result.keywords.join(", ")}`);
  }
  console.log(`Repo:     https://github.com/${result.repo}`);
  if (result.subpath) {
    console.log(`Subpath:  ${result.subpath}`);
  }
  console.log(`Install:  npx tarshub ${result.packageArg}\n`);
}

function printSearchResult(result: Awaited<ReturnType<typeof searchCommand>>): void {
  if (result.packages.length === 0) {
    console.log(`\nNo packages found matching "${result.query}".`);
    console.log(`Browse all packages at https://tarshub.com\n`);
    return;
  }
  const count = result.packages.length;
  console.log(`\nFound ${count} package${count !== 1 ? "s" : ""} matching "${result.query}":\n`);
  const labelFor = (p: (typeof result.packages)[0]) =>
    p.id ? `@${p.id}` : `@${p.author}/${p.name}`;
  const maxLen = Math.max(...result.packages.map((p) => labelFor(p).length), 1);
  for (const pkg of result.packages) {
    const label = labelFor(pkg);
    console.log(`  ${label.padEnd(maxLen + 2)}${pkg.description}`);
  }
  console.log();
}

async function main(): Promise<void> {
  const args = process.argv.slice(2);
  const version = getVersion();

  if (args.length === 0 || args[0] === "--help" || args[0] === "-h") {
    printHelp(version);
    return;
  }

  if (args[0] === "--version" || args[0] === "-v") {
    console.log(`tarshub v${version}`);
    return;
  }

  const [command, ...rest] = args;

  if (command === "install") {
    const packageArg = rest[0];
    if (!packageArg || packageArg.startsWith("--")) {
      throw new CliError(
        "Missing package argument.\nUsage: npx tarshub install @<github-username>/<repo>[/<subpath>]",
      );
    }
    const force = rest.includes("--force");
    const dryRun = rest.includes("--dry-run");
    const versionIdx = rest.indexOf("--version");
    const pkgVersion = versionIdx !== -1 ? rest[versionIdx + 1] : undefined;

    const result = await installCommand(packageArg, { force, dryRun, version: pkgVersion });
    printInstallResult(result, dryRun);
    return;
  }

  if (command === "info") {
    const packageArg = rest[0];
    if (!packageArg || packageArg.startsWith("--")) {
      throw new CliError(
        "Missing package argument.\nUsage: npx tarshub info @<github-username>/<repo>[/<subpath>]",
      );
    }
    const result = await infoCommand(packageArg);
    printInfoResult(result);
    return;
  }

  if (command === "search") {
    const query = rest.join(" ").trim();
    if (!query) {
      throw new CliError("Missing search query.\nUsage: npx tarshub search <query>");
    }
    const result = await searchCommand(query);
    printSearchResult(result);
    return;
  }

  // Shorthand: npx tarshub @owner/repo[/subpath] [--flags]
  if (looksLikePackageRef(command)) {
    const packageArg = command;
    const restFlags = rest;
    const force = restFlags.includes("--force");
    const dryRun = restFlags.includes("--dry-run");
    const versionIdx = restFlags.indexOf("--version");
    const pkgVersion = versionIdx !== -1 ? restFlags[versionIdx + 1] : undefined;

    const result = await installCommand(packageArg, { force, dryRun, version: pkgVersion });
    printInstallResult(result, dryRun);
    return;
  }

  throw new CliError(`Unknown command: "${command}"\nRun "npx tarshub" for usage.`);
}

main().catch((err: unknown) => {
  if (err instanceof CliError) {
    console.error(`Error: ${err.message}`);
    process.exit(err.exitCode);
  }
  console.error("Unexpected error:", (err as Error).message ?? err);
  process.exit(1);
});
