# Nautical Flags

An example Reticulyne icon pack: the 40 flags of the International Code of Signals, each with an
isometric and a flat drawing, connected to one another by a halyard. It is deliberately unlike
the built-in network drawings, to show that a pack can bring anything.

- **The pack:** [`nautical-flags.reticulyne-pack.json`](nautical-flags.reticulyne-pack.json), one
  file holding the pack details, the `halyard` medium, and every flag with both drawings and its
  ports. Install it from the editor's **Icon packs** dialog, or load it in code
  ([docs/icon-packs.md](../../docs/icon-packs.md)).
- **The drawings:** [`src/`](src), one `.iso.svg`, `.flat.svg` and `.json` per flag, plus
  `pack.json`. [`generate.mjs`](generate.mjs) writes them; edit the flag list there, not the
  files.

## What Is In It

| Flags | Ids |
|---|---|
| The 26 letter flags, Alfa to Zulu | `nautical-flags-alfa` to `nautical-flags-zulu` |
| The 10 numeral pennants | `nautical-flags-pennant-0` to `nautical-flags-pennant-9` |
| The three substitutes | `nautical-flags-substitute-1` to `nautical-flags-substitute-3` |
| The answering pennant | `nautical-flags-answering-pennant` |

Each flag has two ports, **Hoist top** and **Hoist bottom**, on the pack's own **Halyard**
medium, so flags clip together into a hoist. Each flag's description is its single-flag meaning
in the International Code.

## Designs and Colours

The designs follow the International Code of Signals as blazoned in the
[International maritime signal flags](https://en.wikipedia.org/wiki/International_maritime_signal_flags)
table: square letter flags (Alfa and Bravo swallowtailed), tapered numeral and answering pennants,
and triangular substitutes. The Code gives no exact colour values, so the five used here are one
fixed set:

| Colour | Hex |
|---|---|
| White | `#FFFFFF` |
| Blue | `#00247D` |
| Red | `#D6001C` |
| Yellow | `#FFD100` |
| Black | `#000000` |

The staff and the outline use the same ink and greys as Reticulyne's built-in drawings.

## Rebuilding

```sh
node packs/nautical-flags/generate.mjs
npm run build   # build-pack.mjs validates with the built library
node scripts/build-pack.mjs packs/nautical-flags/src \
  --out packs/nautical-flags/nautical-flags.reticulyne-pack.json
```

`--check` in place of a rebuild fails if the committed pack is not what the drawings build.
