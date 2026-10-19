// The library builds (prod.config.js, esm.config.js) emit src/icons/drawings
// as an entry of its own and leave every import of it external, so the 1.3 MB
// of built-in SVG ships once per module format instead of once per entry.
// The Docker builds bundle it normally.

const path = require('path');

const ICONS_DIR = path.resolve(__dirname, '../src/icons');

/** True for an import of the drawings module from anywhere in src/. */
const isDrawingsImport = (request, context) => {
  if (request === 'src/icons/drawings') return true;
  return (
    context !== undefined &&
    path.resolve(context, request) === path.join(ICONS_DIR, 'drawings')
  );
};

module.exports = { isDrawingsImport };
