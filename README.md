# tarshub

Install agent context packages from [TarsHub](https://tarshub.com) — the free, community-driven registry for AI coding agent context files.

## Usage

Package references mirror GitHub: `@<owner>/<repo>` or `@<owner>/<repo>/<subpath>` for a folder inside a repo.

```bash
npx tarshub @<github-username>/<repo>[/<subpath>]
# same as:
npx tarshub install @<github-username>/<repo>[/<subpath>]
```

You can omit the `install` subcommand when the first argument looks like a package ref (`owner/repo` with a slash).

## Commands

### `install` (or shorthand)

Download and write context files into your current project directory.

```bash
npx tarshub @johndoe/my-repo
npx tarshub @PatrickJS/awesome-cursorrules/rules/htmx-flask
npx tarshub install @johndoe/my-repo --force
```

**Flags:**

| Flag | Description |
|---|---|
| `--force` | Overwrite existing files without prompting |
| `--dry-run` | Preview what would be installed without writing any files |
| `--version <tag>` | Install a specific version (git tag, e.g. `1.2.0`) |

### `info`

Show package metadata without installing.

```bash
npx tarshub info @johndoe/my-repo
```

### `search`

Search packages by keyword.

```bash
npx tarshub search nextjs
```

### Version

```bash
npx tarshub --version
```

## How it works

1. Loads the package manifest from the [TarsHub registry](https://github.com/tarshub/registry) at `packages/<owner>/<repo>/tarshub.json` (or nested paths for subfolder packages).
2. Reads the `files` list and `repo` / `subpath` from that manifest.
3. Downloads each file from `raw.githubusercontent.com` on the default branch (or tag when using `--version`).
4. Writes the files into your current directory.

The CLI talks **only** to `raw.githubusercontent.com` — no TarsHub servers are contacted.

## Security

- Only plain-text file types are downloaded: `.md`, `.mdc`, `.txt`, `.json`, `.yaml`, `.yml`, `.toml`
- Individual files are capped at 50 KB; total package at 500 KB
- Path traversal attempts in file paths are rejected
- Existing files are never silently overwritten (use `--force` to opt in)

## Publishing packages

Publishing is done through [tarshub.com](https://tarshub.com), not this CLI. Submit your public GitHub repo URL on the website.

## Requirements

Node.js 18 or later.

## License

MIT
