// Draws a prepared view (prepare.ts) as DOM and SVG, layer by layer in the
// editor's order (src/components/Renderer/Renderer.tsx) and with the
// editor's geometry and styles, so the viewer and the editor's read-only
// render of the same diagram look the same; e2e/viewer-parity.spec.ts
// compares them pixel by pixel.

import { getIsoProjectionCss } from 'src/utils/projection';
import { getProjectedTileSize } from 'src/utils/projection';
import { getTilePosition } from 'src/utils/coordinates';
import { getBoundingBox } from 'src/utils/geometry';
import { PROJECTED_TILE_SIZE, SCHEMATIC_TILE_SIZE } from 'src/config';
import {
  DEFAULT_FONT_FAMILY,
  TEXTBOX_FONT_WEIGHT,
  TEXTBOX_PADDING
} from 'src/config';
import type { Coords, Projection, ProjectionOrientationEnum } from 'src/types';
import type {
  NodeImage,
  PreparedConnector,
  PreparedNode,
  PreparedStub,
  PreparedView,
  TileArea
} from './prepare';
import { UNPROJECTED } from './prepare';
import { div, html, setStyle, svg } from './dom';
import { glyph } from './glyphs';
import { richText } from './richtext';
import { FONT_FAMILY, TYPE, type ViewerTheme } from './theme';
import { MISSING_ICON_FLAT_URL, MISSING_ICON_URL } from 'src/icons/missing';
import { isAllowedIconUrl } from 'src/core/scene/schema';

/** What the renderer needs from its owner. */
export interface RenderContext {
  theme: ViewerTheme;
  /** A floor stub's marker was clicked: show that floor. */
  onFollowStub: (stub: PreparedStub) => void;
}

/** The parts of a drawing the viewer keeps hold of. */
export interface Drawing {
  /** The layers, each moved and scaled together by the fit. */
  layers: HTMLElement[];
  grid: HTMLElement | null;
  images: HTMLImageElement[];
  /** Labels whose truncation is decided once they are laid out. */
  labels: ExpandableLabel[];
}

// ---- Icon URLs -----------------------------------------------------------

// The scene schema already refuses an icon URL outside its allow-list
// (isAllowedIconUrl in src/core/scene/schema.ts), so every URL here passed
// that rule: drawn by <img>, which runs no script. The check is repeated
// so the viewer never loads one even if handed a model some other way.
const image = (url: string, flat: boolean) => {
  const img = html('img');
  img.alt = '';
  img.decoding = 'async';
  img.draggable = false;
  img.src = isAllowedIconUrl(url)
    ? url
    : flat
      ? MISSING_ICON_FLAT_URL
      : MISSING_ICON_URL;
  return img;
};

// ---- Placement -----------------------------------------------------------

/** As useIsoProjection: an area of tiles laid flat in the view's plane. */
const projected = (
  area: TileArea,
  projection: Projection,
  orientation?: keyof typeof ProjectionOrientationEnum
) => {
  const grid = {
    width: Math.abs(area.from.x - area.to.x) + 1,
    height: Math.abs(area.from.y - area.to.y) + 1
  };
  const origin = getBoundingBox([area.from, area.to])[3];
  const position = getTilePosition({
    tile: origin,
    origin: orientation === 'Y' ? 'TOP' : 'LEFT',
    projection
  });
  const px = {
    width: grid.width * UNPROJECTED,
    height: grid.height * UNPROJECTED
  };
  return {
    px,
    grid,
    styles: {
      position: 'absolute',
      left: position.x,
      top: position.y,
      width: px.width,
      height: px.height,
      transform: getIsoProjectionCss(orientation, projection),
      transformOrigin: 'top left'
    }
  };
};

