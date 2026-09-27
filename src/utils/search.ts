// ROADMAP 2.7: find nodes by name, description or icon name. Ranked
// exact name > name prefix > name substring > description > icon name,
// then by name, so Enter walks the best hits first. Case-insensitive;
// descriptions are rich-text HTML and are matched on their text only.

export interface SearchableNode {
  id: string;
  name: string;
  description?: string;
  iconName?: string;
}

const textOf = (html: string | undefined) => {
  return (html ?? '').replace(/<[^>]*>/g, ' ').toLowerCase();
};

export const searchNodes = (query: string, nodes: SearchableNode[]) => {
  const q = query.trim().toLowerCase();
  if (!q) return [];
  const ranked: { id: string; rank: number; name: string }[] = [];
  for (const n of nodes) {
    const name = n.name.toLowerCase();
    let rank = -1;
    if (name === q) rank = 0;
    else if (name.startsWith(q)) rank = 1;
    else if (name.includes(q)) rank = 2;
    else if (textOf(n.description).includes(q)) rank = 3;
    else if ((n.iconName ?? '').toLowerCase().includes(q)) rank = 4;
    if (rank >= 0) ranked.push({ id: n.id, rank, name });
  }
  ranked.sort((a, b) => {
    return a.rank - b.rank || a.name.localeCompare(b.name);
  });
  return ranked.map((r) => {
    return r.id;
  });
};
