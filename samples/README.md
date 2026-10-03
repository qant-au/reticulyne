# Sample diagrams

Four isometric diagrams in the scene file format, ready to open with **Diagrams > Open**
(or pass as `initialData`). Each embeds the icons it uses, so it draws the same in any
editor.

| File | What it shows | Exercises |
|---|---|---|
| `office-network.json` | A small office: internet, firewall, router, core switch, wired desktops, printer, NAS and Wi-Fi | One floor, plain and dashed links, a zone, a text label |
| `three-tier-web.json` | Users through a CDN and load balancer to web, app and data tiers, with a queue and worker | Directed and two-way links, link labels, dotted and dashed styles, node descriptions, three zones, names with punctuation (`DB: primary`, `Load balancer (L7)`) |
| `aws-serverless.json` | A serverless orders API on AWS: CloudFront, API Gateway, Cognito, Lambda, DynamoDB, SNS and SQS | Named groups, link glyphs, an animated link, a node with no links (CloudWatch), `&` in a name |
| `two-floor-building.json` | A two-storey site: comms room on the ground floor, open-plan desks on level 1 | Two floors (views), a connection between items on different floors (the riser) |