const tileArea = (
  area: TileArea,
  projection: Projection,
  fill: string,
  cornerRadius: number,
  stroke: { width: number; color: string; dashArray?: string }
) => {
  const { px, styles } = projected(area, projection);
  const el = svg(
    'svg',
    {
      xmlns: 'http://www.w3.org/2000/svg',
      viewBox: `0 0 ${px.width} ${px.height}`,
      width: `${px.width}px`,
      height: `${px.height}px`
    },
    [
      svg('rect', {
        width: px.width,
        height: px.height,
        fill,
        rx: cornerRadius,
        stroke: stroke.color,
        'stroke-width': stroke.width,
        'stroke-dasharray': stroke.dashArray
      })
    ]
  );
  setStyle(el, styles);
  return el;
};

const at = (position: Coords, styles = {}) => {
  return div({
    position: 'absolute',
    left: position.x,
    top: position.y,
    ...styles
  });
};

const typography = (
  variant: keyof typeof TYPE,
  text: string,
  styles: Record<string, string | number> = {}
) => {
  const el = html(variant === 'caption' ? 'span' : 'p', {
    margin: '0',
    fontFamily: FONT_FAMILY,
    fontWeight: '400',
    ...TYPE[variant],
    ...styles
  });
  el.textContent = text;
  return el;
};

// ---- Labels --------------------------------------------------------------

const DIAGONAL = Math.SQRT1_2;
const DIRECTION: Record<string, Coords> = {
  N: { x: 0, y: -1 },
  NE: { x: DIAGONAL, y: -DIAGONAL },
  E: { x: 1, y: 0 },
  SE: { x: DIAGONAL, y: DIAGONAL },
  S: { x: 0, y: 1 },
  SW: { x: -DIAGONAL, y: DIAGONAL },
  W: { x: -1, y: 0 },
  NW: { x: -DIAGONAL, y: -DIAGONAL }
};
const HANG: Record<string, string> = {
  N: 'translate(-50%, -100%)',
  NE: 'translate(0, -100%)',
  E: 'translate(0, -50%)',
  SE: 'translate(0, 0)',
  S: 'translate(-50%, 0)',
  SW: 'translate(-100%, 0)',
  W: 'translate(-100%, -50%)',
  NW: 'translate(-100%, -100%)'
};
const LABEL_HEIGHT = 80;

/** As Label.tsx: a leader, and a box hanging off its end. */
const labelBox = (
  theme: ViewerTheme,
  {
    maxWidth,
    labelHeight,
    position,
    expandBottom,
    padding,
    content
  }: {
    maxWidth: number;
    labelHeight: number;
    position: string;
    expandBottom: boolean;
    padding: string;
    content: HTMLElement;
  }
) => {
  const d = DIRECTION[position] ?? DIRECTION.N;
  const end = { x: d.x * labelHeight, y: d.y * labelHeight };
  const hang =
    labelHeight > 0 && expandBottom
      ? (HANG[position] ?? HANG.N)
      : `translate(-50%, ${expandBottom ? '-100%' : '-50%'})`;
  const wrapper = div({ position: 'absolute', width: maxWidth });
  if (labelHeight > 0) {
    const leader = svg('svg', { xmlns: 'http://www.w3.org/2000/svg' }, [
      svg('line', {
        x1: 0,
        y1: 0,
        x2: end.x,
        y2: end.y,
        'stroke-dasharray': '0, 6',
        stroke: theme.textPrimary,
        'stroke-width': 3,
        'stroke-linecap': 'round'
      })
    ]);
    setStyle(leader, {
      width: 4,
      height: 4,
      overflow: 'visible',
      position: 'absolute',
      top: 0,
      left: 0
    });
    wrapper.appendChild(leader);
  }
  const box = div(
    {
      position: 'absolute',
      display: 'inline-block',
      boxSizing: 'content-box',
      backgroundColor: theme.paper,
      border: `1px solid ${theme.labelBorder}`,
      borderRadius: 8,
      padding,
      transformOrigin: 'bottom center',
      overflow: 'hidden',
      left: end.x,
      top: end.y,
      transform: hang
    },
    [content]
  );
  wrapper.appendChild(box);
  return { wrapper, box };
};

const EXPAND_MORE = 'M16.59 8.59 12 13.17 7.41 8.59 6 10l6 6 6-6z';
const EXPAND_LESS = 'm12 8-6 6 1.41 1.41L12 10.83l4.59 4.58L18 14z';

