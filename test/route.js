/**
 * Route tests
 */

var request = require('supertest');
var router = require('..');
var should = require('should');
var koa = require('koa');
var http = require('http');

describe('Route', function() {
  it('should execute callbacks using `app.context`', function(done) {
    var app = koa();
    app.use(router(app));
    app.get('/:category/:title', function *(category, title) {
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

  it('should capture URL path parameters', function(done) {
    var app = koa();
    app.use(router(app));
    app.get('/:category/:title', function *(category, title) {
      category.should.be.a('string');
      title.should.be.a('string');
      category.should.equal('match');
      title.should.equal('this');
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

  it('should support multiple callbacks', function(done) {
    var app = koa();
    app.use(router(app));
    app.get(
      '/:category/:title',
      function *(category, title) {
        this.status = 500;
      },
      function *(category, title) {
        this.status = 204
      }
    );
    request(http.createServer(app.callback()))
    .get('/match/this')
    .expect(204)
    .end(function(err) {
      if (err) return done(err);
      done();
    });
  });
});
