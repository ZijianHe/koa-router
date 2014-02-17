/**
 * Route tests
 */

var koa = require('koa')
  , http = require('http')
  , request = require('supertest')
  , router = require('../../lib/router')
  , should = require('should')
  , Route = require('../../lib/route');

describe('Route', function() {
  it('supports regular expression route paths', function(done) {
    var app = koa();
    app.use(router(app));
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

  it('composes multiple callbacks/middlware', function(done) {
    var app = koa();
    app.use(router(app));
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
      app.use(router(app));
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

    it('populates ctx.params with regexp captures', function(done) {
      var app = koa();
      app.use(router(app));
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
  });

  describe('Route#url()', function() {
    it('generates route URL', function() {
      var route = new Route('/:category/:title', ['get'], function* () {}, 'books');
      var url = route.url({ category: 'programming', title: 'how-to-node' });
      url.should.equal('/programming/how-to-node');
      url = route.url('programming', 'how-to-node');
      url.should.equal('/programming/how-to-node');
    });

    it('escapes using encodeURIComponent()', function() {
      var route = new Route('/:category/:title', ['get'], function *() {}, 'books');
      var url = route.url({ category: 'programming', title: 'how to node' });
      url.should.equal('/programming/how%20to%20node');
    });
  });
});
