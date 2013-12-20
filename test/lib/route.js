/**
 * Route tests
 */

var koa = require('koa')
  , http = require('http')
  , request = require('supertest')
  , router = require('../../lib/router')
  , should = require('should');

describe('Route', function() {
  it('executes route middleware using `app.context`', function(done) {
    var app = koa();
    app.use(router(app));
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

  it('captures URL path parameters', function(done) {
    var app = koa();
    app.use(router(app));
    app.get('/:category/:title', function *(next) {
      this.should.have.property('params');
      this.params.should.be.a('object');
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
        this.status = 204
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
});