/** A node's label, which can be shown in full (ExpandableLabel.tsx). */
export class ExpandableLabel {
  readonly wrapper: HTMLElement;

  private readonly box: HTMLElement;

  private readonly inner: HTMLElement;

  private readonly gradient: HTMLElement;

  private readonly button: HTMLButtonElement;

  private readonly icon: SVGPathElement;

  private readonly maxWidth: number;

  private expanded = false;

  constructor(theme: ViewerTheme, content: HTMLElement, node: PreparedNode) {
    this.maxWidth = 250;
    this.inner = div({ overflowY: 'hidden', maxHeight: LABEL_HEIGHT }, [
      content
    ]);
    setStyle(this.inner, { scrollbarWidth: 'none' } as never);
    const { wrapper, box } = labelBox(theme, {
      maxWidth: this.maxWidth,
      labelHeight: node.labelHeight,
      position: node.labelPosition,
      expandBottom: true,
      padding: '8px 12px',
      content: this.inner
    });
    this.wrapper = wrapper;
    this.box = box;
    setStyle(box, { maxHeight: LABEL_HEIGHT });
    this.gradient = div({
      position: 'absolute',
      width: '100%',
      height: 50,
      bottom: 0,
      left: 0,
      background: `linear-gradient(0deg, ${theme.defaultBg} 0%, ${theme.defaultBg} 5%, transparent 100%)`,
      display: 'none'
    });
    this.inner.appendChild(this.gradient);
    this.icon = svg('path', { d: EXPAND_MORE });
    const iconSvg = svg(
      'svg',
      { viewBox: '0 0 24 24', 'aria-hidden': 'true', focusable: 'false' },
      [this.icon]
    );
    setStyle(iconSvg, {
      width: 17,
      height: 17,
      fill: theme.white,
      display: 'inline-block',
      flexShrink: '0',
      userSelect: 'none'
    });
    this.button = html('button', {
      position: 'absolute',
      bottom: 0,
      right: 0,
      margin: 4,
      display: 'none',
      alignItems: 'center',
      justifyContent: 'center',
      boxSizing: 'border-box',
      border: '0',
      borderRadius: 4,
      padding: '0 4px',
      minWidth: 0,
      height: 'auto',
      cursor: 'pointer',
      backgroundColor: theme.primary,
      color: theme.white,
      fontFamily: FONT_FAMILY,
      fontWeight: '500',
      fontSize: '0.7em',
      lineHeight: '1.75',
      letterSpacing: '0.02857em',
      boxShadow: 'none',
      outline: '0',
      pointerEvents: 'auto'
    });
    this.button.type = 'button';
    this.button.tabIndex = -1;
    this.button.setAttribute('aria-label', 'Show more');
    this.button.appendChild(iconSvg);
    this.button.addEventListener('click', (event) => {
      event.stopPropagation();
      this.toggle();
    });
    box.appendChild(this.button);
  }

  /** Shows the gradient and Show more when the content runs past the box. */
  measure() {
    const truncated =
      !this.expanded && this.inner.clientHeight >= LABEL_HEIGHT - 10;
    this.gradient.style.display = truncated ? 'block' : 'none';
    this.button.style.display =
      truncated || this.expanded ? 'inline-flex' : 'none';
  }

  toggle() {
    this.expanded = !this.expanded;
    const width = this.expanded ? this.maxWidth * 1.5 : this.maxWidth;
    this.wrapper.style.width = `${width}px`;
    this.box.style.maxHeight = this.expanded ? '' : `${LABEL_HEIGHT}px`;
    this.inner.style.maxHeight = this.expanded ? '' : `${LABEL_HEIGHT}px`;
    this.inner.style.overflowY = this.expanded ? 'scroll' : 'hidden';
    this.inner.scrollTop = 0;
    this.icon.setAttribute('d', this.expanded ? EXPAND_LESS : EXPAND_MORE);
    this.button.setAttribute(
      'aria-label',
      this.expanded ? 'Show less' : 'Show more'
    );
    this.measure();
  }

  get isExpanded() {
    return this.expanded;
  }
}

