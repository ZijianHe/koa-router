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

    it('captures URL path parameters and extensions', function(done) {
      var app = koa();
      app.use(router(app));
      app.get('/:category/:title', function *(next) {
        this.should.have.property('params');
        this.params.should.be.type('object');
        this.params.should.have.property('category', 'match');
        this.params.should.have.property('title', 'this');
        this.params.should.have.property('ext', 'json')
        this.status = 204;
        done();
      });
      request(http.createServer(app.callback()))
      .get('/match/this.json')
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

    it('should populates ctx.params with regexp captures include undefiend', function(done) {

      var app = koa();
      app.use(router(app));
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
    })
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

  it('supports regular expression validation of single param and populates ctx.params', function(done) {
    var app = koa();
      app.use(router(app));
      app.get('articles_find', '/articles/:id', function *(next) {
        this.should.have.property('params');
        this.params.should.be.type('object');
        this.params.should.have.property('id', '255');
        this.params.should.have.property('id').above(0);
        this.status = 204;
      }).validate('articles_find', { id: '[0-9]+' });
      request(http.createServer(app.callback()))
      .get('/articles/255')
      .expect(204)
      .end(function(err) {
        if (err) return done(err);
        done();
      });
  });

  it('supports regular expression validation of single param and populates ctx.params when a RegExp object is used', function(done) {
    var app = koa();
      app.use(router(app));
      app.get('articles_find', '/articles/:id', function *(next) {
        this.should.have.property('params');
        this.params.should.be.type('object');
        this.params.should.have.property('id', '255');
        this.params.should.have.property('id').above(0);
        this.status = 204;
      }).validate('articles_find', { id: /[0-9]+/ });
      request(http.createServer(app.callback()))
      .get('/articles/255')
      .expect(204)
      .end(function(err) {
        if (err) return done(err);
        done();
      });
  });

  it('supports regular expression validation of multiple params and populates ctx.params', function(done) {
    var app = koa();
      app.use(router(app));
      app.get('articles_find', '/articles/:id/:name', function *(next) {
        this.should.have.property('params');
        this.params.should.be.type('object');
        this.params.should.have.property('id', '255');
        this.params.should.have.property('id').above(0);
        this.params.should.have.property('name', 'john');
        this.status = 204;
      }).validate('articles_find', { id: '[0-9]+', name: '[a-z]+' });
      request(http.createServer(app.callback()))
      .get('/articles/255/john')
      .expect(204)
      .end(function(err) {
        if (err) return done(err);
        done();
      });
  });

  it('fails regular expression validation of param when param doesn\'t match', function(done) {
    var app = koa();
      app.use(router(app));
      app.get('articles_find', '/articles/:id/:name', function *(next) {
        this.status = 204;
      }).validate('articles_find', { id: '[0-9]+', name: '[a-z]+' });
      request(http.createServer(app.callback()))
      .get('/articles/10/11')
      .expect(404)
      .end(function(err) {
        if (err) return done(err);
        done();
      });
  });

  it('fails to match because extension validation fails', function(done) {
    var app = koa();
    app.use(router(app));
    app.get('category_route', '/:category/:title', function *(next) {
      this.status = 204;
    }).validate('category_route', { ext: /^js$/ });
    request(http.createServer(app.callback()))
    .get('/match/this.json')
    .expect(404)
    .end(function(err) {
      if (err) return done(err);
      done();
    });
  });

  it('matches because extension validation fails', function(done) {
    var app = koa();
    app.use(router(app));
    app.get('category_route', '/:category/:title', function *(next) {
      this.should.have.property('params');
      this.params.should.be.type('object');
      this.params.should.have.property('category', 'match');
      this.params.should.have.property('title', 'this');
      this.params.should.have.property('ext', 'json');
      this.status = 204;
    }).validate('category_route', { ext: /^js|json|xml|csv$/ });
    request(http.createServer(app.callback()))
    .get('/match/this.json')
    .expect(204)
    .end(function(err) {
      if (err) return done(err);
      done();
    });
  });

  it('matches when ext validation is set to false and no extension is given', function(done) {
    var app = koa();
    app.use(router(app));
    app.get('category_route', '/:category/:title', function *(next) {
      this.status = 204;
    }).validate('category_route', { ext: false });
    request(http.createServer(app.callback()))
    .get('/match/this')
    .expect(204)
    .end(function(err) {
      if (err) return done(err);
      done();
    });
  });

  it('matches when ext validation is set to true and an extension is used', function(done) {
    var app = koa();
    app.use(router(app));
    app.get('category_route', '/:category/:title', function *(next) {
      this.status = 204;
    }).validate('category_route', { ext: true });
    request(http.createServer(app.callback()))
    .get('/match/this.json')
    .expect(204)
    .end(function(err) {
      if (err) return done(err);
      done();
    });
  });

  it('returns a not found when ext validation is set to false and an extension is used', function(done) {
    var app = koa();
    app.use(router(app));
    app.get('category_route', '/:category/:title', function *(next) {
      this.status = 204;
    }).validate('category_route', { ext: false });
    request(http.createServer(app.callback()))
    .get('/match/this.json')
    .expect(404)
    .end(function(err) {
      if (err) return done(err);
      done();
    });
  });

  it('matches when ext validation is set to true globally and an extension is used', function(done) {
    var app = koa();
    app.use(router(app));
    app.allowExtensions(true);
    app.get('/:category/:title', function *(next) {
      this.status = 204;
    });
    request(http.createServer(app.callback()))
    .get('/match/this.json')
    .expect(204)
    .end(function(err) {
      if (err) return done(err);
      done();
    });
  });

  it('matches when ext validation is set to a regex globally and an extension is used', function(done) {
    var app = koa();
    app.use(router(app));
    app.allowExtensions(/^xml|csv$/);
    app.get('/:category/:title', function *(next) {
      this.status = 204;
    });
    request(http.createServer(app.callback()))
    .get('/match/this.csv')
    .expect(204)
    .end(function(err) {
      if (err) return done(err);
      done();
    });
  });

  it('matches when ext validation is set to a string regex globally and an extension is used', function(done) {
    var app = koa();
    app.use(router(app));
    app.allowExtensions('^xml|csv$');
    app.get('/:category/:title', function *(next) {
      this.status = 204;
    });
    request(http.createServer(app.callback()))
    .get('/match/this.csv')
    .expect(204)
    .end(function(err) {
      if (err) return done(err);
      done();
    });
  });

  it('returns a not found when ext validation is set to false globally and an extension is used', function(done) {
    var app = koa();
    app.use(router(app));
    app.allowExtensions(false);
    app.get('/:category/:title', function *(next) {
      this.status = 204;
    });
    request(http.createServer(app.callback()))
    .get('/match/this.json')
    .expect(404)
    .end(function(err) {
      if (err) return done(err);
      done();
    });
  });

  it('returns a not found when ext validation is set to a regex globally and an invalid extension is used', function(done) {
    var app = koa();
    app.use(router(app));
    app.allowExtensions(/^xml|csv$/);
    app.get('/:category/:title', function *(next) {
      this.status = 204;
    });
    request(http.createServer(app.callback()))
    .get('/match/this.json')
    .expect(404)
    .end(function(err) {
      if (err) return done(err);
      done();
    });
  });

  it('Using a boolean validator on any field besides ext throws an exception', function(done) {
    var app = koa();
    app.use(router(app));
    app.get('category_route', '/:category/:title', function *(next) {
      this.status = 204;
    }).validate('category_route', { title: true });
    request(http.createServer(app.callback()))
    .get('/match/this.json')
    .expect(500)
    .end(function(err) {
      if (err) return done(err);
      done();
    });
  });
});
