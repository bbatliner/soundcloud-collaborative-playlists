'use strict'

const gulp = require('gulp')
const standard = require('gulp-standard')
const webpack = require('gulp-webpack')
const clean = require('gulp-clean')
const babili = require('gulp-babili')
const htmlmin = require('gulp-htmlmin')
const zip = require('gulp-zip')

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
  return gulp.src('extension/build/**/*.js', { read: false })
    .pipe(clean())
})

gulp.task('build:js', ['prebuild:js'], function () {
  return gulp.src(['extension/src/content_scripts/index.js', 'extension/src/background/index.js'])
    .pipe(webpack({
      entry: {
        contentScripts: './extension/src/content_scripts/index.js',
        background: './extension/src/background/index.js'
      },
      output: {
        filename: '[name].js'
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
    .pipe(gulp.dest('extension/build'))
})

gulp.task('minify:js', ['build:js'], function () {
  return gulp.src('extension/build/**/*.js')
    .pipe(babili())
    .pipe(gulp.dest('extension/build'))
})

gulp.task('prebuild:html', function () {
  return gulp.src('extension/build/**/*.html', { read: false })
    .pipe(clean())
})

gulp.task('build:html', ['prebuild:html'], function () {
  return gulp.src('extension/src/browser_action/*.html')
    .pipe(gulp.dest('extension/build'))
})

gulp.task('minify:html', ['build:html'], function () {
  return gulp.src('extension/build/**/*.html')
    .pipe(htmlmin({ collapseWhitespace: true, minifyCSS: true, minifyJS: true }))
    .pipe(gulp.dest('extension/build'))
})

gulp.task('build', ['build:js', 'build:html'])
gulp.task('minify', ['minify:js', 'minify:html'])

gulp.task('default', ['build'])
gulp.task('prod', ['build', 'minify'])

gulp.task('prepare', ['prod'], () => {
  return gulp.src([
    'extension/manifest.json',
    'extension/icons/**/*',
    'extension/vendor/**/*',
    'extension/build/*.js',
    'extension/build/*.html'
  ], { base: 'extension' })
    .pipe(zip('sccollaborativeplaylists.zip'))
    .pipe(gulp.dest('extension/build'))
})
