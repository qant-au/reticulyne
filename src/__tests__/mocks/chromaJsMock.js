const chromaInstance = (_input) => {
  const instance = {
    alpha: () => instance,
    brighten: () => instance,
    darken: () => instance,
    saturate: () => instance,
    desaturate: () => instance,
    luminance: () => 0.5,
    css: () => 'rgba(0,0,0,0.5)',
    hex: () => '#000000',
    rgba: () => [0, 0, 0, 0.5],
    rgb: () => [0, 0, 0]
  };
  return instance;
};
chromaInstance.scale = () => chromaInstance;
chromaInstance.contrast = () => 1;
chromaInstance.mix = () => chromaInstance();

module.exports = chromaInstance;
module.exports.default = chromaInstance;
