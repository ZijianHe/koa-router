/**
 * Route test
 */

var request = require('supertest');
var router = require('..');
var should = require('should');
var app = require('koa')();
var http = require('http');

describe('Route', function() {
  it('.match() should capture URL path parameters', function(done) {
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
});
