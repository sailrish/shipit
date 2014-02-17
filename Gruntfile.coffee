module.exports = (grunt) =>
  grunt.initConfig
    coffee:
      compile:
        files:
          'lib/main.js': ['src/main.coffee']
          'lib/shipper.js': ['src/shipper.coffee']
          'lib/fedex.js': ['src/fedex.coffee']
          'lib/ups.js': ['src/ups.coffee']

  grunt.loadNpmTasks 'grunt-contrib-coffee'
  grunt.registerTask 'default', ['coffee']
