# Demos

The animated GIFs in [`docs/demos`](../docs/demos) are recorded from the editor
itself, by scripts in this folder that drive it the way a person would: items
dragged from the icon library, connections made from the context menu, ports
chosen in the inspector. Nothing is mocked, so a recording is also a check
that the editor still does what the GIF shows.

| Recording | What it shows | Script |
|---|---|---|
| `office-network` | Drawing a small office network: two internet services into a firewall, two switches, two access points, a server, a NAS, a UPS and a laptop on Wi-Fi | [`office-network.demo.ts`](office-network.demo.ts) |
| `office-live` | The same network as a status board: traffic on the trunks, a fibre outage and the failover to 4G, a mains failure carried by the UPS | [`office-live.demo.ts`](office-live.demo.ts), driving the [Office network, live](../src/examples/OfficeNetworkLive/OfficeNetworkLive.tsx) example |
| `nmea-2000` | Drawing an NMEA 2000 network on a boat: a backbone of tees between two terminators, a power injector, and the instruments on the drops | [`nmea2000.demo.ts`](nmea2000.demo.ts) |
| `mermaid-import` | Importing a Mermaid flowchart: pasted, a typo shown at its line and fixed from the error list, then laid out on the canvas. Shown in [docs/mermaid.md](../docs/mermaid.md) | [`mermaid-import.demo.ts`](mermaid-import.demo.ts) |
| `mermaid-export` | Exporting the three-tier sample as Mermaid: the preview, the text copied, and Mermaid 12 drawing it. Shown in [docs/mermaid.md](../docs/mermaid.md) | [`mermaid-export.demo.ts`](mermaid-export.demo.ts) |
| `icon-pack-install` | Installing the Nautical Flags pack from Icon packs, then hoisting Uniform over Whiskey on the pack's own Halyard, in the isometric and flat views. Shown in [docs/icon-packs.md](../docs/icon-packs.md) | [`icon-pack-install.demo.ts`](icon-pack-install.demo.ts) |
| `icon-pack-walkthrough` | The life of a pack: installed, used and exported; removal refused while a diagram uses it, Show, one flag given a built-in icon and the other deleted, the pack removed; the exported file opened without it (the notice names it and its source), and installed again. Shown in [docs/icon-packs.md](../docs/icon-packs.md) | [`icon-pack-walkthrough.demo.ts`](icon-pack-walkthrough.demo.ts) |

The scenes the build demos draw are saved in [`scenes/`](scenes) once a
recording passes; the office scene is also written to
`src/examples/OfficeNetworkLive/scene.ts`, which is what the live example
loads.

## Recording

The scripts run against the Docker containers from `bash restart.sh`: the editor
on <http://localhost:2222> and the examples picker on <http://localhost:2223>
(`PLAYWRIGHT_BASE_URL` and `PLAYWRIGHT_EXAMPLES_URL` override them).

```sh
npm run demos:record                   # every demo, one at a time
npm run demos:record -- office-network # one of them
npm run demos:encode                   # demos/out/*.webm -> docs/demos/*.gif
```

`demos:record` is a Playwright project of its own ([`playwright.config.ts`](playwright.config.ts))
that records the browser at 1200 x 750 and keeps each video as `out/<name>.webm`.
`demos:encode` needs `ffmpeg` on the path; the playback speed, start point, frame
rate and width are set at the top of [`encode.mjs`](encode.mjs).

Each build demo asserts the scene it ends with (every item on its tile, every
connection on the ports it should have), so a change to the editor that breaks
the flow fails the recording rather than quietly producing a different GIF.