// ---- Layers --------------------------------------------------------------

const sceneLayer = () => {
  return div({
    position: 'absolute',
    zIndex: '0',
    top: '50%',
    left: '50%',
    width: 0,
    height: 0,
    userSelect: 'none'
  });
};

const drawGroups = (view: PreparedView, theme: ViewerTheme) => {
  const layer = sceneLayer();
  view.groups.forEach((group) => {
    const wrap = div();
    wrap.dataset.groupId = group.id;
    wrap.appendChild(
      tileArea(group, view.projection, group.fill ?? theme.actionHover, 22, {
        width: 2,
        color: theme.textDisabled,
        dashArray: '10 8'
      })
    );
    if (group.name) {
      const name = at(
        { x: group.namePosition.x, y: group.namePosition.y + 6 },
        { pointerEvents: 'none' }
      );
      name.appendChild(
        typography('caption', group.name, {
          fontWeight: '600',
          color: theme.textSecondary,
          whiteSpace: 'nowrap',
          transform: 'translate(-50%, -50%)',
          display: 'block'
        })
      );
      wrap.appendChild(name);
    }
    layer.appendChild(wrap);
  });
  view.boxes.forEach((box) => {
    const wrap = div();
    wrap.dataset.collapsedGroup = box.groupId;
    wrap.appendChild(
      tileArea(box.area, view.projection, box.fill ?? theme.paper, 10, {
        width: 2,
        color: theme.textSecondary
      })
    );
    const label = at(box.labelPosition, { pointerEvents: 'none' });
    label.appendChild(
      typography('caption', box.label, {
        fontWeight: '600',
        color: theme.textSecondary,
        whiteSpace: 'nowrap',
        transform: 'translateX(-50%)',
        display: 'block'
      })
    );
    wrap.appendChild(label);
    layer.appendChild(wrap);
  });
  return layer;
};

const drawRectangles = (view: PreparedView) => {
  const layer = sceneLayer();
  view.rectangles.forEach((r) => {
    const wrap = div({ opacity: '1' });
    wrap.appendChild(
      tileArea(r, view.projection, r.fill, 22, { color: r.stroke, width: 1 })
    );
    layer.appendChild(wrap);
  });
  return layer;
};

const drawConnector = (
  c: PreparedConnector,
  projection: Projection,
  theme: ViewerTheme
) => {
  const { px, styles } = projected(c.area, projection);
  const wrap = div({ ...styles, opacity: '1' });
  wrap.dataset.connector = c.id;
  const common = {
    points: c.points,
    'stroke-linecap': 'round',
    'stroke-linejoin': 'round',
    'stroke-dasharray': c.dash ?? 'none',
    fill: 'none'
  };
  const glyphs = c.glyphs.map((g) => {
    return glyph(c.glyph, g, projection, {
      fill: theme.textPrimary,
      stroke: theme.white,
      strokeWidth: 4
    });
  });
  wrap.appendChild(
    svg(
      'svg',
      {
        xmlns: 'http://www.w3.org/2000/svg',
        viewBox: `0 0 ${px.width} ${px.height}`,
        width: `${px.width}px`,
        height: `${px.height}px`
      },
      [
        svg('polyline', {
          ...common,
          stroke: theme.white,
          'stroke-width': c.width * 1.4,
          'stroke-opacity': 0.7
        }),
        svg('polyline', {
          ...common,
          stroke: c.stroke,
          'stroke-width': c.width
        }),
        ...glyphs
      ]
    )
  );
  return wrap;
};

const drawTextBoxes = (view: PreparedView, theme: ViewerTheme) => {
  const layer = sceneLayer();
  view.textBoxes.forEach((t) => {
    const { styles } = projected(
      { from: t.from, to: t.to },
      view.projection,
      t.orientation
    );
    const text = typography('body1', t.content, {
      color: theme.textPrimary,
      fontSize: UNPROJECTED * t.fontSize,
      fontFamily: DEFAULT_FONT_FAMILY,
      fontWeight: TEXTBOX_FONT_WEIGHT
    });
    const inner = div(
      {
        position: 'absolute',
        top: 0,
        left: 0,
        display: 'flex',
        alignItems: 'center',
        width: '100%',
        height: '100%',
        paddingLeft: UNPROJECTED * TEXTBOX_PADDING,
        paddingRight: UNPROJECTED * TEXTBOX_PADDING
      },
      [text]
    );
    const wrap = div({ ...styles, opacity: '1' }, [inner]);
    layer.appendChild(wrap);
  });
  return layer;
};

