export type ShortcutKeys = {
    kind: 'chord';
    keys: string[];
} | {
    kind: 'text';
    text: string;
};
export declare const shortcutKeys: (entry: string) => ShortcutKeys;
