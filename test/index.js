/**
 * Router tests
 */

var fs = require('fs');
var path = require('path');
var request = require('supertest');
var router = require('..');
var should = require('should');
var koa = require('koa');
var http = require('http');
var methods = require('methods');

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

  it('should match corresponding requests', function(done) {
    var app = koa();
    app.use(router(app));
    methods.forEach(function(method) {
      app.should.have.property(method.toLowerCase());
    });
    app.get('/:category/:title', function *(category, title, next) {
      category.should.equal('programming');
      title.should.equal('how-to-node');
      this.status = 204;
    });
    app.post('/:category', function *(category, next) {
      category.should.equal('programming');
      this.status = 204;
    });
    var server = http.createServer(app.callback());
    request(server)
    .get('/programming/how-to-node')
    .expect(204)
    .end(function(err, res) {
      if (err) return done(err);
      request(server)
      .post('/programming')
      .expect(204)
      .end(function(err, res) {
        if (err) return done(err);
        done();
      });
    });
  });

  it('should support generators', function(done) {
    var app = koa();
    app.use(router(app));
    app.use(function(next) {
      return function *() {
        done();
      };
    });
    var readVersion = function() {
      return function(fn) {
        var packagePath = path.join(__dirname, '..', 'package.json');
        fs.readFile(packagePath, 'utf8', function(err, data) {
          if (err) return fn(err);
          fn(null, JSON.parse(data).version);
        });
      };
    };
    app.get('/', function *(next) {
      var version = yield readVersion();
      this.status = 204;
      return yield next;
    });
    request(http.createServer(app.callback()))
    .get('/')
    .expect(204)
    .end(function(err, res) {
      if (err) return done(err);
    });
  });

  it('should provide `app.all()` to route all methods', function(done) {
    var app = koa();
    app.use(router(app));
    var route = app.all('/', function *(next) {
      this.status = 204;
    });
    methods.forEach(function(method) {
      method = method.toUpperCase();
      app.routes.should.have.property(method);
      app.routes[method].should.include(route);
    });
    done();
  });
});
