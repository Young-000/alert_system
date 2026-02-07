// Custom Jest transform to replace import.meta.env with process.env
// This handles Vite's import.meta.env syntax for Jest compatibility
module.exports = {
  process(src) {
    return {
      code: src.replace(/import\.meta\.env\.(\w+)/g, 'process.env.$1')
               .replace(/import\.meta\.env/g, 'process.env'),
    };
  },
};
