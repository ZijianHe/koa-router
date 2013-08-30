/**
 * Route test
 */

var request = require('supertest');
var router = require('..');
var should = require('should');
var koa = require('koa');
var http = require('http');

describe('Route', function() {
  it('.match() should capture URL path parameters', function(done) {
    var app = koa();
    app.use(router(app));
    app.get('/:category/:title', function(category, title, next) {
      category.should.be.a('string');
      title.should.be.a('string');
      category.should.equal('match');
      title.should.equal('this');
      done();
    });
    request(http.createServer(app.callback()))
    .get('/match/this')
    .end(function(err) {
      if (err) return done(err);
    });
  });

  it('callbacks should be called using `app.context`', function(done) {
    var app = koa();
    app.use(router(app));
    app.get('/:category/:title', function(category, title, next) {
      this.should.have.property('app');
      this.should.have.property('req');
      this.should.have.property('res');
      done();
    });
    request(http.createServer(app.callback()))
    .get('/match/this')
    .end(function(err) {
      if (err) return done(err);
    });
  });
});
