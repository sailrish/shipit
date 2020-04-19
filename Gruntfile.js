// TODO: This file was created by bulk-decaffeinate.
// Sanity-check the conversion and remove this comment.
/*
 * decaffeinate suggestions:
 * DS102: Remove unnecessary code created because of implicit returns
 * Full docs: https://github.com/decaffeinate/decaffeinate/blob/master/docs/suggestions.md
 */
module.exports = grunt => {
  grunt.initConfig({
    ts: {
      default: {
        tsconfig: './tsconfig.json'
      }
    }
  });

  grunt.loadNpmTasks('grunt-babel');
  grunt.loadNpmTasks('grunt-ts');
  grunt.loadNpmTasks('grunt-mocha-test');

  return grunt.registerTask('default', ['ts', 'mochaTest']);
};
