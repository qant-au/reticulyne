// @reticulyne/editor/viewer: draws a Reticulyne diagram read-only, with no
// React, MUI or editor state. See docs/viewer.md.

import type { Icon, Model } from 'src/types/model';
import type { Projection } from 'src/types';
import type { DiagramPaletteMode } from 'src/kit/palette';
import { listViews, prepareView, type PreparedView } from './prepare';
import { loadDrawings, loadScene, withBuiltins, ViewerError } from './scene';
import { drawView, placeGrid, type Drawing } from './render';
import { viewerTheme, FONT_FAMILY } from './theme';
import { div, html, setStyle } from './dom';
import { plainText } from './richtext';

export { ViewerError };

/** How a view is drawn: isometric, or flat (front-on). */
export type ViewerProjection = 'iso' | 'flat';

export interface ViewerView {
  id: string;
  name: string;
  /** How the view is drawn when no projection is asked for. */
  kind: ViewerProjection;
}

export interface ViewerOptions {
  /** The view (floor) to show first; the first view when left out. */
  viewId?: string;
  /** Draw every view this way instead of each view's own kind. */
  projection?: ViewerProjection;
  /** The canvas colours: 'light' (the default) or 'dark'. */
  theme?: DiagramPaletteMode;
  /** The canvas background: a CSS colour, or 'transparent'. */
  background?: string;
  /** Draw the tile grid (off by default, as in an exported image). */
  grid?: boolean;
  /** Icons the diagram names but does not carry, such as installed packs. */
  icons?: Icon[];
  /** Called when the view changes, including from a floor stub's marker. */
  onViewChange?: (viewId: string) => void;
}

export interface Viewer {
  /** The diagram's title. */
  readonly title: string;
  /** Its views (floors), in order. */
  readonly views: ViewerView[];
  /** The view shown now. */
  readonly view: string;
  /** How the view shown now is drawn. */
  readonly projection: ViewerProjection;
  /** The element the viewer drew into the container. */
  readonly element: HTMLElement;
  /**
   * Resolves once the view shown now is drawn: icons decoded, fitted and
   * labels laid out. Replaced by every setView, setProjection or setTheme.
   */
  readonly ready: Promise<void>;
  /** Shows another view; `projection` overrides how it is drawn. */
  setView(
    id: string,
    options?: { projection?: ViewerProjection }
  ): Promise<void>;
  /** Draws every view isometric or flat; undefined restores each view's own. */
  setProjection(projection: ViewerProjection | undefined): Promise<void>;
  /** Switches between the light and dark canvas. */
  setTheme(theme: DiagramPaletteMode): Promise<void>;
  /** Fits the view to the container again (done on resize already). */
  refit(): void;
  /** Removes everything the viewer added and stops watching for resizes. */
  destroy(): void;
}

const toInternal = (p?: ViewerProjection): Projection | undefined => {
  if (p === undefined) return undefined;
  return p === 'flat' ? 'schematic' : 'iso';
};
const toPublic = (p: Projection): ViewerProjection => {
  return p === 'schematic' ? 'flat' : 'iso';
};

const VISUALLY_HIDDEN = {
  position: 'absolute',
  width: 1,
  height: 1,
  overflow: 'hidden',
  clip: 'rect(0 0 0 0)',
  clipPath: 'inset(50%)',
  whiteSpace: 'nowrap',
  margin: -1,
  padding: 0,
  border: '0'
};

const frame = () => {
  return new Promise<void>((resolve) => {
    requestAnimationFrame(() => {
      resolve();
    });
  });
};

/**
 * Draws `scene` (a scene object or its JSON text) into `container`, which
 * it fills. Throws a ViewerError when the scene cannot be read.
 */
