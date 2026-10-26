/**
 * @jest-environment jsdom
 */
import { useEffect } from 'react';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import {
  render,
  screen,
  cleanup,
  fireEvent,
  act,
  waitFor
} from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { ThemeProvider } from '@mui/material/styles';
import Reticulyne, { useReticulyne } from '../Reticulyne';
import { ModelProvider } from 'src/stores/modelStore';
import { SceneProvider } from 'src/stores/sceneStore';
import { UiStateProvider } from 'src/stores/uiStateStore';
import { HistoryProvider } from 'src/stores/historyStore';
import { createReticulyneTheme } from 'src/styles/theme';
import { offsetOf } from 'src/components/ImportMermaidDialog/ImportMermaidDialog';
import type { Scene } from 'src/core';

beforeAll(() => {
  // A placed node renders a label, which jsdom cannot scroll.
  if (!Element.prototype.scrollTo) Element.prototype.scrollTo = () => {};
  // Text boxes measure their content with a canvas 2D context, which
  // jsdom does not implement.
  HTMLCanvasElement.prototype.getContext = (() => {
    return {
      font: '',
      measureText: () => {
        return { width: 10 };
      }
    };
  }) as unknown as HTMLCanvasElement['getContext'];
  if (!('ResizeObserver' in globalThis)) {
    (globalThis as unknown as { ResizeObserver: unknown }).ResizeObserver =
      class {
        observe() {}
        unobserve() {}
        disconnect() {}
      };
  }
  if (!window.matchMedia) {
    Object.defineProperty(window, 'matchMedia', {
      writable: true,
      value: (query: string) => {
        return {
          matches: false,
          media: query,
          onchange: null,
          addEventListener: () => {},
          removeEventListener: () => {},
          addListener: () => {},
          removeListener: () => {},
          dispatchEvent: () => {
            return false;
          }
        };
      }
    });
  }
});

afterEach(() => {
  cleanup();
});

const sample: Scene = JSON.parse(
  readFileSync(join(__dirname, '../../samples/three-tier-web.json'), 'utf8')
);

const openMenuItem = async (name: string) => {
  await act(async () => {
    await userEvent.click(screen.getByRole('button', { name: /main menu/i }));
  });
  await act(async () => {
    await userEvent.click(await screen.findByText(name));
  });
};

describe('Export as Mermaid', () => {
  test('previews the current view as flowchart text, with its options', async () => {
    render(<Reticulyne initialData={sample} />);
    await openMenuItem('Export as Mermaid');
    const text = await screen.findByTestId('mermaid-export-text');
    expect(text.textContent).toContain('flowchart LR');
    expect(text.textContent).toContain('lb["Load balancer (L7)"]');
    expect(screen.getByTestId('mermaid-export-summary').textContent).toContain(
      '14 nodes, 16 links, 3 subgraphs'
    );
    expect(screen.getByTestId('mermaid-export-warnings').textContent).toContain(
      'tile positions are not kept'
    );
    // Direction changes the text.
    await act(async () => {
      fireEvent.mouseDown(screen.getByLabelText('Direction'));
    });
    await act(async () => {
      fireEvent.click(
        await screen.findByRole('option', { name: 'Top to bottom' })
      );
    });
    expect(screen.getByTestId('mermaid-export-text').textContent).toContain(
      'flowchart TB'
    );
    // No Redacted layer content, so no opt-in is offered.
    expect(screen.queryByLabelText('Include redacted content')).toBeNull();
  });
});

