type Doc = Record<string, unknown>;
export interface MigrationIssue {
    message: string;
    path: (string | number)[];
}
/**
 * Version 1 to 2 (Mounting and facing): a plan placement with a stored
 * mountMm keeps meaning a height above the floor, so it gets mountFrom
 * 'floor'. Facing is not pinned. Returns a copy, or the version 2 fields a
 * version 1 file must not hold.
 */
export declare function migrateV1(value: Doc): {
    scene: Doc;
} | {
    issues: MigrationIssue[];
};
/** A version 1 scene document, migrated to the current version. */
export declare function migrateScene(value: unknown): {
    scene: unknown;
} | {
    issues: MigrationIssue[];
};
export {};