const drawConnectorLabels = (view: PreparedView, theme: ViewerTheme) => {
  const layer = sceneLayer();
  view.connectors
    .filter((c) => {
      return Boolean(c.description);
    })
    .forEach((c) => {
      const anchor = at(c.labelPosition, {
        pointerEvents: 'none',
        maxWidth: PROJECTED_TILE_SIZE.width
      });
      const { wrapper } = labelBox(theme, {
        maxWidth: 150,
        labelHeight: 0,
        position: 'N',
        expandBottom: false,
        padding: '6px 8px',
        content: typography('body2', c.description, {
          color: theme.textSecondary
        })
      });
      anchor.appendChild(wrapper);
      layer.appendChild(anchor);
    });
  return layer;
};

const nodeImage = (
  image_: NodeImage,
  images: HTMLImageElement[]
): HTMLElement => {
  if (image_.kind === 'flat') {
    const size = SCHEMATIC_TILE_SIZE.width * 0.8;
    const img = image(image_.url, true);
    setStyle(img, {
      position: 'absolute',
      width: size,
      height: size,
      maxWidth: 'none',
      maxHeight: 'none',
      objectFit: 'contain',
      left: -size / 2,
      top: -size / 2,
      pointerEvents: 'none'
    });
    images.push(img);
    return img;
  }
  if (image_.kind === 'non-iso') {
    const img = image(image_.url, false);
    setStyle(img, {
      width: PROJECTED_TILE_SIZE.width * 0.7,
      maxWidth: 'none',
      maxHeight: 'none',
      height: 'auto'
    });
    images.push(img);
    return div({ pointerEvents: 'none' }, [
      div(
        {
          position: 'absolute',
          left: -PROJECTED_TILE_SIZE.width / 2,
          top: -PROJECTED_TILE_SIZE.height / 2,
          transformOrigin: 'top left',
          transform: getIsoProjectionCss()
        },
        [img]
      )
    ]);
  }
  // Its width is set before it loads, so the drawing never shows at
  // another size first; it stands on the node's point, bottom centre.
  const img = image(image_.url, false);
  setStyle(img, {
    position: 'absolute',
    width: PROJECTED_TILE_SIZE.width * 0.8,
    maxWidth: 'none',
    maxHeight: 'none',
    height: 'auto',
    top: 0,
    left: 0,
    transform: 'translate(-50%, -100%)',
    pointerEvents: 'none'
  });
  img.width = Math.round(PROJECTED_TILE_SIZE.width * 0.8);
  images.push(img);
  return img;
};

const drawNodes = (view: PreparedView, images: HTMLImageElement[]) => {
  const layer = sceneLayer();
  view.nodes.forEach((node) => {
    const outer = div({
      position: 'absolute',
      zIndex: String(node.order),
      opacity: '1'
    });
    outer.dataset.node = node.id;
    const inner = at(node.position);
    if (node.image) {
      inner.appendChild(
        div({ position: 'absolute', pointerEvents: 'none' }, [
          nodeImage(node.image, images)
        ])
      );
    }
    outer.appendChild(inner);
    layer.appendChild(outer);
  });
  return layer;
};

