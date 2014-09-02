/**
 * Route tests
 */

var koa = require('koa')
  , http = require('http')
  , request = require('supertest')
  , Router = require('../../lib/router')
  , should = require('should')
  , Route = require('../../lib/route');

describe('Route', function() {
  it('supports regular expression route paths', function(done) {
    var app = koa();
    app.use(Router(app));
    app.get(/^\/blog\/\d{4}-\d{2}-\d{2}\/?$/i, function *(next) {
      this.status = 204;
    });
    request(http.createServer(app.callback()))
    .get('/blog/2013-04-20')
    .expect(204)
    .end(function(err) {
      if (err) return done(err);
      done();
    });
  });

  it('supports named regular express routes', function(done) {
    var app = koa();
    app.use(Router(app));
    app.get('test', /^\/test\/?/i, function *(next) {
      this.status = 204;
      yield next;
    });
    request(http.createServer(app.callback()))
    .get('/test')
    .expect(204)
    .end(function(err) {
      if (err) return done(err);
      done();
    });
  });

  it('composes multiple callbacks/middlware', function(done) {
    var app = koa();
    app.use(Router(app));
    app.get(
      '/:category/:title',
      function *(next) {
        this.status = 500;
        yield next;
      },
      function *(next) {
        this.status = 204;
        yield next;
      }
    );
    request(http.createServer(app.callback()))
    .get('/programming/how-to-node')
    .expect(204)
    .end(function(err) {
      if (err) return done(err);
      done();
    });
  });

  describe('Route#match()', function() {
    it('captures URL path parameters', function(done) {
      var app = koa();
      app.use(Router(app));
      app.get('/:category/:title', function *(next) {
        this.should.have.property('params');
        this.params.should.be.type('object');
        this.params.should.have.property('category', 'match');
        this.params.should.have.property('title', 'this');
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

    it('return orginal path parameters when decodeURIComponent throw error', function(done) {
      var app = koa();
      app.use(Router(app));
      app.get('/:category/:title', function *(next) {
        this.should.have.property('params');
        this.params.should.be.type('object');
        this.params.should.have.property('category', '100%');
        this.params.should.have.property('title', '101%');
        this.status = 204;
      });
      request(http.createServer(app.callback()))
      .get('/100%/101%')
      .expect(204)
      .end(done);
    });

    it('populates ctx.params with regexp captures', function(done) {
      var app = koa();
      app.use(Router(app));
      app.get(/^\/api\/([^\/]+)\/?/i, function *(next) {
        this.should.have.property('params');
        this.params.should.be.type('object');
        this.params.should.have.property(0, '1');
        yield next;
      }, function *(next) {
        this.should.have.property('params');
        this.params.should.be.type('object');
        this.params.should.have.property(0, '1');
        this.status = 204;
      });
      request(http.createServer(app.callback()))
      .get('/api/1')
      .expect(204)
      .end(function(err) {
        if (err) return done(err);
        done();
      });
    });

    it('return orginal ctx.params when decodeURIComponent throw error', function(done) {
      var app = koa();
      app.use(Router(app));
      app.get(/^\/api\/([^\/]+)\/?/i, function *(next) {
        this.should.have.property('params');
        this.params.should.be.type('object');
        this.params.should.have.property(0, '101%');
        yield next;
      }, function *(next) {
        this.should.have.property('params');
        this.params.should.be.type('object');
        this.params.should.have.property(0, '101%');
        this.status = 204;
      });
      request(http.createServer(app.callback()))
      .get('/api/101%')
      .expect(204)
      .end(function(err) {
        if (err) return done(err);
        done();
      });
    });

    it('populates ctx.params with regexp captures include undefiend', function(done) {
      var app = koa();
      app.use(Router(app));
      app.get(/^\/api(\/.+)?/i, function *(next) {
        this.should.have.property('params');
        this.params.should.be.type('object');
        this.params.should.have.property(0, undefined);
        yield next;
      }, function *(next) {
        this.should.have.property('params');
        this.params.should.be.type('object');
        this.params.should.have.property(0, undefined);
        this.status = 204;
      });
      request(http.createServer(app.callback()))
      .get('/api')
      .expect(204)
      .end(function(err) {
        if (err) return done(err);
        done();
      });
    });

    it('should throw friendly error message when handle not exists', function() {
      var app = koa();
      app.use(Router(app));
      var notexistHandle = undefined;
      (function () {
        app.get('/foo', notexistHandle);
      }).should.throw('get `/foo`: `middleware` must be a function, not `undefined`');

      (function () {
        app.get('foo router', '/foo', notexistHandle);
      }).should.throw('get `foo router`: `middleware` must be a function, not `undefined`');

      (function () {
        app.post('/foo', function() {}, notexistHandle);
      }).should.throw('post `/foo`: `middleware` must be a function, not `undefined`');
    });
  });

  describe('Route#param()', function() {
    it('composes middleware for param fn', function(done) {
      var app = koa();
      var router = new Router();
      var route = new Route('/users/:user', ['GET'], [function *(next) {
        this.body = this.user;
      }]);
      route.param('user', function *(id, next) {
        this.user = { name: 'alex' };
        if (!id) return this.status = 404;
        yield next;
      });
      router.routes.push(route);
      app.use(router.middleware());
      request(http.createServer(app.callback()))
      .get('/users/3')
      .expect(200)
      .end(function(err, res) {
        if (err) return done(err);
        res.should.have.property('body');
        res.body.should.have.property('name', 'alex');
        done();
      });
    });

    it('ignores params which are not matched', function(done) {
      var app = koa();
      var router = new Router();
      var route = new Route('/users/:user', ['GET'], [function *(next) {
        this.body = this.user;
      }]);
      route.param('user', function *(id, next) {
        this.user = { name: 'alex' };
        if (!id) return this.status = 404;
        yield next;
      });
      route.param('title', function *(id, next) {
        this.user = { name: 'mark' };
        if (!id) return this.status = 404;
        yield next;
      });
      router.routes.push(route);
      app.use(router.middleware());
      request(http.createServer(app.callback()))
      .get('/users/3')
      .expect(200)
      .end(function(err, res) {
        if (err) return done(err);
        res.should.have.property('body');
        res.body.should.have.property('name', 'alex');
        done();
      });
    });
  });

  describe('Route#url()', function() {
    it('generates route URL', function() {
      var route = new Route('/:category/:title', ['get'], [function* () {}], 'books');
      var url = route.url({ category: 'programming', title: 'how-to-node' });
      url.should.equal('/programming/how-to-node');
      url = route.url('programming', 'how-to-node');
      url.should.equal('/programming/how-to-node');
    });

    it('escapes using encodeURIComponent()', function() {
      var route = new Route('/:category/:title', ['get'], [function *() {}], 'books');
      var url = route.url({ category: 'programming', title: 'how to node' });
      url.should.equal('/programming/how%20to%20node');
    });
  });
});