export const renderDiagram = (
  container: HTMLElement,
  scene: unknown,
  options: ViewerOptions = {}
): Viewer => {
  const loaded = loadScene(scene, options.icons ?? []);
  let model: Model = loaded.model;
  const views = listViews(model).map((v) => {
    return { id: v.id, name: v.name, kind: toPublic(v.kind) };
  });
  if (!views.length) {
    throw new ViewerError('The diagram has no isometric or flat view to draw.');
  }
  let viewId =
    options.viewId &&
    views.some((v) => {
      return v.id === options.viewId;
    })
      ? options.viewId
      : views[0].id;
  let override = toInternal(options.projection);
  let themeMode: DiagramPaletteMode = options.theme ?? 'light';
  let destroyed = false;
  let prepared: PreparedView | null = null;
  let drawing: Drawing | null = null;
  let generation = 0;
  // Set once the API object below exists: a floor stub or an outline
  // button shows another view through it.
  let showView: (id: string) => void = () => {};

  const root = div({
    position: 'relative',
    width: '100%',
    height: '100%',
    overflow: 'hidden',
    fontFamily: FONT_FAMILY
  });
  root.setAttribute('role', 'figure');
  root.dataset.reticulyneViewer = '';
  const canvas = div({
    position: 'absolute',
    top: 0,
    left: 0,
    width: '100%',
    height: '100%'
  });
  canvas.setAttribute('aria-hidden', 'true');
  const outline = div(VISUALLY_HIDDEN);
  root.append(canvas, outline);
  container.appendChild(root);

  const builtins: Promise<void> = loaded.pendingBuiltins.length
    ? loadDrawings().then(
        (drawings) => {
          model = withBuiltins(model, drawings);
        },
        () => {
          // Placeholders stay: the drawings chunk could not be loaded.
        }
      )
    : Promise.resolve();

  const fit = () => {
    if (!prepared || !drawing) return;
    const rect = root.getBoundingClientRect();
    if (rect.width === 0 || rect.height === 0) return;
    const { zoom, scroll } = prepared.fit({
      width: rect.width,
      height: rect.height
    });
    drawing.layers.forEach((layer) => {
      setStyle(layer, {
        transform: `translate(${scroll.x}px, ${scroll.y}px) scale(${zoom})`
      });
    });
    if (drawing.grid) {
      placeGrid(drawing.grid, prepared.projection, rect, zoom, scroll);
    }
  };

  const writeOutline = (view: PreparedView) => {
    outline.replaceChildren();
    const heading = html('p');
    heading.textContent = `${model.title}: ${view.name}, ${view.nodes.length} objects.`;
    outline.appendChild(heading);
    const names = new Map(
      model.items.map((item) => {
        return [item.id, item.name || 'Untitled'];
      })
    );
    const links = new Map<string, string[]>();
    view.connectors.forEach((c) => {
      const connector = model.views
        .find((v) => {
          return v.id === view.id;
        })
        ?.connectors?.find((x) => {
          return x.id === c.id;
        });
      const ends = connector?.anchors
        .map((a) => {
          return a.ref.item;
        })
        .filter((id): id is string => {
          return Boolean(id);
        });
      if (!ends || ends.length < 2) return;
      const [a, b] = [ends[0], ends[ends.length - 1]];
      links.set(a, [...(links.get(a) ?? []), names.get(b) ?? '']);
      links.set(b, [...(links.get(b) ?? []), names.get(a) ?? '']);
    });
    const list = html('ul');
    view.nodes
      .slice()
      .reverse()
      .forEach((node) => {
        const li = html('li');
        const parts = [node.name || 'Untitled'];
        if (node.description) parts.push(plainText(node.description));
        const linked = links.get(node.id);
        if (linked?.length) parts.push(`Connected to ${linked.join(', ')}.`);
        li.textContent = parts.join('. ');
        list.appendChild(li);
      });
    outline.appendChild(list);
    if (views.length > 1) {
      views.forEach((v) => {
        if (v.id === view.id) return;
        const button = html('button');
        button.type = 'button';
        button.textContent = `Show ${v.name}`;
        button.addEventListener('click', () => {
          showView(v.id);
        });
        outline.appendChild(button);
      });
    }
  };

  const draw = async (): Promise<void> => {
    generation += 1;
    const mine = generation;
    delete root.dataset.viewerReady;
    await builtins;
    if (destroyed || mine !== generation) return;
    const theme = viewerTheme(themeMode);
    root.style.background =
      options.background === undefined ? theme.background : options.background;
    root.style.color = theme.textPrimary;
    prepared = prepareView(model, viewId, override);
    root.dataset.view = viewId;
    root.dataset.projection = toPublic(prepared.projection);
    root.setAttribute('aria-label', `${model.title}: ${prepared.name}`);
    canvas.replaceChildren();
    drawing = drawView(
      canvas,
      prepared,
      {
        theme,
        onFollowStub: (stub) => {
          showView(stub.remoteViewId);
        }
      },
      Boolean(options.grid)
    );
    writeOutline(prepared);
    fit();
    const current = drawing;
    await Promise.all(
      current.images.map((img) => {
        // decode() is missing in some environments (jsdom); a broken image
        // is drawn as the browser draws one.
        return typeof img.decode === 'function'
          ? img.decode().catch(() => {})
          : Promise.resolve();
      })
    );
    if (destroyed || mine !== generation) return;
    current.labels.forEach((label) => {
      label.measure();
    });
    fit();
    await frame();
    if (destroyed || mine !== generation) return;
    root.dataset.viewerReady = '';
  };

  let ready = draw();

  const observer =
    typeof ResizeObserver === 'undefined'
      ? null
      : new ResizeObserver(() => {
          fit();
        });
  observer?.observe(root);

  const api: Viewer = {
    get title() {
      return model.title;
    },
    views,
    get view() {
      return viewId;
    },
    get projection() {
      return prepared
        ? toPublic(prepared.projection)
        : (options.projection ??
            views.find((v) => {
              return v.id === viewId;
            })!.kind);
    },
    element: root,
    get ready() {
      return ready;
    },
    setView(id, viewOptions = {}) {
      if (destroyed) return ready;
      if (
        !views.some((v) => {
          return v.id === id;
        })
      ) {
        throw new ViewerError(`The diagram has no view "${id}".`);
      }
      if ('projection' in viewOptions)
        override = toInternal(viewOptions.projection);
      const changed = id !== viewId;
      viewId = id;
      ready = draw();
      if (changed) options.onViewChange?.(id);
      return ready;
    },
    setProjection(projection) {
      if (destroyed) return ready;
      override = toInternal(projection);
      ready = draw();
      return ready;
    },
    setTheme(theme) {
      if (destroyed) return ready;
      themeMode = theme;
      ready = draw();
      return ready;
    },
    refit() {
      fit();
    },
    destroy() {
      if (destroyed) return;
      destroyed = true;
      observer?.disconnect();
      root.remove();
    }
  };
  showView = (id) => {
    void api.setView(id);
  };
  return api;
};

export type { Icon };
