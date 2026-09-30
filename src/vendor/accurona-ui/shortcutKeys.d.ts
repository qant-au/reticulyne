export type ShortcutPart = {
    key: string;
} | {
    text: string;
};
export type ShortcutKeys = {
    kind: 'chord';
    keys: string[];
} | {
    kind: 'gesture';
    parts: ShortcutPart[][];
} | {
    kind: 'text';
    text: string;
};
export declare const shortcutKeys: (entry: string) => ShortcutKeys;
export declare const keyNames: (text: string, mac?: boolean) => string;
