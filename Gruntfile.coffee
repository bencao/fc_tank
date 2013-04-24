module.exports = (grunt) ->
  grunt.initConfig({
    pkg: grunt.file.readJSON('package.json'),
    coffeelint: {
      app: ['src/*.coffee'],
      tests: {
        files: {
          src: ['test/*.coffee']
        },
        options: {
          max_line_length: {
            value: 120
          }
        }
      }
    },
    qunit: {
      all: ['test/index.html']
    }
  })

  grunt.loadNpmTasks('grunt-coffeelint')
  grunt.loadNpmTasks('grunt-contrib-qunit')

  grunt.registerTask('test', ['coffeelint', 'qunit'])

