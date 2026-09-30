// A phrase has punctuation or a lowercase word in it ("drag", "keys");
// key names are capitalised or symbols.
const isPhrase = (entry) => /[,;]/.test(entry) || /(^|\s)[a-z]{2,}(\s|$)/.test(entry);
export const shortcutKeys = (entry) => {
    if (isPhrase(entry))
        return { kind: 'text', text: entry };
    const keys = entry.includes(' + ') ? entry.split(' + ') : entry.split(' ');
    return { kind: 'chord', keys: keys.filter((key) => key !== '') };
};
