'use strict'

const gulp = require('gulp')
const standard = require('gulp-standard')
const webpack = require('gulp-webpack')
const clean = require('gulp-clean')
const babili = require('gulp-babili')

gulp.task('standard', function () {
  return gulp.src([
    'gulpfile.js',
    'extension/src/**/*.js',
    'firebase/functions/*.js',
    'firebase/public/*.js'
  ])
    .pipe(standard({ globals: ['fetch'] }))
    .pipe(standard.reporter('default', {
      breakOnError: true,
      quiet: true
    }))
})

gulp.task('prebuild:js', ['standard'], function () {
  return gulp.src('extension/build/*', { read: false })
    .pipe(clean())
})

gulp.task('build:js', ['prebuild:js'], function () {
  return gulp.src('extension/src/content_scripts/index.js')
    .pipe(webpack({
      output: {
        filename: 'contentScripts.js'
      },
      module: {
        loaders: [{
          test: /\.js$/,
          exclude: /node_modules/,
          loader: 'babel-loader',
          query: {
            presets: [['env', {
              targets: {
                browsers: 'last 4 Chrome versions'
              }
            }]]
          }
        }, {
          test: /\.js$/,
          exclude: /node_modules/,
          loader: 'htmlts-loader'
        }]
      }
    }))
    .pipe(babili())
    .pipe(gulp.dest('extension/build/'))
})

gulp.task('default', ['build:js'])
