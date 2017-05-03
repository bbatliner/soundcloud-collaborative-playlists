'use strict';

const del = require('del')
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

gulp.task('clean', function () {
  del.sync('extension/build/*')
})

gulp.task('build:js', function () {
  return gulp.src('extension/src/content_scripts/index.js')
    .pipe(webpack({
      quiet: true,
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
        }]
      },
    }))
    .pipe(babili())
    .pipe(gulp.dest('extension/build/'))
})

gulp.task('default', ['clean', 'build:js'])
