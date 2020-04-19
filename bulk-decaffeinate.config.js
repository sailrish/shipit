module.exports = {
  jscodeshiftScripts: [
    'prefer-function-declarations.js',
    'remove-coffee-from-imports.js',
    'top-level-this-to-exports.js'
  ],
  mochaEnvFilePattern: './test/*.js',
  fixImportsConfig: {
    searchPath: '.'
  },
  useJSModules: true
};
