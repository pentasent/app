/**
 * Semantic versioning comparison utility.
 * Major.Minor.Patch (e.g., 1.2.0)
 */

export const compareVersions = (v1: string, v2: string): number => {
    const parts1 = v1.split('.').map(Number);
    const parts2 = v2.split('.').map(Number);

    for (let i = 0; i < 3; i++) {
        const a = parts1[i] || 0;
        const b = parts2[i] || 0;
        if (a > b) return 1;
        if (a < b) return -1;
    }
    return 0;
};

export const isVersionLower = (current: string, target: string): boolean => {
    return compareVersions(current, target) === -1;
};

export const isVersionEqualOrHigher = (current: string, target: string): boolean => {
    return compareVersions(current, target) >= 0;
};
