/**
 * @jest-environment jsdom
 */

// FEA4-04: lock-in tests for the PDF export pipeline added in
// src/utils/exportOptions.ts. The pipeline composes three pieces:
//
//   * html-to-image's `toPng` → PNG data-URL of the current canvas.
//   * jsPDF document construction at the right page orientation +
//     scaled image dimensions.
//   * downloadFile() trigger (blob: URL + <a download>).
//
// We mock html-to-image and jsPDF so the test doesn't hit the real
// canvas / DOM rasteriser; the assertion surface is "exportAsPdf calls
// the right pieces with the right arguments".

import {
  DOWNLOAD_REVOKE_DELAY_MS,
  downloadFile,
  exportAsPdf,
  exportAsImage,
  filenameForTitle,
  waitForImages
} from '../exportOptions';

// Stub html-to-image so exportAsImage resolves to a known PNG data URL
// without hitting jsdom's missing canvas APIs.
jest.mock('html-to-image', () => {
  return {
    toPng: jest.fn(async () => {
      return 'data:image/png;base64,FAKEPNG';
    })
  };
});

// downloadFile() needs blob: URLs, which jsdom does not implement, and
// jsdom logs "not implemented: navigation" for an anchor click. Stub all
// three so the download path is observable and silent.
const createObjectURL = jest.fn(() => {
  return 'blob:test/1';
});
const revokeObjectURL = jest.fn();
URL.createObjectURL = createObjectURL;
URL.revokeObjectURL = revokeObjectURL;
const clicked: { href: string; download: string; attached: boolean }[] = [];
const anchorClick = jest
  .spyOn(HTMLAnchorElement.prototype, 'click')
  .mockImplementation(function (this: HTMLAnchorElement) {
    // Record what was clicked while it is still attached.
    clicked.push({
      href: this.href,
      download: this.download,
      attached: document.body.contains(this)
    });
  });

// Spy on jsPDF: capture orientation + recorded addImage calls so the
// test can assert on the document shape. The mocked instance exposes
// the minimum surface that exportAsPdf actually uses.
const addImage = jest.fn();
const output = jest.fn(() => {
  return new Blob(['fake-pdf-bytes'], { type: 'application/pdf' });
});
let lastConstructorOptions: { orientation?: string; format?: string } = {};
jest.mock('jspdf', () => {
  return {
    jsPDF: jest.fn().mockImplementation((options) => {
      lastConstructorOptions = options;
      return {
        internal: {
          pageSize: {
            getWidth: () => {
              return options.orientation === 'landscape' ? 297 : 210;
            },
            getHeight: () => {
              return options.orientation === 'landscape' ? 210 : 297;
            }
          }
        },
        addImage,
        output
      };
    })
  };
});

// jsdom's HTMLImageElement doesn't auto-fire 'load' on src assignment.
// We patch the prototype to resolve onload synchronously with whatever
// naturalWidth / naturalHeight the test sets via the helper below.
const setMockedNaturalSize = (width: number, height: number) => {
  Object.defineProperty(window.Image.prototype, 'naturalWidth', {
    configurable: true,
    get() {
      return width;
    }
  });
  Object.defineProperty(window.Image.prototype, 'naturalHeight', {
    configurable: true,
    get() {
      return height;
    }
  });
  // Hook src setter so onload fires immediately after assignment.
  Object.defineProperty(window.Image.prototype, 'src', {
    configurable: true,
    set(this: HTMLImageElement, _value: string) {
      // Fire on the next microtask so the await Promise inside
      // exportAsPdf has a chance to attach its handlers first.
      setTimeout(() => {
        this.onload?.(new Event('load'));
      }, 0);
    }
  });
};

describe('exportAsPdf (FEA4-04)', () => {
  beforeEach(() => {
    addImage.mockClear();
    output.mockClear();
    lastConstructorOptions = {};
  });

  test('a wide image produces a landscape A4 document', async () => {
    setMockedNaturalSize(2000, 1000);
    const el = document.createElement('div') as HTMLDivElement;

    await exportAsPdf(el);

    expect(lastConstructorOptions.orientation).toBe('landscape');
    expect(lastConstructorOptions.format).toBe('a4');
    expect(addImage).toHaveBeenCalledTimes(1);
    const [data, format] = addImage.mock.calls[0];
    expect(data).toBe('data:image/png;base64,FAKEPNG');
    expect(format).toBe('PNG');
  });

  test('a tall image produces a portrait A4 document', async () => {
    setMockedNaturalSize(800, 1200);
    const el = document.createElement('div') as HTMLDivElement;

    await exportAsPdf(el);

    expect(lastConstructorOptions.orientation).toBe('portrait');
    expect(addImage).toHaveBeenCalledTimes(1);
  });

  test('image fits within the page margins (preserving aspect ratio)', async () => {
    setMockedNaturalSize(2000, 1000);
    const el = document.createElement('div') as HTMLDivElement;

    await exportAsPdf(el);

    // landscape A4 = 297 x 210, with 10mm margin on each side
    // = available area 277 x 190. Aspect 2:1; widthRatio = 277/2000
    // = 0.1385; heightRatio = 190/1000 = 0.19; scale = min(0.1385,
    // 0.19) = 0.1385. drawWidth ≈ 277, drawHeight ≈ 138.5.
    const [, , offsetX, offsetY, drawWidth, drawHeight] =
      addImage.mock.calls[0];
    expect(drawWidth).toBeCloseTo(277, 0);
    expect(drawHeight).toBeCloseTo(138.5, 0);
    expect(offsetX).toBeCloseTo(10, 0); // matches the 10mm margin
    expect(offsetY).toBeCloseTo((210 - 138.5) / 2, 0); // vertically centred
  });

  test('calls output("blob") and triggers a download with a .pdf filename', async () => {
    setMockedNaturalSize(1000, 1000);
    const el = document.createElement('div') as HTMLDivElement;

    await exportAsPdf(el);

    expect(output).toHaveBeenCalledWith('blob');
    expect(clicked.at(-1)?.download).toMatch(/^reticulyne-export-.*\.pdf$/);
  });
});

