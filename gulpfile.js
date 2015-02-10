var fs = require('fs');
var gulp = require('gulp');
var jsdoc2md = require('jsdoc-to-markdown');
var mocha = require('gulp-mocha');

gulp.task('docs', function () {
  var src = 'lib/*.js';
  var dest = 'README.md';
  var options = {
    template: 'lib/README_tpl.hbs'
  };

  jsdoc2md.render(src, options)
    .on('error', function(err){
      console.log(err);
    })
    .pipe(fs.createWriteStream(dest));
});

gulp.task('test', function () {
  gulp.src('test/**/*.js')
    .pipe(mocha({
      reporter: 'spec'
    }));
});
