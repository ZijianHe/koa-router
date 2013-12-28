/**
 * Router tests
 */

var fs = require('fs')
  , http = require('http')
  , koa = require('koa')
  , methods = require('methods')
  , path = require('path')
  , request = require('supertest')
  , Router = require('../../lib/router')
  , should = require('should');

describe('Router', function() {
  it('creates new router with koa app', function(done) {
    var app = koa();
    var router = new Router(app);
    router.should.be.instanceOf(Router);
    done();
  });

  it('exposes middleware factory', function(done) {
    var app = koa();
    var router = new Router(app);
    router.should.have.property('middleware');
    router.middleware.should.be.a('function');
    var middleware = router.middleware();
    should.exist(middleware);
    middleware.should.be.a('function');
    done();
  });

  it('matches corresponding requests', function(done) {
    var app = koa();
    app.use(Router(app));
    app.get('/:category/:title', function *(next) {
      this.should.have.property('params');
      this.params.should.have.property('category', 'programming');
      this.params.should.have.property('title', 'how-to-node');
      this.status = 204;
    });
    app.post('/:category', function *(next) {
      this.should.have.property('params');
      this.params.should.have.property('category', 'programming');
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

  it('supports generators for route middleware', function(done) {
    var app = koa();
    app.use(Router(app));
    app.use(function(next) {
      return function *() {
        done();
      };
    });
    var readVersion = function() {
      return function(fn) {
        var packagePath = path.join(__dirname, '..', '..', 'package.json');
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

  describe('Router#[verb]()', function() {
    it('registers route specific to HTTP verb', function(done) {
      var app = koa();
      var router = new Router(app);
      app.use(router.middleware());
      methods.forEach(function(method) {
        app.should.have.property(method);
        app[method].should.be.a('function');
        var route = app[method]('/', function *() {});
        router.routes[method].should.include(route);
      });
      done();
    });
  });

  describe('Router#all()', function() {
    it('registers route for all HTTP verbs', function(done) {
      var app = koa();
      var router = new Router(app);
      app.use(router.middleware());
      var route = app.all('/', function *(next) {
        this.status = 204;
      });
      methods.forEach(function(method) {
        router.should.have.property('routes');
        router.routes.should.have.property(method);
        router.routes[method].should.include(route);
      });
      done();
    });
  });

  describe('Router#map()', function() {
    it('registers route specific to array of HTTP verbs', function(done) {
      var app = koa();
      var router = new Router(app);
      app.use(router.middleware());
      app.should.have.property('map');
      app.map.should.be.a('function');
      var route = app.map(['get', 'post'], '/', function *() {});
      router.routes.get.should.include(route);
      router.routes.post.should.include(route);
      done();
    });
  });

  describe('Router#redirect()', function() {
    it('registers redirect routes', function(done) {
      var app = koa();
      var router = new Router(app);
      app.use(router.middleware());
      app.should.have.property('redirect');
      app.redirect.should.be.a('function');
      var route = app.redirect('/source', '/destination', 302);
      router.routes.get.should.include(route);
      done();
    });
  });

  describe('Router#resource()', function() {
    it('registers routes for a resource', function(done) {
      var app = koa();
      var router = new Router(app);
      app.use(router.middleware());
      app.should.have.property('resource');
      app.resource.should.be.a('function');
      app.resource('forums', {
        'options': function *() {},
        'index': function *() {},
        'show': function*() {},
        'new': function*() {},
        'create': function*() {},
        'show': function*() {},
        'read': function*() {},
        'edit': function*() {},
        'update': function*() {},
        'destroy': function*() {},
      });
      router.routes.options.length.should.equal(1);
      router.routes.get.length.should.equal(5);
      router.routes.put.length.should.equal(1);
      router.routes.post.length.should.equal(1);
      router.routes['delete'].length.should.equal(1);
      done();
    });
  });
});
