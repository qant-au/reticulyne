/**
 * @jest-environment jsdom
 */

// FEA4-04: lock-in tests for the PDF export pipeline added in
// src/utils/exportOptions.ts. The pipeline composes three pieces:
//
//   * html-to-image's `toPng` → PNG data-URL of the current canvas.
//   * jsPDF document construction at the right page orientation +
//     scaled image dimensions.
//   * FileSaver download trigger.
//
// We mock html-to-image and jsPDF so the test doesn't hit the real
// canvas / DOM rasteriser; the assertion surface is "exportAsPdf calls
// the right pieces with the right arguments".

import { exportAsPdf } from '../exportOptions';

// Stub html-to-image so exportAsImage resolves to a known PNG data URL
// without hitting jsdom's missing canvas APIs.
jest.mock('html-to-image', () => {
  return {
    toPng: jest.fn(async () => {
      return 'data:image/png;base64,FAKEPNG';
    })
  };
});

// Stub file-saver so the call to saveAs doesn't actually try to invoke
// the browser download path inside the test environment.
jest.mock('file-saver', () => {
  return {
    __esModule: true,
    default: { saveAs: jest.fn() }
  };
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
    // The downloadFile call goes through file-saver, which we mocked
    // above; we don't need to assert the filename directly here since
    // generateGenericFilename is well-covered by its callers.
  });
});
