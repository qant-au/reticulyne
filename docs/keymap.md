# Keymap

Reticulyne's keyboard shortcuts and pointer gestures, aligned with
[Excalidraw](https://github.com/excalidraw/excalidraw) and with
[Axonometra](https://github.com/qant-au/axonometra)'s.

Someone who has just sketched in Excalidraw, planned a floor in Axonometra and then
drawn the network in Reticulyne should never have to retrain. Excalidraw's own `?`
help dialog is the reference: every binding listed there is either matched here,
left unbound on purpose, or listed under [Deliberate divergences](#deliberate-divergences).

This is a specification. It starts from the mapping Reticulyne already ships and adds
what Axonometra needs. Where a tool does not yet do what this page says, the page is
right and the tool is behind.

Checked against Excalidraw's `packages/excalidraw/components/HelpDialog.tsx` on the
`master` branch, 2026-09-29.

## In code

The tables on this page are the `keymap` module (`src/core/keymap.ts`):
the bindings, `resolveAction()` (the matching rules below, including read-only and
not-while-typing), `formatChord()` for menus and tooltips, and `shortcutSections()` plus
`DIFFERENCES` for the `?` dialog, which the kit (`src/kit`) renders as `KeyboardShortcutsDialog`.
The page and the module change together.

## Principles

1. **Same action, same key.** If Excalidraw has the action, use its key, letter and
   number both.
2. **Reuse Excalidraw's modifier conventions.** `Alt`+drag copies, `Space`+drag pans,
   `Shift`+click extends a selection, `Ctrl/Cmd` is the command modifier.
3. **Free-form drawing tools are not ours.** Diamond, ellipse, freedraw, frame and the
   like have no place in technical drawings (neither tool does flowcharting or
   whiteboarding). Their keys stay unbound unless a divergence below takes one on purpose.
4. **A new concept takes a free key.** For something Excalidraw has no equivalent of
   (a wall, a door, a measurement), pick a key Excalidraw leaves free. Bare letters
   Excalidraw does not use: `C J M U W X Y Z`.
5. **Every divergence is written down**, here and in each tool's `?` dialog.

`Ctrl/Cmd` means `Ctrl` on Windows and Linux, `Cmd` on macOS.

## Shared set (both tools)

A binding marked _where built_ applies once the tool has the feature; until then the
key stays unbound rather than being given to something else.

### Tools

| Action | Keys | Excalidraw |
| --- | --- | --- |
| Select | `V`, `1` | same |
| Hand (pan) | `H` | same |
| Eraser (_where built_) | `E`, `0` | same |
| Keep the current tool after use (_where built_) | `Q` | same |

### View

| Action | Keys | Excalidraw |
| --- | --- | --- |
| Zoom in | `Ctrl/Cmd` + `=` | same |
| Zoom out | `Ctrl/Cmd` + `-` | same |
| Reset zoom | `Ctrl/Cmd` + `0` | same |
| Fit everything | `Shift` + `1` | same |
| Fit the selection | `Shift` + `2` | same |
| Toggle light / dark | `Alt` + `Shift` + `D` | same |
| Show this list | `?` | same |

### Edit

| Action | Keys | Excalidraw |
| --- | --- | --- |
| Undo | `Ctrl/Cmd` + `Z` | same |
| Redo | `Ctrl/Cmd` + `Shift` + `Z`, `Ctrl` + `Y` | same |
| Copy, cut, paste | `Ctrl/Cmd` + `C`, `X`, `V` | same |
| Duplicate | `Ctrl/Cmd` + `D` | same |
| Delete | `Delete`, `Backspace` | same |
| Select all | `Ctrl/Cmd` + `A` | same |
| Deselect, cancel, leave a group | `Esc` | same |
| Nudge | arrow keys; with `Shift`, a larger step | same |
| Edit the selected object's text or properties | `Enter` | same |
| Edit the selected object's geometry (points, length) | `Ctrl/Cmd` + `Enter` | same ("edit line points") |
| Group, ungroup (_where built_) | `Ctrl/Cmd` + `G`, `Ctrl/Cmd` + `Shift` + `G` | same |
| Bring forward, send backward (_where built_) | `Ctrl/Cmd` + `]`, `Ctrl/Cmd` + `[` | same |
| Bring to front, send to back (_where built_) | `Ctrl/Cmd` + `Shift` + `]` / `[`; on macOS `Cmd` + `Opt` + `]` / `[` | same |
| Align left, right, top, bottom (_where built_) | `Ctrl/Cmd` + `Shift` + arrow key | same |
| Lock or unlock the selection (_where built_) | `Ctrl/Cmd` + `Shift` + `L` | same |
| Find | `Ctrl/Cmd` + `F` | same |

Accept both the Windows and the macOS form of the ordering keys on every platform.

### Pointer and touch

| Action | Gesture | Excalidraw |
| --- | --- | --- |
| Select | click | same |
| Add to or remove from the selection | `Shift` + click | same |
| Select an area | drag on empty canvas | same |
| Pan by dragging | `Space` + drag, or the hand tool | same |
| Pan with the wheel | mouse wheel; `Shift` + wheel pans sideways | same |
| Zoom | `Ctrl/Cmd` + wheel, trackpad pinch, touch pinch | same |
| Drag a copy | `Alt` + drag | same |
| Context menu | right-click | same |

In the `?` dialog a gesture's keys and pointer actions are drawn as keys, as the
keyboard rows are, with the platform's key names (`Shift` + `Click`, or `⇧` + `Click`
on macOS), and each alternative is listed on its own after "or".

The plain wheel **pans**. That is what Excalidraw does, and it suits both tools: a plan
and an isometric diagram are both maps you move around.

## Reticulyne bindings

Reticulyne's own tools, as shipped:

| Action | Keys | Notes |
| --- | --- | --- |
| Rectangle | `R`, `2` | Excalidraw's rectangle |
| Connector | `A`, `5`, `C` | Excalidraw's arrow; `C` kept as an extra alias |
| Text | `T`, `8` | Excalidraw's text |
| Add item | `I`, `9` | Excalidraw's `9` inserts an image; `I` is "icon" |
| Select (alias) | `S` | kept for existing users |
| Fit everything (alias) | `F` | kept for existing users |
| Zoom in, out (aliases) | `=`, `-` | bare, without `Ctrl/Cmd` |
| Toggle item highlighting | `Alt` + `I` | Reticulyne only |
| Show the floor above, below | `Alt` + `Up`, `Alt` + `Down` | Reticulyne only; a floor is a view |
| Pan the view | `Ctrl/Cmd` + arrow keys | Reticulyne only; works read-only |
| Select the next, previous object | `Tab`, `Shift` + `Tab` | only while the canvas has focus; works read-only |
| Open the selected object's menu | `Shift` + `F10`, the Menu key | the right-click menu, from the keyboard |
| Open an object's menu | right-click an object | the shared "Context menu" row; empty canvas has no menu |
| Add an item on an empty tile | double-click; or `I` (the add-item tool) then `Enter` | `Enter` puts it on the free tile nearest the middle of the view |
| Work inside a group | double-click the group | `Esc` leaves it (the `Esc` row) |
| Connect two items | drag from a port; or **Connect to** in the item's menu | the menu route asks for the other item by name |

**Keyboard access.** Reticulyne reaches objects directly rather than through a cursor:
`Tab` selects the next object in reading order (top to bottom, then left to right, as
drawn), and the view follows it when it would be off screen. Past the last object,
`Tab` clears the selection and lets focus leave the canvas, so the canvas is never a
keyboard trap. Once an object is selected, the shared keys act on it: arrows nudge,
`Enter` edits, `Delete` deletes, `Shift` + `F10` opens its menu. With the rectangle
tool, `Enter` draws a rectangle in the middle of the view.

## Axonometra bindings

| Action | Keys | Notes |
| --- | --- | --- |
| Wall | `L`, `6` | Excalidraw's line: click to add a chain, double-click to end it |
| Erase | `E`, `0` | Excalidraw's eraser, exactly |
| Window | `W` | free in Excalidraw |
| Door | `D` | takes Excalidraw's diamond key; see below |
| Measure | `M` | free in Excalidraw |
| Edit a wall's length | `Ctrl/Cmd` + `Enter`, or double-click the wall | was bare `L`, which is now the wall tool |
| Save | `Ctrl/Cmd` + `S` | stops the browser's own save dialog |

**Keyboard cursor.** With the canvas focused from the keyboard, the arrow keys move a
cursor (with `Shift`, further), `Enter` or `Space` acts at the cursor, and `Esc`
cancels. This is the keyboard route to everything a pointer does, so it stays. `Space`
here is a key press, and `Space` + drag is a pointer gesture, so they do not collide.

**Walk mode (3D).** While walking, the view has its own keys and the tool keys above
are inactive: `W` `A` `S` `D` or the arrow keys move, `Q` and `E` turn, `Page Up` and
`Page Down` change storey.

## Deliberate divergences

Excalidraw bindings that neither tool matches, and why.

| Excalidraw key | Excalidraw action | Here | Why |
| --- | --- | --- | --- |
| `D`, `3` | diamond | `D` is Axonometra's door; `3` unbound | No free-form shapes. Diamond is unbound in both tools, so its letter goes to the object a floor planner reaches for most. |
| `O`, `4` | ellipse | unbound | No free-form shapes. |
| `P`, `7` | freedraw | unbound | No free-form shapes. |
| `L`, `6` in Reticulyne | line | unbound in Reticulyne | Reticulyne draws connectors, not lines. |
| `E`, `0` in Reticulyne | eraser | unbound in Reticulyne | Reticulyne deletes a selection instead. |
| `F` | frame | Reticulyne: Fit to view | No frames; `F` was already fit. |
| `K` | laser pointer | unbound | Presentation tool. |
| `I` | eye-dropper | Reticulyne: Add item | No colour picking from the canvas. |
| `B` | bucket fill | unbound | Colour is set in the properties panel. |
| `N` | sticky note | unbound | Whiteboarding. |
| `S`, `G` | stroke, background colour | Reticulyne: `S` is Select; `G` unbound | Colour is set in the properties panel. |
| `Shift` + `F` | font picker | unbound | |
| `Shift` + `H`, `Shift` + `V` | flip | unbound | Isometric items are not symmetric, and a floor plan object is rotated, not mirrored. |
| `Tab`, `Shift` + `Tab` | change shape type | Reticulyne: Select the next / previous object; Axonometra: unbound | No free-form shapes; the keyboard needs a way to reach each object. |
| `Ctrl/Cmd` + arrow, `Alt` + arrow | create and walk a flowchart | Reticulyne: `Ctrl/Cmd` + arrow keys is Pan the view, `Alt` + `Up` / `Down` is Show the floor above / below; the rest unbound | Flowcharting. |
| `Ctrl/Cmd` + `K` | link | unbound | |
| `Ctrl/Cmd` + `Alt` + `C` / `V` | copy and paste styles | unbound | |
| `Alt` + `Z`, `Alt` + `R`, `Alt` + `S`, `Alt` + `/` | zen mode, view mode, snapping, stats | unbound | View mode belongs to the host (a read-only embed); the others have no equivalent yet. |
| `Page Up` / `Page Down` | scroll the canvas | Axonometra walk mode: change storey | Only while walking in 3D. |

## Rules for implementing it

- **Not while typing.** No binding fires while focus is in an input, a text area or
  editable text; the field keeps its own keys, including its own undo.
- **Match on `event.code` for `Alt` chords** (`KeyI`, `KeyD`, `BracketRight`). On
  macOS, `Option` turns letters into other characters, so `event.key` misses them.
- **Read-only embeds drop every editing binding.** Selecting, panning, zooming, fit,
  find, the theme toggle and `?` still work.
- **List it in the `?` dialog.** Each tool's dialog shows its bindings from this page
  and a short "Differences from Excalidraw" note taken from the table above.
- **Changing this page changes both tools.** A new binding is added here first, then
  in each tool.