describe('Import Mermaid', () => {
  test('lists errors at their place, keeps Import off, then imports', async () => {
    render(<Reticulyne initialData={sample} />);
    await openMenuItem('Import Mermaid');
    const box = (await screen.findByTestId(
      'mermaid-import-text'
    )) as HTMLTextAreaElement;
    const button = screen.getByTestId('mermaid-import-button');
    expect((button as HTMLButtonElement).disabled).toBe(true);

    await act(async () => {
      fireEvent.change(box, {
        target: { value: 'flowchart LR\n  A[Start -> B\n  C -> D' }
      });
    });
    const errors = await screen.findByTestId('mermaid-import-errors');
    expect(errors.textContent).toContain('(2 problems)');
    expect(errors.textContent).toContain('Line 2, col 4: Expected "]"');
    expect(errors.textContent).toContain(
      'Line 3, col 5: "->" is not a Mermaid link. Did you mean "-->"?'
    );
    expect((button as HTMLButtonElement).disabled).toBe(true);

    // Choosing an error puts the cursor on it.
    await act(async () => {
      fireEvent.click(screen.getByText(/Line 3, col 5/));
    });
    expect(box.selectionStart).toBe(offsetOf(box.value, 3, 5));

    await act(async () => {
      fireEvent.change(box, {
        target: {
          value:
            'flowchart LR\n  A[Start] --> B{OK?}\n  B -->|Yes| C\n  click A "https://x.test"'
        }
      });
    });
    await waitFor(() => {
      expect((button as HTMLButtonElement).disabled).toBe(false);
    });
    expect(screen.getByTestId('mermaid-import-summary').textContent).toBe(
      'Ready to import: 3 nodes, 2 links.'
    );
    expect(screen.getByTestId('mermaid-import-warnings').textContent).toContain(
      'Click actions'
    );
    await act(async () => {
      fireEvent.click(button);
    });
    await waitFor(() => {
      expect(screen.queryByTestId('mermaid-import-text')).toBeNull();
    });
    // The imported flowchart is the diagram now.
    await openMenuItem('Export as Mermaid');
    const text = await screen.findByTestId('mermaid-export-text');
    expect(text.textContent).toContain('B{"OK?"}');
    expect(text.textContent).toContain('B -->|"Yes"| C');
    expect(text.textContent).not.toContain('Load balancer');
  });

  test('reads a dropped-in Markdown file and refuses a huge one', async () => {
    render(<Reticulyne initialData={sample} />);
    await openMenuItem('Import Mermaid');
    const input = (await screen.findByTestId(
      'mermaid-import-file'
    )) as HTMLInputElement;
    const md = new File(
      ['# Notes\n\n```mermaid\nflowchart TD\n  x --> y\n```\n'],
      'notes.md',
      { type: 'text/markdown' }
    );
    await act(async () => {
      fireEvent.change(input, { target: { files: [md] } });
    });
    await waitFor(() => {
      expect(
        (screen.getByTestId('mermaid-import-text') as HTMLTextAreaElement).value
      ).toContain('flowchart TD');
    });
    await waitFor(() => {
      expect(
        (screen.getByTestId('mermaid-import-button') as HTMLButtonElement)
          .disabled
      ).toBe(false);
    });
    const huge = new File(['x'], 'huge.mmd');
    Object.defineProperty(huge, 'size', { value: 5_000_000 });
    await act(async () => {
      fireEvent.change(input, { target: { files: [huge] } });
    });
    expect(await screen.findByText(/huge\.mmd.*at most 1 MB/)).toBeTruthy();
  });

  test('offsetOf finds a line and column', () => {
    expect(offsetOf('ab\ncde\nf', 2, 2)).toBe(4);
    expect(offsetOf('ab', 9, 9)).toBe(2);
  });
});

describe('useReticulyne Mermaid methods', () => {
  type Api = ReturnType<typeof useReticulyne>;
  const Probe = ({ onReady }: { onReady: (api: Api) => void }) => {
    const api = useReticulyne();
    useEffect(() => {
      onReady(api);
    }, [api, onReady]);
    return null;
  };

  test('exportMermaid writes the diagram; importMermaid refuses broken text', async () => {
    let api: Api | null = null;
    act(() => {
      render(
        <ThemeProvider theme={createReticulyneTheme('light')}>
          <ModelProvider>
            <SceneProvider>
              <UiStateProvider>
                <HistoryProvider>
                  <Probe
                    onReady={(a) => {
                      api = a;
                    }}
                  />
                </HistoryProvider>
              </UiStateProvider>
            </SceneProvider>
          </ModelProvider>
        </ThemeProvider>
      );
    });
    expect(api!.exportMermaid().text).toContain('flowchart LR');
    expect(api!.exportMermaid({ direction: 'TB' }).text).toContain(
      'flowchart TB'
    );
    const result = await api!.importMermaid('flowchart LR\n  A --> end');
    expect(result.ok).toBe(false);
    expect(result.issues[0]).toMatchObject({
      code: 'MMD_RESERVED_ID',
      line: 2,
      column: 9
    });
  });
});
