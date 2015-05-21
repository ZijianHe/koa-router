var fs = require('fs');
var gulp = require('gulp');
var jsdoc2md = require('jsdoc-to-markdown');
var mocha = require('gulp-mocha');

gulp.task('docs', function () {
  jsdoc2md({
    src: './lib/*.js',
    template: fs.readFileSync('./lib/README_tpl.hbs', 'utf8')
  })
  .on('error', function(err){
    console.log(err);
  })
  .pipe(fs.createWriteStream('README.md'));
});

gulp.task('test', function () {
  gulp.src('test/**/*.js')
    .pipe(mocha({
      reporter: 'spec'
    }));
});
