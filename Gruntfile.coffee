module.exports = (grunt) =>
  grunt.initConfig
    coffee:
      compile:
        files:
          'lib/main.js': ['src/main.coffee']
          'lib/shipper.js': ['src/shipper.coffee']
          'lib/fedex.js': ['src/fedex.coffee']
          'lib/ups.js': ['src/ups.coffee']
          'lib/usps.js': ['src/usps.coffee']
          'lib/lasership.js': ['src/lasership.coffee']
          'lib/dhl.js': ['src/dhl.coffee']
          'lib/ontrac.js': ['src/ontrac.coffee']
          'lib/upsmi.js': ['src/upsmi.coffee']
          'lib/amazon.js': ['src/amazon.coffee']
    mochaTest:
      options:
        reporter: 'nyan'
      src: ['test/*.coffee']

  grunt.loadNpmTasks 'grunt-contrib-coffee'
  grunt.loadNpmTasks 'grunt-mocha-test'

  grunt.registerTask 'default', ['coffee', 'mochaTest']
