const React = require('react');
const ReactQuill = React.forwardRef(function ReactQuill(_props, _ref) {
  return null;
});
const Quill = {
  import() {
    return {
      sanitize: (url) => url,
      PROTOCOL_WHITELIST: [],
      SANITIZED_URL: 'about:blank'
    };
  },
  register() {}
};
module.exports = {
  __esModule: true,
  default: ReactQuill,
  Quill
};
