/**
 * Router test
 */

var fs = require('fs');
var path = require('path');
var request = require('supertest');
var router = require('..');
var should = require('should');
var koa = require('koa');
var http = require('http');

describe('module', function() {
  it('should expose middleware', function(done) {
    var app = koa();
    should.exist(router);
    router.should.be.a('function');
    done();
  });
});

describe('Router', function() {
  it('should create new router with koa app', function(done) {
    var app = koa();
    var middleware = router(app);
    middleware.should.be.a('function');
    done();
  });

  it('.dispatch() should match corresponding requests', function(done) {
    var app = koa();
    app.use(router(app));
    app.use(function(next) {
      done();
    });
    app.get('/match/this', function(next) {
      next();
    });
    request(http.createServer(app.callback()))
    .get('/match/this')
    .end(function(err) {
      if (err) return done(err);
    });
  });

  it('.route() should support generators', function(done) {
    var app = koa();
    app.use(router(app));
    var readVersion = function() {
      return function(fn) {
        var packagePath = path.join(__dirname, '..', 'package.json');
        fs.readFile(packagePath, 'utf8', function(err, data) {
          if (err) return fn(err);
          fn(null, JSON.parse(data).version);
        });
      };
    };
    app.get('/match/this', function *(next) {
      var version = yield readVersion();
      done();
    });
    request(http.createServer(app.callback()))
    .get('/match/this')
    .end(function(err) {
      if (err) return done(err);
    });
  });

  it('.route() should support multiple callbacks', function(done) {
    var app = koa();
    app.use(router(app));
    app.use(function(next) {
      done();
    });
    app.get(
      '/multiple/callbacks',
      function(next) {
        next();
      },
      function(next) {
        next();
      },
      function(next) {
        next();
      }
    );
    request(http.createServer(app.callback()))
    .get('/multiple/callbacks')
    .end(function(err) {
      if (err) return done(err);
    });
  });
});
