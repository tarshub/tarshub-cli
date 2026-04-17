export interface TarsHubJson {
  name: string;
  description: string;
  version?: string;
  keywords?: string[];
  listed?: boolean;
  files: string[];
}

/** Shape of packages/.../tarshub.json in tarshub/registry */
export interface RegistryEntry extends TarsHubJson {
  /** `owner/repo` or merged `owner/repo/nested/path` (preferred). */
  repo: string;
  /** Legacy: path inside repo when `repo` was only `owner/repo`. Omit when using merged `repo`. */
  subpath?: string;
}

export interface IndexPackage {
  id: string;
  name: string;
  author: string;
  avatar: string;
  repo: string;
  subpath?: string;
  description: string;
  keywords?: string[];
  files: number;
  version?: string;
}

export interface PackageIndex {
  updated: string;
  packages: IndexPackage[];
}
