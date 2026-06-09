import { Model } from 'src/types';

// Inline data-URI SVGs so the fixtures are self-contained — no external
// network request and no CSP allowlist entry required. These are fixtures
// for tests / examples; production embedders supply their own icon
// collections (see `iconCollections` in docs/embedding.md).

const serverSvg =
  '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64">' +
  '<rect x="8" y="14" width="48" height="36" rx="2" fill="#7a8aa8" stroke="#2d3b56" stroke-width="2"/>' +
  '<rect x="14" y="22" width="36" height="3" fill="#dde4ef"/>' +
  '<rect x="14" y="30" width="36" height="3" fill="#dde4ef"/>' +
  '<rect x="14" y="38" width="36" height="3" fill="#dde4ef"/>' +
  '<circle cx="48" cy="23" r="1.5" fill="#5ed47a"/>' +
  '</svg>';

const blockSvg =
  '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64">' +
  '<rect x="12" y="12" width="40" height="40" rx="3" fill="#7a8aa8" stroke="#2d3b56" stroke-width="2"/>' +
  '<rect x="20" y="20" width="24" height="24" fill="#dde4ef"/>' +
  '</svg>';

const svgDataUri = (svg: string) => {
  return `data:image/svg+xml;utf8,${encodeURIComponent(svg)}`;
};

export const icons: Model['icons'] = [
  {
    id: 'icon1',
    name: 'Icon1',
    url: svgDataUri(serverSvg)
  },
  {
    id: 'icon2',
    name: 'Icon2',
    url: svgDataUri(blockSvg)
  }
];
