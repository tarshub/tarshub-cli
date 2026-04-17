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
  /** `owner/repo` or `owner/repo/nested/path` for packages in a subfolder. */
  repo: string;
}

export interface IndexPackage {
  id: string;
  name: string;
  author: string;
  avatar: string;
  repo: string;
  description: string;
  keywords?: string[];
  files: number;
  version?: string;
}

export interface PackageIndex {
  updated: string;
  packages: IndexPackage[];
}
