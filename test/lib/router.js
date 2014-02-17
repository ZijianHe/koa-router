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
    router.middleware.should.be.type('function');
    var middleware = router.middleware();
    should.exist(middleware);
    middleware.should.be.type('function');
    done();
  });

  it('extends app with router methods', function(done) {
    var app = koa();
    var router = new Router(app);
    app.use(router.middleware());
    app.should.have.properties(
      'all', 'redirect', 'url', 'get',
      'put', 'patch', 'post', 'del', 'delete'
    );
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
	  app.put('/:category/not-a-title', function *(next) {
		  this.should.have.property('params');
		  this.params.should.have.property('category', 'programming');
		  this.params.should.not.have.property('title');
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
	      request(server)
		      .put('/programming/not-a-title')
		      .expect(204)
		      .end(function (err, res) {
			      done(err);
		      });
      });
    });
  });

  it('executes route middleware using `app.context`', function(done) {
    var app = koa();
    app.use(Router(app));
    app.get('/:category/:title', function *(next) {
      this.should.have.property('app');
      this.should.have.property('req');
      this.should.have.property('res');
      this.status = 204;
      done();
    });
    request(http.createServer(app.callback()))
    .get('/match/this')
    .expect(204)
    .end(function(err) {
      if (err) return done(err);
    });
  });

  it('does not match after ctx.throw()', function(done) {
    var app = koa();
    var counter = 0;
    app.use(Router(app));
    app.get('/', function *(next) {
      counter++;
      this.throw(403);
    });
    app.get('/', function *(next) {
      counter++;
    });
    var server = http.createServer(app.callback());
      request(server)
      .get('/')
      .expect(403)
      .end(function(err, res) {
        if (err) return done(err);
        counter.should.equal(1);
        done();
    });
  });

  it('supports generators for route middleware', function(done) {
    var app = koa();
    app.use(Router(app));
    app.use(function *() {
      done();
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

  it('responds to OPTIONS requests', function(done) {
    var app = koa();
    var router = new Router(app);
    app.use(router.middleware());
    app.get('/users', function *() {});
    app.put('/users', function *() {});
    request(http.createServer(app.callback()))
    .options('/users')
    .expect(204)
    .end(function(err, res) {
      if (err) return done(err);
      res.header.should.have.property('allow', 'GET, PUT');
      done();
    });
  });

  it('responds with 405 Method Not Allowed', function(done) {
    var app = koa();
    var router = new Router(app);
    app.use(router.middleware());
    app.get('/users', function *() {});
    app.put('/users', function *() {});
    app.post('/events', function *() {});
    request(http.createServer(app.callback()))
    .post('/users')
    .expect(405)
    .end(function(err, res) {
      if (err) return done(err);
      res.header.should.have.property('allow', 'GET, PUT');
      done();
    });
  });

  it('responds with 501 Not Implemented', function(done) {
    var app = koa();
    var router = new Router(app);
    app.use(router.middleware());
    app.get('/users', function *() {});
    app.put('/users', function *() {});
    request(http.createServer(app.callback()))
    .del('/users')
    .expect(501)
    .end(function(err, res) {
      if (err) return done(err);
      done();
    });
  });

  describe('Router#[verb]()', function() {
    it('registers route specific to HTTP verb', function() {
      var app = koa();
      var router = new Router(app);
      app.use(router.middleware());
      methods.forEach(function(method) {
        app.should.have.property(method);
        app[method].should.be.type('function');
        app[method]('/', function *() {});
      });
      router.routes.should.have.length(methods.length);
    });

    it('enables route chaining', function() {
      var router = new Router();
      methods.forEach(function(method) {
        router[method]('/', function *() {}).should.equal(router);
      });
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
      router.should.have.property('routes');
      router.routes.should.include(route);
      done();
    });
  });

  describe('Router#register()', function() {
    it('registers new routes', function(done) {
      var app = koa();
      var router = new Router(app);
      app.use(router.middleware());
      app.should.have.property('register');
      app.register.should.be.type('function');
      var route = app.register('/', ['GET', 'POST'], function *() {});
      router.routes.should.include(route);
      done();
    });
  });

  describe('Router#redirect()', function() {
    it('registers redirect routes', function(done) {
      var app = koa();
      var router = new Router(app);
      app.use(router.middleware());
      app.should.have.property('redirect');
      app.redirect.should.be.type('function');
      var route = app.redirect('/source', '/destination', 302);
      router.routes.should.include(route);
      done();
    });
  });

  describe('Router#url()', function() {
    it('generates URL for given route', function(done) {
      var app = koa();
      app.use(Router(app));
      app.get('books', '/:category/:title', function *(next) {
        this.status = 204;
      });
      var url = app.url('books', { category: 'programming', title: 'how to node' });
      url.should.equal('/programming/how%20to%20node');
      url = app.url('books', 'programming', 'how to node');
      url.should.equal('/programming/how%20to%20node');
      done();
    });
  });
});