const drawNodeLabels = (
  view: PreparedView,
  theme: ViewerTheme,
  labels: ExpandableLabel[]
) => {
  const layer = sceneLayer();
  const tileHeight = getProjectedTileSize(view.projection).height;
  view.nodes.forEach((node) => {
    if (!node.name && !node.description) return;
    const stack = div({ display: 'flex', flexDirection: 'column' });
    if (node.name) {
      stack.appendChild(
        typography('body1', node.name, {
          fontWeight: '600',
          color: theme.textPrimary
        })
      );
    }
    if (node.description) {
      const description = div({
        color: theme.textSecondary,
        fontFamily: FONT_FAMILY,
        pointerEvents: 'auto'
      });
      description.appendChild(richText(node.description));
      description.querySelectorAll('p').forEach((p) => {
        setStyle(p, { margin: '0' });
      });
      if (node.name) description.style.marginTop = '8px';
      stack.appendChild(description);
    }
    const label = new ExpandableLabel(theme, stack, node);
    labels.push(label);
    const outer = div({
      position: 'absolute',
      zIndex: String(node.order),
      opacity: '1'
    });
    outer.dataset.nodeLabel = node.id;
    const inner = at(node.position);
    const lift = div({
      position: 'absolute',
      pointerEvents: 'none',
      bottom: tileHeight / 2
    });
    lift.appendChild(label.wrapper);
    inner.appendChild(lift);
    outer.appendChild(inner);
    layer.appendChild(outer);
  });
  return layer;
};

const SPREAD = 36;
const ARROW_UP = 'm4 12 1.41 1.41L11 7.83V20h2V7.83l5.58 5.59L20 12l-8-8z';
const ARROW_DOWN = 'm20 12-1.41-1.41L13 16.17V4h-2v12.17l-5.58-5.59L4 12l8 8z';

const stubGeometry = (stub: PreparedStub, projection: Projection) => {
  const tileHeight = getProjectedTileSize(projection).height;
  const rise =
    Math.round(tileHeight * 1.6) * (stub.direction === 'up' ? -1 : 1);
  const x = stub.position.x + (stub.index - (stub.count - 1) / 2) * SPREAD;
  return { rise, x, y: stub.position.y };
};

const drawStubRisers = (view: PreparedView, theme: ViewerTheme) => {
  const layer = sceneLayer();
  view.stubs.forEach((stub) => {
    const { rise, x, y } = stubGeometry(stub, view.projection);
    const riser = svg('svg', { width: 1, height: 1 }, [
      svg('line', {
        x1: 0,
        y1: 0,
        x2: 0,
        y2: rise,
        'stroke-width': 4,
        'stroke-dasharray': '8 6',
        'stroke-linecap': 'round',
        stroke: theme.textSecondary
      }),
      svg('rect', {
        x: -7,
        y: rise - 7,
        width: 14,
        height: 14,
        transform: `rotate(45 0 ${rise})`,
        fill: theme.primary
      })
    ]);
    setStyle(riser, {
      position: 'absolute',
      overflow: 'visible',
      left: x,
      top: y
    });
    layer.appendChild(
      div({ position: 'absolute', pointerEvents: 'none' }, [riser])
    );
  });
  return layer;
};

const drawStubMarkers = (view: PreparedView, context: RenderContext) => {
  const { theme } = context;
  const layer = sceneLayer();
  view.stubs.forEach((stub) => {
    const { rise, x, y } = stubGeometry(stub, view.projection);
    const label = `${stub.floorName} · ${stub.itemName || 'Untitled'}`;
    const arrow = svg(
      'svg',
      { viewBox: '0 0 24 24', 'aria-hidden': 'true', focusable: 'false' },
      [svg('path', { d: stub.direction === 'up' ? ARROW_UP : ARROW_DOWN })]
    );
    setStyle(arrow, {
      width: 17,
      height: 17,
      fill: theme.actionActive,
      display: 'inline-block',
      flexShrink: '0'
    });
    const marker = div(
      {
        position: 'absolute',
        display: 'flex',
        alignItems: 'center',
        gap: 4,
        padding: '2px 8px',
        whiteSpace: 'nowrap',
        borderRadius: 4,
        border: `1px solid ${theme.divider}`,
        backgroundColor: theme.paper,
        color: theme.textPrimary,
        cursor: 'pointer',
        pointerEvents: 'auto',
        transform: `translate(-50%, ${stub.direction === 'up' ? '-100%' : '0'})`,
        left: x,
        top: y + rise + (stub.direction === 'up' ? -12 : 12)
      },
      [arrow, typography('body2', label, { fontWeight: '600' })]
    );
    marker.title = `Go to ${label}`;
    marker.dataset.floorStub = `${stub.connectionId}:${stub.itemId}`;
    marker.addEventListener('click', (event) => {
      event.stopPropagation();
      context.onFollowStub(stub);
    });
    layer.appendChild(
      div({ position: 'absolute', pointerEvents: 'none' }, [marker])
    );
  });
  return layer;
};

