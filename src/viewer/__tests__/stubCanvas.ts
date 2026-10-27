// jsdom has no canvas 2D context, which text-box sizing (src/utils/textBox.ts)
// measures with. A stub good enough for layout: 6 px a character.
export const stubCanvas = () => {
  HTMLCanvasElement.prototype.getContext = function getContext() {
    return {
      font: '',
      measureText: (text: string) => {
        return { width: text.length * 6 };
      }
    } as unknown as CanvasRenderingContext2D;
  } as unknown as HTMLCanvasElement['getContext'];
};
