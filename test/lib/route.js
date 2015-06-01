/**
 * Route tests
 */

var koa = require('koa')
  , http = require('http')
  , request = require('supertest')
  , Router = require('../../lib/router')
  , should = require('should')
  , Layer = require('../../lib/layer');

describe('Route', function() {
  it('composes multiple callbacks/middlware', function(done) {
    var app = koa();
    var router = new Router();
    app.use(router.routes());
    router.get(
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
      var router = new Router();
      app.use(router.routes());
      router.get('/:category/:title', function *(next) {
        this.should.have.property('params');
        this.params.should.be.type('object');
        this.params.should.have.property('category', 'match');
        this.params.should.have.property('title', 'this');
        this.status = 204;
      });
      request(http.createServer(app.callback()))
      .get('/match/this')
      .expect(204)
      .end(function(err, res) {
        if (err) return done(err);
        done();
      });
    });

    it('return orginal path parameters when decodeURIComponent throw error', function(done) {
      var app = koa();
      var router = new Router();
      app.use(router.routes());
      router.get('/:category/:title', function *(next) {
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

    it('populates ctx.captures with regexp captures', function(done) {
      var app = koa();
      var router = new Router();
      app.use(router.routes());
      router.get(/^\/api\/([^\/]+)\/?/i, function *(next) {
        this.should.have.property('captures');
        this.captures.should.be.instanceOf(Array);
        this.captures.should.have.property(0, '1');
        yield next;
      }, function *(next) {
        this.should.have.property('captures');
        this.captures.should.be.instanceOf(Array);
        this.captures.should.have.property(0, '1');
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

    it('return orginal ctx.captures when decodeURIComponent throw error', function(done) {
      var app = koa();
      var router = new Router();
      app.use(router.routes());
      router.get(/^\/api\/([^\/]+)\/?/i, function *(next) {
        this.should.have.property('captures');
        this.captures.should.be.type('object');
        this.captures.should.have.property(0, '101%');
        yield next;
      }, function *(next) {
        this.should.have.property('captures');
        this.captures.should.be.type('object');
        this.captures.should.have.property(0, '101%');
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

    it('populates ctx.captures with regexp captures include undefiend', function(done) {
      var app = koa();
      var router = new Router();
      app.use(router.routes());
      router.get(/^\/api(\/.+)?/i, function *(next) {
        this.should.have.property('captures');
        this.captures.should.be.type('object');
        this.captures.should.have.property(0, undefined);
        yield next;
      }, function *(next) {
        this.should.have.property('captures');
        this.captures.should.be.type('object');
        this.captures.should.have.property(0, undefined);
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
      var router = new Router();
      app.use(router.routes());
      var notexistHandle = undefined;
      (function () {
        router.get('/foo', notexistHandle);
      }).should.throw('get `/foo`: `middleware` must be a function, not `undefined`');

      (function () {
        router.get('foo router', '/foo', notexistHandle);
      }).should.throw('get `foo router`: `middleware` must be a function, not `undefined`');

      (function () {
        router.post('/foo', function() {}, notexistHandle);
      }).should.throw('post `/foo`: `middleware` must be a function, not `undefined`');
    });
  });

  describe('Route#param()', function() {
    it('composes middleware for param fn', function(done) {
      var app = koa();
      var router = new Router();
      var route = new Layer('/users/:user', ['GET'], [function *(next) {
        this.body = this.user;
      }]);
      route.param('user', function *(id, next) {
        this.user = { name: 'alex' };
        if (!id) return this.status = 404;
        yield next;
      });
      router.stack.routes.push(route);
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
      var route = new Layer('/users/:user', ['GET'], [function *(next) {
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
      router.stack.routes.push(route);
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
      var route = new Layer('/:category/:title', ['get'], [function* () {}], 'books');
      var url = route.url({ category: 'programming', title: 'how-to-node' });
      url.should.equal('/programming/how-to-node');
      url = route.url('programming', 'how-to-node');
      url.should.equal('/programming/how-to-node');
    });

    it('escapes using encodeURIComponent()', function() {
      var route = new Layer('/:category/:title', ['get'], [function *() {}], 'books');
      var url = route.url({ category: 'programming', title: 'how to node' });
      url.should.equal('/programming/how%20to%20node');
    });
  });
});
