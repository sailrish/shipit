/*
 * decaffeinate suggestions:
 * DS102: Remove unnecessary code created because of implicit returns
 * Full docs: https://github.com/decaffeinate/decaffeinate/blob/master/docs/suggestions.md
 */
export default grunt => {
  grunt.initConfig({
    coffee: {
      compile: {
        files: [
          {expand: true, cwd: 'src', src: '*.coffee', dest: 'lib', ext: '.js'}
        ]
      }
    },
    mochaTest: {
      options: {
        reporter: 'spec'
      },
      src: ['test/*.coffee']
    }});

  grunt.loadNpmTasks('grunt-contrib-coffee');
  grunt.loadNpmTasks('grunt-mocha-test');

  return grunt.registerTask('default', ['coffee', 'mochaTest']);
};
