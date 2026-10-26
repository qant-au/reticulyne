# Sample diagrams

Six diagrams in the scene file format, ready to open with **Diagrams > Open**
(or pass as `initialData`). Each embeds the icons it uses, so it draws the same in any
editor.

| File | What it shows | Exercises |
|---|---|---|
| `office-network.json` | A small office: internet, firewall, router, core switch, wired desktops, printer, NAS and Wi-Fi | One floor, plain and dashed links, a zone, a text label |
| `three-tier-web.json` | Users through a CDN and load balancer to web, app and data tiers, with a queue and worker | Directed and two-way links, link labels, dotted and dashed styles, node descriptions, three zones, names with punctuation (`DB: primary`, `Load balancer (L7)`) |
| `aws-serverless.json` | A serverless orders API on AWS: CloudFront, API Gateway, Cognito, Lambda, DynamoDB, SNS and SQS | Named groups, link glyphs, an animated link, a node with no links (CloudWatch), `&` in a name |
| `two-floor-building.json` | A two-storey site: comms room on the ground floor, open-plan desks on level 1 | Two floors (views), a connection between items on different floors (the riser) |
| `built-in-devices.json` | A small business site drawn only with catalogue devices: fibre, firewall, switches, server, NAS, NVR, UPS, Wi-Fi, phone, cameras, door access, printer and PCs | Catalogue items placed with their ports and joined port to port, a zone with a title |
| `mixed-icons.json` | Built-in devices beside an icon from a third-party pack, an uploaded icon, and a built-in switch with its own images laid over its icon | A pack icon with both drawings, an uploaded icon with one image, an object's `iconOverride` (iso and flat) |

Each diagram has two pictures beside it, exported from the editor with **Export as image** at the default settings: `<name>.png` in the isometric view and `<name>-flat.png` in the flat view. The two-floor building has a pair per floor (`two-floor-building-ground.png`, `two-floor-building-level-1-flat.png` and so on).

`built-in-devices.json` and `mixed-icons.json` are built from the catalogue, and every picture is exported, by [`demos/samples.demo.ts`](../demos/samples.demo.ts); with the editor running (`bash restart.sh`), `npm run demos:record -- samples` rebuilds them all.
