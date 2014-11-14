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
  , Route = require('../../lib/route')
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

  it('supports custom routing detect path: ctx.routerPath', function(done) {
    var app = koa();
    var router = new Router(app);
    app.use(function *(next) {
      // bind helloworld.example.com/users => example.com/helloworld/users
      var appname = this.request.hostname.split('.', 1)[0];
      this.routerPath = '/' + appname + this.path;
      yield *next;
    });
    app.use(router.middleware());
    app.get('/helloworld/users', function *() {
      this.body = this.method + ' ' + this.url;
    });

    request(http.createServer(app.callback()))
    .get('/users')
    .set('Host', 'helloworld.example.com')
    .expect(200)
    .expect('GET /users', done);
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
      app.all('/', function *(next) {
        this.status = 204;
      });
      app.use(router.middleware());
      router.should.have.property('routes');
      router.routes.should.have.property('length', 1);
      router.routes[0].should.be.instanceOf(Route);
      router.routes[0].should.have.property('path', '/');
      done();
    });
  });

  describe('Router#register()', function() {
    it('registers new routes', function(done) {
      var app = koa();
      var router = new Router(app);
      router.should.have.property('register');
      router.register.should.be.type('function');
      var route = router.register('/', ['GET', 'POST'], function *() {});
      app.use(router.middleware());
      router.routes.should.be.an.instanceOf(Array);
      router.routes.should.have.property('length', 1);
      router.routes[0].should.have.property('path', '/');
      done();
    });
  });

  describe('Router#redirect()', function() {
    it('registers redirect routes', function(done) {
      var app = koa();
      var router = new Router(app);
      router.should.have.property('redirect');
      router.redirect.should.be.type('function');
      router.redirect('/source', '/destination', 302);
      app.use(router.middleware());
      router.routes.should.have.property('length', 1);
      router.routes[0].should.be.instanceOf(Route);
      router.routes[0].should.have.property('path', '/source');
      done();
    });

    it('redirects using route names', function(done) {
      var app = koa();
      var router = new Router(app);
      app.use(router.middleware());
      app.get('home', '/', function *() {});
      app.get('sign-up-form', '/sign-up-form', function *() {});
      app.redirect('home', 'sign-up-form');
      request(http.createServer(app.callback()))
        .post('/')
        .expect(301)
        .end(function(err, res) {
          if (err) return done(err);
          res.header.should.have.property('location', '/sign-up-form');
          done();
        });
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

  describe('Router#param()', function() {
    it('runs parameter middleware', function(done) {
      var app = koa();
      request(http.createServer(
        app
          .use(Router(app))
          .param('user', function *(id, next) {
            this.user = { name: 'alex' };
            if (!id) return this.status = 404;
            yield next;
          })
          .get('/users/:user', function *(next) {
            this.body = this.user;
          })
          .callback()))
      .get('/users/3')
      .expect(200)
      .end(function(err, res) {
        if (err) return done(err);
        res.should.have.property('body');
        res.body.should.have.property('name', 'alex');
        done();
      });
    });

    it('runs parameter middleware in order of URL appearance', function(done) {
      var app = koa();

      request(http.createServer(
        app
          .use(Router(app))
          .param('user', function *(id, next) {
            this.user = { name: 'alex' };
            if (this.ranFirst) {
              this.user.ordered = 'parameters';
            }
            if (!id) return this.status = 404;
            yield next;
          })
          .param('first', function *(id, next) {
            this.ranFirst = true;
            if (this.user) {
              this.ranFirst = false;
            }
            if (!id) return this.status = 404;
            yield next;
          })
          .get('/:first/users/:user', function *(next) {
            this.body = this.user;
          })
          .callback()))
      .get('/first/users/3')
      .expect(200)
      .end(function(err, res) {
        if (err) return done(err);
        res.should.have.property('body');
        res.body.should.have.property('name', 'alex');
        res.body.should.have.property('ordered', 'parameters');
        done();
      });
    });
  });

  describe('Router#opts', function() {
    it('responds with 200', function(done) {
      var app = koa();
      request(http.createServer(
        app
          .use(Router(app, {
            strict: true
          }))
          .get('/info', function *() {
            this.body = 'hello';
          })
          .callback()))
      .get('/info')
      .expect(200)
      .end(function(err, res) {
        if (err) return done(err);
        res.text.should.equal('hello');
        done();
      });
    });

    it('responds with 404 when has a trailing slash', function(done) {
      var app = koa();
      request(http.createServer(
        app
          .use(Router(app, {
            strict: true
          }))
          .get('/info', function *() {
            this.body = 'hello';
          })
          .callback()))
      .get('/info/')
      .expect(404)
      .end(function(err, res) {
        if (err) return done(err);
        done();
      });
    });
  });

  describe('use middleware with opts', function() {
    it('responds with 200', function(done) {
      var app = koa();
      var router = new Router({
        strict: true
      });
      router.get('/info', function *() {
        this.body = 'hello';
      })
      request(http.createServer(
        app
          .use(router.middleware())
          .callback()))
      .get('/info')
      .expect(200)
      .end(function(err, res) {
        if (err) return done(err);
        res.text.should.equal('hello');
        done();
      });
    });

    it('responds with 404 when has a trailing slash', function(done) {
      var app = koa();
      var router = new Router({
        strict: true
      });
      router.get('/info', function *() {
        this.body = 'hello';
      })
      request(http.createServer(
        app
          .use(router.middleware())
          .callback()))
      .get('/info/')
      .expect(404)
      .end(function(err, res) {
        if (err) return done(err);
        done();
      });
    });
  });
});
