// APP-02: makes the Docker editor an installable PWA. Emits the web app
// manifest, the two icons and the service worker, and adds the manifest,
// theme-colour and touch-icon tags to index.html.
//
// A small plugin rather than Workbox: the whole job is "precache what the
// build emitted, network-first for the page", which is ~60 lines of
// service worker, and Workbox would add a large dependency tree to a repo
// that gates every dependency through npm audit.

const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const HtmlWebPackPlugin = require('html-webpack-plugin');

const PWA_DIR = path.resolve(__dirname, '../src/docker/pwa');
const THEME = '#1976d2';

const hash = (buf) => {
  return crypto.createHash('sha256').update(buf).digest('hex').slice(0, 10);
};

class PwaPlugin {
  apply(compiler) {
    const { RawSource } = compiler.webpack.sources;
    const { Compilation } = compiler.webpack;

    compiler.hooks.thisCompilation.tap('PwaPlugin', (compilation) => {
      // Icons carry a content hash: nginx serves images as immutable.
      const icons = [192, 512].map((size) => {
        const buf = fs.readFileSync(path.join(PWA_DIR, `icon-${size}.png`));
        return { size, buf, name: `icon-${size}.${hash(buf)}.png` };
      });

      HtmlWebPackPlugin.getHooks(compilation).alterAssetTagGroups.tap(
        'PwaPlugin',
        (data) => {
          data.headTags.push(
            HtmlWebPackPlugin.createHtmlTagObject('link', {
              rel: 'manifest',
              href: 'manifest.webmanifest'
            }),
            HtmlWebPackPlugin.createHtmlTagObject('meta', {
              name: 'theme-color',
              content: THEME
            }),
            HtmlWebPackPlugin.createHtmlTagObject('link', {
              rel: 'apple-touch-icon',
              href: icons[0].name
            })
          );
          return data;
        }
      );

      compilation.hooks.processAssets.tap(
        {
          name: 'PwaPlugin',
          // After html-webpack-plugin has emitted index.html.
          stage: Compilation.PROCESS_ASSETS_STAGE_REPORT
        },
        () => {
          icons.forEach((icon) => {
            compilation.emitAsset(icon.name, new RawSource(icon.buf));
          });

          const manifest = {
            name: 'Reticulyne',
            short_name: 'Reticulyne',
            description: 'Isometric network diagram editor',
            start_url: './',
            scope: './',
            display: 'standalone',
            background_color: '#ffffff',
            theme_color: THEME,
            icons: icons.map((icon) => {
              return {
                src: icon.name,
                sizes: `${icon.size}x${icon.size}`,
                type: 'image/png',
                purpose: 'any'
              };
            })
          };
          compilation.emitAsset(
            'manifest.webmanifest',
            new RawSource(JSON.stringify(manifest, null, 2))
          );

          // Everything emitted except maps, the worker itself and index.html
          // (cached as './', the URL the page is actually loaded from).
          const files = Object.keys(compilation.assets).filter((file) => {
            return !/\.map$|^sw\.js$|^index\.html$|LICENSE\.txt$/.test(file);
          });
          const precache = ['./', ...files.map((f) => `./${f}`)].sort();
          const version = hash(precache.join('\n'));
          const sw = fs
            .readFileSync(path.join(PWA_DIR, 'sw.js'), 'utf8')
            .replace("const CACHE = '__CACHE__';", `const CACHE = 'reticulyne-${version}';`)
            .replace(
              'const PRECACHE = __PRECACHE__;',
              `const PRECACHE = ${JSON.stringify(precache)};`
            );
          compilation.emitAsset('sw.js', new RawSource(sw));
        }
      );
    });
  }
}

module.exports = { PwaPlugin };