// ---- Grid ----------------------------------------------------------------

const gridTile = (projection: Projection, theme: ViewerTheme) => {
  const s = theme.gridStroke;
  const o = theme.gridOpacity;
  const markup =
    projection === 'schematic'
      ? `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100"><path d="M0 0H100M0 0V100" stroke="${s}" stroke-opacity="${o}" stroke-width="1" fill="none"/></svg>`
      : `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 141.38828 163.26061"><g stroke="${s}" stroke-opacity="${o}" stroke-width="1" stroke-alignment="center"><polygon points="70.69436 122.44546 .00022 81.63018 70.69392 40.81515 141.38806 81.63043 70.69436 122.44546" fill="none"/><line x1="70.69414" y1="40.81503" x2="141.38784"/><line y1="0" x2="70.69414" y2="40.81528"/><line x1="70.69414" y1="122.44559" x2=".00044" y2="163.26061"/><line x1="141.38828" y1="163.26061" x2="70.69414" y2="122.44533"/></g></svg>`;
  return `data:image/svg+xml;utf8,${encodeURIComponent(markup)}`;
};

/** Moves the grid with the fit, as Grid.tsx does. */
export const placeGrid = (
  grid: HTMLElement,
  projection: Projection,
  size: { width: number; height: number },
  zoom: number,
  scroll: Coords
) => {
  const tile = getProjectedTileSize(projection);
  const w = tile.width * zoom;
  const h = tile.height * zoom;
  const flat = projection === 'schematic';
  const x = flat
    ? size.width / 2 + scroll.x - w / 2
    : size.width / 2 + scroll.x + w / 2;
  const y = flat
    ? size.height / 2 + scroll.y - h / 2
    : size.height / 2 + scroll.y;
  setStyle(grid, {
    backgroundSize: flat ? `${w}px ${h}px` : `${w}px ${h * 2}px`,
    backgroundPosition: `${x}px ${y}px`
  });
};

// ---- The whole drawing ---------------------------------------------------

/** Every layer of `view`, appended to `canvas` in the editor's order. */
export const drawView = (
  canvas: HTMLElement,
  view: PreparedView,
  context: RenderContext,
  showGrid: boolean
): Drawing => {
  const { theme } = context;
  const images: HTMLImageElement[] = [];
  const labels: ExpandableLabel[] = [];
  const connectors = sceneLayer();
  view.connectors.forEach((c) => {
    connectors.appendChild(drawConnector(c, view.projection, theme));
  });
  let grid: HTMLElement | null = null;
  const gridHolder = div({
    position: 'absolute',
    width: '100%',
    height: '100%',
    top: 0,
    left: 0
  });
  if (showGrid) {
    grid = div({
      position: 'absolute',
      width: '100%',
      height: '100%',
      background: `repeat url("${gridTile(view.projection, theme)}")`
    });
    gridHolder.appendChild(
      div(
        {
          position: 'absolute',
          left: 0,
          top: 0,
          width: '100%',
          height: '100%',
          overflow: 'hidden',
          pointerEvents: 'none'
        },
        [grid]
      )
    );
  }
  const layers = [
    drawGroups(view, theme),
    drawRectangles(view),
    connectors,
    drawTextBoxes(view, theme),
    drawConnectorLabels(view, theme),
    drawNodes(view, images),
    drawStubRisers(view, theme),
    drawNodeLabels(view, theme, labels),
    drawStubMarkers(view, context)
  ];
  // The grid sits between the zones and the connectors, as in the editor.
  canvas.append(layers[0], layers[1], gridHolder, ...layers.slice(2));
  return { layers, grid, images, labels };
};