describe('exportAsImage', () => {
  const imgWith = (decode: () => Promise<void>) => {
    const img = document.createElement('img');
    img.setAttribute('src', 'data:image/svg+xml,%3Csvg%3E%3C/svg%3E');
    img.setAttribute('loading', 'lazy');
    Object.defineProperty(img, 'decode', { value: jest.fn(decode) });
    return img;
  };

  // Sweep 2026-09-30 (A14): node icons are loading="lazy", and the export
  // dialog renders its editor off screen, so the lazy icons never loaded
  // and the PNG drew labels with no icons.
  test('waits for every image, lazy ones made eager, before capturing', async () => {
    const { toPng } = jest.requireMock('html-to-image') as {
      toPng: jest.Mock;
    };
    toPng.mockClear();
    const el = document.createElement('div');
    let resolveDecode: () => void = () => {};
    const img = imgWith(() => {
      return new Promise<void>((resolve) => {
        resolveDecode = resolve;
      });
    });
    el.appendChild(img);
    const pending = exportAsImage(el as HTMLDivElement);
    await Promise.resolve();
    await Promise.resolve();
    expect(img.getAttribute('loading')).toBe('eager');
    expect(toPng).not.toHaveBeenCalled();
    resolveDecode();
    await expect(pending).resolves.toBe('data:image/png;base64,FAKEPNG');
    expect(toPng).toHaveBeenCalledTimes(1);
  });

  test('fails with an Error, never drops an icon, when one will not load', async () => {
    const { toPng } = jest.requireMock('html-to-image') as {
      toPng: jest.Mock;
    };
    toPng.mockClear();
    const el = document.createElement('div');
    el.appendChild(
      imgWith(() => {
        return Promise.reject(new Error('EncodingError'));
      })
    );
    await expect(exportAsImage(el as HTMLDivElement)).rejects.toThrow(
      /did not load for the export/
    );
    expect(toPng).not.toHaveBeenCalled();
  });

  test('an image that times out fails the export', async () => {
    const el = document.createElement('div');
    el.appendChild(
      imgWith(() => {
        return new Promise<void>(() => {});
      })
    );
    await expect(waitForImages(el, 10)).rejects.toThrow(/1 image/);
  });

  // html-to-image rejects with a bare DOM Event for an image it cannot
  // embed (sweep 2026-09-30, Export as PDF); the export turns that into an
  // Error that says so instead of an empty rejection or a silent gap.
  test('an image html-to-image cannot draw fails with a real Error', async () => {
    const { toPng } = jest.requireMock('html-to-image') as {
      toPng: jest.Mock;
    };
    toPng.mockImplementationOnce(
      async (
        _el: unknown,
        opts: { onImageErrorHandler: (e: Event) => void }
      ) => {
        opts.onImageErrorHandler(new Event('error'));
        return 'data:image/png;base64,FAKEPNG';
      }
    );
    await expect(
      exportAsImage(document.createElement('div') as HTMLDivElement)
    ).rejects.toThrow(/could not be drawn/);
  });
});

describe('downloadFile (DEP-01)', () => {
  beforeEach(() => {
    clicked.length = 0;
    createObjectURL.mockClear();
    revokeObjectURL.mockClear();
    anchorClick.mockClear();
    jest.useFakeTimers();
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  test('clicks an attached <a download> for a blob: URL, then detaches it', () => {
    const blob = new Blob(['x'], { type: 'text/plain' });

    downloadFile(blob, 'diagram.json');

    expect(createObjectURL).toHaveBeenCalledWith(blob);
    expect(clicked).toEqual([
      { href: 'blob:test/1', download: 'diagram.json', attached: true }
    ]);
    expect(document.querySelectorAll('a[download]')).toHaveLength(0);
  });

  test('revokes the URL only after the delay, never synchronously', () => {
    downloadFile(new Blob(['x']), 'a.txt');

    expect(revokeObjectURL).not.toHaveBeenCalled();
    jest.advanceTimersByTime(DOWNLOAD_REVOKE_DELAY_MS - 1);
    expect(revokeObjectURL).not.toHaveBeenCalled();
    jest.advanceTimersByTime(1);
    expect(revokeObjectURL).toHaveBeenCalledWith('blob:test/1');
  });
});

describe('filenameForTitle (1.2)', () => {
  test.each([
    ['Network plan', 'Network-plan.json'],
    ['a/b\\c: "d"?', 'a-b-c-d.json'],
    ['東京 データセンター', '東京-データセンター.json'],
    ['..hidden..', 'hidden.json']
  ])('%s -> %s', (title, expected) => {
    expect(filenameForTitle(title, 'json')).toBe(expected);
  });

  test.each([['Untitled'], [''], ['///'], [undefined]])(
    '%s falls back to the generic name',
    (title) => {
      expect(filenameForTitle(title, 'json')).toMatch(
        /^reticulyne-export-.*\.json$/
      );
    }
  );
});
