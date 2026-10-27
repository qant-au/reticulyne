import * as fs from 'fs';
import * as path from 'path';
import { renderDiagram, ViewerError } from 'src/viewer';
import { MISSING_ICON_URL } from 'src/icons/missing';
import { stubCanvas } from './stubCanvas';

const sample = (name: string) => {
  return JSON.parse(
    fs.readFileSync(
      path.resolve(__dirname, `../../../samples/${name}.json`),
      'utf8'
    )
  );
};

let container: HTMLElement;

beforeAll(stubCanvas);

beforeEach(() => {
  container = document.createElement('div');
  document.body.appendChild(container);
});

afterEach(() => {
  container.remove();
});

const nodes = (root: HTMLElement) => {
  return root.querySelectorAll('[data-node]');
};

describe('renderDiagram', () => {
  it('draws every object and connector of a view, and says when it is ready', async () => {
    const scene = sample('office-network');
    const viewer = renderDiagram(container, scene);
    await viewer.ready;
    const root = viewer.element;
    expect(container.contains(root)).toBe(true);
    expect(root.getAttribute('role')).toBe('figure');
    expect(root.dataset.viewerReady).toBe('');
    expect(viewer.title).toBe(scene.title);
    expect(viewer.views).toEqual([
      { id: 'office', name: 'Office', kind: 'iso' }
    ]);
    expect(nodes(root)).toHaveLength(scene.views[0].placements.length);
    expect(root.querySelectorAll('[data-connector]')).toHaveLength(
      scene.views[0].connectors.length
    );
    // The outline names every object for a screen reader.
    expect(root.querySelectorAll('li')).toHaveLength(
      scene.views[0].placements.length
    );
    expect(root.textContent).toContain('Firewall');
  });

  it('reads JSON text as well as an object', async () => {
    const viewer = renderDiagram(
      container,
      JSON.stringify(sample('office-network'))
    );
    await viewer.ready;
    expect(nodes(viewer.element).length).toBeGreaterThan(0);
  });

  it('gives an isometric icon its size before it loads', () => {
    const viewer = renderDiagram(container, sample('office-network'));
    return viewer.ready.then(() => {
      const img = viewer.element.querySelector('[data-node] img')!;
      expect(img.getAttribute('width')).toBe('113');
      expect((img as HTMLImageElement).style.width).toBe('113.2px');
      expect((img as HTMLImageElement).complete).toBeDefined();
    });
  });

  it('switches views and follows a floor stub to the other floor', async () => {
    const onViewChange = jest.fn();
    const viewer = renderDiagram(container, sample('two-floor-building'), {
      onViewChange
    });
    await viewer.ready;
    expect(viewer.views.length).toBe(2);
    const [ground, level1] = viewer.views;
    expect(viewer.view).toBe(ground.id);
    expect(viewer.element.dataset.view).toBe(ground.id);
    const marker =
      viewer.element.querySelector<HTMLElement>('[data-floor-stub]');
    expect(marker).not.toBeNull();
    expect(marker!.textContent).toContain(level1.name);
    marker!.click();
    await viewer.ready;
    expect(viewer.view).toBe(level1.id);
    expect(viewer.element.dataset.view).toBe(level1.id);
    expect(onViewChange).toHaveBeenCalledWith(level1.id);
    await viewer.setView(ground.id);
    expect(viewer.element.dataset.view).toBe(ground.id);
  });

  it('draws a view flat when asked, with each icon’s flat drawing', async () => {
    const scene = sample('office-network');
    const viewer = renderDiagram(container, scene, { projection: 'flat' });
    await viewer.ready;
    expect(viewer.projection).toBe('flat');
    expect(viewer.element.dataset.projection).toBe('flat');
    const img =
      viewer.element.querySelector<HTMLImageElement>('[data-node] img')!;
    expect(img.style.width).toBe('80px');
    const flatUrls = scene.icons.map((icon: { flatUrl: string }) => {
      return icon.flatUrl;
    });
    expect(flatUrls).toContain(img.getAttribute('src'));
    await viewer.setProjection(undefined);
    expect(viewer.projection).toBe('iso');
  });

  it('leaves out hidden layers and the redacted layer', async () => {
    const scene = sample('office-network');
    scene.layers = [
      { id: 'hidden', name: 'Hidden', visible: false },
      { id: 'shown', name: 'Shown' }
    ];
    scene.views[0].placements[0].layer = 'redacted';
    scene.views[0].placements[1].layer = 'hidden';
    scene.views[0].placements[2].layer = 'shown';
    const viewer = renderDiagram(container, scene);
    await viewer.ready;
    const drawn = Array.from(nodes(viewer.element)).map((n) => {
      return (n as HTMLElement).dataset.node;
    });
    expect(drawn).not.toContain(scene.views[0].placements[0].object);
    expect(drawn).not.toContain(scene.views[0].placements[1].object);
    expect(drawn).toContain(scene.views[0].placements[2].object);
    // Their names are not in the outline either.
    const names = scene.objects.slice(0, 2).map((o: { name: string }) => {
      return o.name;
    });
    names.forEach((name: string) => {
      expect(viewer.element.querySelector('ul')!.textContent).not.toContain(
        name
      );
    });
  });

  it('switches to the dark canvas', async () => {
    const viewer = renderDiagram(container, sample('office-network'));
    await viewer.ready;
    expect(viewer.element.style.background).toContain('246, 250, 255');
    await viewer.setTheme('dark');
    expect(viewer.element.style.background).toContain('26, 29, 36');
  });

  it('refuses what is not a scene, with the reason', () => {
    expect(() => {
      return renderDiagram(container, '{not json');
    }).toThrow(ViewerError);
    expect(() => {
      return renderDiagram(container, { hello: 'world' });
    }).toThrow(/Not a Reticulyne diagram/);
    const broken = sample('office-network');
    broken.views[0].placements[0].tile = 'here';
    let error: unknown;
    try {
      renderDiagram(container, broken);
    } catch (e) {
      error = e;
    }
    expect(error).toBeInstanceOf(ViewerError);
    expect((error as ViewerError).issues.length).toBeGreaterThan(0);
    // Nothing was left in the container.
    expect(container.children).toHaveLength(0);
  });

  it('refuses an unknown view', async () => {
    const viewer = renderDiagram(container, sample('office-network'));
    expect(() => {
      return viewer.setView('nowhere');
    }).toThrow(ViewerError);
  });

  it('refuses an icon URL outside the scene format allow-list', () => {
    const scene = sample('office-network');
    scene.icons[0].url = 'javascript:alert(1)';
    expect(() => {
      return renderDiagram(container, scene);
    }).toThrow(ViewerError);
  });

  it('loads built-in drawings a lean file does not carry', async () => {
    const scene = sample('office-network');
    delete scene.icons;
    const viewer = renderDiagram(container, scene);
    await viewer.ready;
    const srcs = Array.from(
      viewer.element.querySelectorAll('[data-node] img')
    ).map((img) => {
      return img.getAttribute('src');
    });
    expect(srcs.length).toBeGreaterThan(0);
    expect(srcs).not.toContain(MISSING_ICON_URL);
  });

  it('removes everything on destroy and ignores later calls', async () => {
    const viewer = renderDiagram(container, sample('office-network'));
    await viewer.ready;
    viewer.destroy();
    expect(container.children).toHaveLength(0);
    viewer.destroy();
    await viewer.setView('office');
    viewer.refit();
    expect(container.children).toHaveLength(0);
  });

  it('keeps only safe description markup', async () => {
    const scene = sample('office-network');
    scene.objects[0].description =
      '<p>Hi <strong>there</strong> <a href="javascript:alert(1)" onclick="x()">bad</a> <a href="https://example.com">good</a></p><script>window.hacked=1</script><img src=x onerror="window.hacked=1">';
    const viewer = renderDiagram(container, scene);
    await viewer.ready;
    const label = viewer.element.querySelector(
      `[data-node-label="${scene.objects[0].id}"]`
    )!;
    expect(label.querySelector('strong')!.textContent).toBe('there');
    const links = label.querySelectorAll('a');
    expect(links[0].getAttribute('href')).toBe('about:blank');
    expect(links[0].hasAttribute('onclick')).toBe(false);
    expect(links[1].getAttribute('href')).toBe('https://example.com');
    expect(links[1].getAttribute('rel')).toBe('noopener noreferrer nofollow');
    expect(label.querySelector('script, img')).toBeNull();
    expect((window as unknown as { hacked?: number }).hacked).toBeUndefined();
  });
});
