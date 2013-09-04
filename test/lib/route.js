/**
 * Route tests
 */

var koa = require('koa')
  , http = require('http')
  , request = require('supertest')
  , router = require('../../lib/router')
  , should = require('should');

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

  it('should support regular expression route paths', function(done) {
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
    .get('/programming/how-to-node')
    .expect(204)
    .end(function(err) {
      if (err) return done(err);
      done();
    });
  });

  it('should support modifying arguments for next callback', function(done) {
    var app = koa();
    app.use(router(app));
    app.get(
      '/:category/:title',
      function *(category, title) {
        should.exist(title);
        title.should.equal('how-to-node');
        title = 'how-to-node-vol2';
        return [category, title];
      },
      function *(category, title) {
        should.exist(title);
        title.should.equal('how-to-node-vol2');
        done();
      }
    );
    request(http.createServer(app.callback()))
    .get('/programming/how-to-node')
    .end(function(err) {
      if (err) return done(err);
    });
  });
});
