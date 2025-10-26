interface NodeVersion {
  major: number;
  minor: number;
  patch: number;
}

export const parseNodeVersion = (versionString: string): NodeVersion => {
  const match = versionString.match(/^v?(\d+)\.(\d+)\.(\d+)/);
  if (!match) {
    return { major: 0, minor: 0, patch: 0 };
  }
  return {
    major: parseInt(match[1], 10),
    minor: parseInt(match[2], 10),
    patch: parseInt(match[3], 10),
  };
};

export const isNodeVersionAtLeast = (
  major: number,
  minor: number = 0,
  patch: number = 0
): boolean => {
  if (typeof process === "undefined" || !process.version) {
    return false;
  }

  const current = parseNodeVersion(process.version);

  if (current.major > major) return true;
  if (current.major < major) return false;

  if (current.minor > minor) return true;
  if (current.minor < minor) return false;

  return current.patch >= patch;
};

export const getNodeVersionInfo = (): {
  version: string | undefined;
  parsed: NodeVersion | undefined;
  isSupported: boolean;
  isStable: boolean;
  isOptimal: boolean;
} => {
  if (typeof process === "undefined" || !process.version) {
    return {
      version: undefined,
      parsed: undefined,
      isSupported: false,
      isStable: false,
      isOptimal: false,
    };
  }

  const version = process.version;
  const parsed = parseNodeVersion(version);

  return {
    version,
    parsed,
    isSupported: isNodeVersionAtLeast(12, 17),
    isStable: isNodeVersionAtLeast(14, 0),
    isOptimal: isNodeVersionAtLeast(16, 0),
  };
};
