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
  , Layer = require('../../lib/layer')
  , expect = require('expect.js')
  , should = require('should');

describe('Router', function() {
  it('creates new router with koa app', function(done) {
    var app = koa();
    var router = new Router();
    router.should.be.instanceOf(Router);
    done();
  });

  it('does not register middleware more than once (gh-184)', function (done) {
    var app = koa();
    var parentRouter = new Router();
    var nestedRouter = new Router();

    nestedRouter
      .get('/first-nested-route', function *(next) {
          this.body = { n: this.n };
      })
      .get('/second-nested-route', function *(next) {
          yield next;
      })
      .get('/third-nested-route', function *(next) {
          yield next;
      });

    parentRouter.use('/parent-route', function *(next) {
      this.n = this.n ? (this.n + 1) : 1;
      yield next;
    }, nestedRouter.routes());

    app.use(parentRouter.routes());

    request(http.createServer(app.callback()))
      .get('/parent-route/first-nested-route')
      .expect(200)
      .end(function (err, res) {
        if (err) return done(err);
        expect(res.body).to.have.property('n', 1);
        done();
      });
  });

  it('does not break when nested-routes use regexp paths', function (done) {
    var app = koa();
    var parentRouter = new Router();
    var nestedRouter = new Router();

    nestedRouter
      .get(/^\/\w$/i, function *(next) {
        yield next;
      })
      .get('/first-nested-route', function *(next) {
        yield next;
      })
      .get('/second-nested-route', function *(next) {
        yield next;
      });

    parentRouter.use('/parent-route', function *(next) {
      yield next;
    }, nestedRouter.routes());

    app.use(parentRouter.routes());
    app.should.be.ok;
    done();
  });

  it('exposes middleware factory', function(done) {
    var app = koa();
    var router = new Router();
    router.should.have.property('routes');
    router.routes.should.be.type('function');
    var middleware = router.routes();
    should.exist(middleware);
    middleware.should.be.type('function');
    done();
  });

  it('supports promises for async/await', function (done) {
    var app = koa();
    app.experimental = true;
    var router = Router();
    router.get('/async', function (next) {
      var ctx = this;
      return new Promise(function (resolve, reject) {
        ctx.body = {
          msg: 'promises!'
        };
        resolve();
      });
    });

    app.use(router.routes()).use(router.allowedMethods());
    request(http.createServer(app.callback()))
      .get('/async')
      .expect(200)
      .end(function (err, res) {
        if (err) return done(err);
        expect(res.body).to.have.property('msg', 'promises!');
        done();
      });
  });

  it('matches middleware only if route was matched (gh-182)', function (done) {
    var app = koa();
    var router = new Router();
    var otherRouter = new Router();

    router.use(function *(next) {
      this.body = { bar: 'baz' };
      yield next;
    });

    otherRouter.get('/bar', function *(next) {
      this.body = this.body || { foo: 'bar' };
    });

    app.use(router.routes()).use(otherRouter.routes());

    request(http.createServer(app.callback()))
      .get('/bar')
      .expect(200)
      .end(function (err, res) {
        if (err) return done(err);
        expect(res.body).to.have.property('foo', 'bar');
        expect(res.body).to.not.have.property('bar');
        done();
      })
  });

  it('matches first to last', function (done) {
    var app = koa();
    var router = new Router();

    router
      .get('user_page', '/user/(.*).jsx', function *(next) {
        this.body = { order: 1 };
      })
      .all('app', '/app/(.*).jsx', function *(next) {
        this.body = { order: 2 };
      })
      .all('view', '(.*).jsx', function *(next) {
        this.body = { order: 3 };
      });

    request(http.createServer(app.use(router.routes()).callback()))
      .get('/user/account.jsx')
      .expect(200)
      .end(function (err, res) {
        if (err) return done(err);
        expect(res.body).to.have.property('order', 1);
        done();
      })
  });

  it('does not run subsequent middleware without yield next', function (done) {
    var app = koa();
    var router = new Router();

    router
      .get('user_page', '/user/(.*).jsx', function *(next) {
        // no yield
      }, function *(next) {
        this.body = { order: 1 };
      });

    request(http.createServer(app.use(router.routes()).callback()))
      .get('/user/account.jsx')
      .expect(404)
      .end(done)
  });

  it('nests routers with prefixes at root', function (done) {
    var app = koa();
    var api = new Router();
    var forums = new Router({
      prefix: '/forums'
    });
    var posts = new Router({
      prefix: '/:fid/posts'
    });
    var server;

    posts
      .get('/', function *(next) {
        this.status = 204;
        yield next;
      })
      .get('/:pid', function *(next) {
        this.body = this.params;
        yield next;
      });

    forums.use(posts.routes());

    server = http.createServer(app.use(forums.routes()).callback());

    request(server)
      .get('/forums/1/posts')
      .expect(204)
      .end(function (err) {
        if (err) return done(err);

        request(server)
          .get('/forums/1')
          .expect(404)
          .end(function (err) {
            if (err) return done(err);

            request(server)
              .get('/forums/1/posts/2')
              .expect(200)
              .end(function (err, res) {
                if (err) return done(err);

                expect(res.body).to.have.property('fid', '1');
                expect(res.body).to.have.property('pid', '2');
                done();
              });
          });
      });
  });

  it('nests routers with prefixes at path', function (done) {
    var app = koa();
    var api = new Router();
    var forums = new Router({
      prefix: '/api'
    });
    var posts = new Router({
      prefix: '/posts'
    });
    var server;

    posts
      .get('/', function *(next) {
        this.status = 204;
        yield next;
      })
      .get('/:pid', function *(next) {
        this.body = this.params;
        yield next;
      });

    forums.use('/forums/:fid', posts.routes());

    server = http.createServer(app.use(forums.routes()).callback());

    request(server)
      .get('/api/forums/1/posts')
      .expect(204)
      .end(function (err) {
        if (err) return done(err);

        request(server)
          .get('/api/forums/1')
          .expect(404)
          .end(function (err) {
            if (err) return done(err);

            request(server)
              .get('/api/forums/1/posts/2')
              .expect(200)
              .end(function (err, res) {
                if (err) return done(err);

                expect(res.body).to.have.property('fid', '1');
                expect(res.body).to.have.property('pid', '2');
                done();
              });
          });
      });
  });

  it('runs subrouter middleware after parent', function (done) {
    var app = koa();
    var subrouter = Router()
      .use(function *(next) {
        this.msg = 'subrouter';
        yield next;
      })
      .get('/', function *() {
        this.body = { msg: this.msg };
      });
    var router = Router()
      .use(function *(next) {
        this.msg = 'router';
        yield next;
      })
      .use(subrouter.routes());
    request(http.createServer(app.use(router.routes()).callback()))
      .get('/')
      .expect(200)
      .end(function (err, res) {
        if (err) return done(err);
        expect(res.body).to.have.property('msg', 'subrouter');
        done();
      });
  });

  it('runs parent middleware for subrouter routes', function (done) {
    var app = koa();
    var subrouter = Router()
      .get('/sub', function *() {
        this.body = { msg: this.msg };
      });
    var router = Router()
      .use(function *(next) {
        this.msg = 'router';
        yield next;
      })
      .use('/parent', subrouter.routes());
    request(http.createServer(app.use(router.routes()).callback()))
      .get('/parent/sub')
      .expect(200)
      .end(function (err, res) {
        if (err) return done(err);
        expect(res.body).to.have.property('msg', 'router');
        done();
      });
  });

  it('matches corresponding requests', function(done) {
    var app = koa();
    var router = new Router();
    app.use(router.routes());
    router.get('/:category/:title', function *(next) {
      this.should.have.property('params');
      this.params.should.have.property('category', 'programming');
      this.params.should.have.property('title', 'how-to-node');
      this.status = 204;
    });
    router.post('/:category', function *(next) {
      this.should.have.property('params');
      this.params.should.have.property('category', 'programming');
      this.status = 204;
    });
	  router.put('/:category/not-a-title', function *(next) {
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
    var router = new Router();
    app.use(router.routes());
    router.use(function *(next) {
      this.bar = 'baz';
      yield next;
    });
    router.get('/:category/:title', function *(next) {
      this.foo = 'bar';
      yield next;
    }, function *(next) {
      this.should.have.property('bar', 'baz');
      this.should.have.property('foo', 'bar');
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
    var router = new Router();
    app.use(router.routes());
    router.get('/', function *(next) {
      counter++;
      this.throw(403);
    });
    router.get('/', function *(next) {
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
    var router = new Router();
    app.use(router.routes());
    var readVersion = function() {
      return function(fn) {
        var packagePath = path.join(__dirname, '..', '..', 'package.json');
        fs.readFile(packagePath, 'utf8', function(err, data) {
          if (err) return fn(err);
          fn(null, JSON.parse(data).version);
        });
      };
    };
    router
      .get('/', function *(next) {
        yield next;
      }, function *(next) {
        var version = yield readVersion();
        this.status = 204;
        return yield next;
      });
    request(http.createServer(app.callback()))
    .get('/')
    .expect(204)
    .end(done);
  });

  describe('Router#allowedMethods()', function() {
    it('responds to OPTIONS requests', function(done) {
      var app = koa();
      var router = new Router();
      app.use(router.routes());
      app.use(router.allowedMethods());
      router.get('/users', function *() {});
      router.put('/users', function *() {});
      request(http.createServer(app.callback()))
      .options('/users')
      .expect(204)
      .end(function(err, res) {
        if (err) return done(err);
        res.header.should.have.property('allow', 'HEAD, GET, PUT');
        done();
      });
    });

    it('responds with 405 Method Not Allowed', function(done) {
      var app = koa();
      var router = new Router();
      app.use(router.routes());
      app.use(router.allowedMethods());
      router.get('/users', function *() {});
      router.put('/users', function *() {});
      router.post('/events', function *() {});
      request(http.createServer(app.callback()))
      .post('/users')
      .expect(405)
      .end(function(err, res) {
        if (err) return done(err);
        res.header.should.have.property('allow', 'HEAD, GET, PUT');
        done();
      });
    });

    it('responds with 405 Method Not Allowed using the "throw" option', function(done) {
      var app = koa();
      var router = new Router();
      app.use(router.routes());
      app.use(function* (next) {
        try {
          yield next;
        } catch (err) {
          // assert that the correct HTTPError was thrown
          err.name.should.equal('MethodNotAllowedError');
          err.statusCode.should.equal(405);

          // translate the HTTPError to a normal response
          this.body = err.name;
          this.status = err.statusCode;
        }
      });
      app.use(router.allowedMethods({ throw: true }));
      router.get('/users', function *() {});
      router.put('/users', function *() {});
      router.post('/events', function *() {});
      request(http.createServer(app.callback()))
      .post('/users')
      .expect(405)
      .end(function(err, res) {
        if (err) return done(err);
        // the 'Allow' header is not set when throwing
        res.header.should.not.have.property('allow');
        done();
      });
    });

    it('responds with user-provided throwable using the "throw" and "methodNotAllowed" options', function(done) {
      var app = koa();
      var router = new Router();
      app.use(router.routes());
      app.use(function* (next) {
        try {
          yield next;
        } catch (err) {
          // assert that the correct HTTPError was thrown
          err.message.should.equal('Custom Not Allowed Error');
          err.statusCode.should.equal(405);

          // translate the HTTPError to a normal response
          this.body = err.body;
          this.status = err.statusCode;
        }
      });
      app.use(router.allowedMethods({
        throw: true,
        methodNotAllowed: function() {
          var notAllowedErr = new Error('Custom Not Allowed Error');
          notAllowedErr.type = 'custom';
          notAllowedErr.statusCode = 405;
          notAllowedErr.body = {
            error: 'Custom Not Allowed Error',
            statusCode: 405,
            otherStuff: true
          };
          return notAllowedErr;
        }
      }));
      router.get('/users', function *() {});
      router.put('/users', function *() {});
      router.post('/events', function *() {});
      request(http.createServer(app.callback()))
      .post('/users')
      .expect(405)
      .end(function(err, res) {
        if (err) return done(err);
        // the 'Allow' header is not set when throwing
        res.header.should.not.have.property('allow');
        res.body.should.eql({ error: 'Custom Not Allowed Error',
          statusCode: 405,
          otherStuff: true
        });
        done();
      });
    });

    it('responds with 501 Not Implemented', function(done) {
      var app = koa();
      var router = new Router();
      app.use(router.routes());
      app.use(router.allowedMethods());
      router.get('/users', function *() {});
      router.put('/users', function *() {});
      request(http.createServer(app.callback()))
      .search('/users')
      .expect(501)
      .end(function(err, res) {
        if (err) return done(err);
        done();
      });
    });

    it('responds with 501 Not Implemented using the "throw" option', function(done) {
      var app = koa();
      var router = new Router();
      app.use(router.routes());
      app.use(function* (next) {
        try {
          yield next;
        } catch (err) {
          // assert that the correct HTTPError was thrown
          err.name.should.equal('NotImplementedError');
          err.statusCode.should.equal(501);

          // translate the HTTPError to a normal response
          this.body = err.name;
          this.status = err.statusCode;
        }
      });
      app.use(router.allowedMethods({ throw: true }));
      router.get('/users', function *() {});
      router.put('/users', function *() {});
      request(http.createServer(app.callback()))
      .search('/users')
      .expect(501)
      .end(function(err, res) {
        if (err) return done(err);
        // the 'Allow' header is not set when throwing
        res.header.should.not.have.property('allow');
        done();
      });
    });

    it('responds with user-provided throwable using the "throw" and "notImplemented" options', function(done) {
      var app = koa();
      var router = new Router();
      app.use(router.routes());
      app.use(function* (next) {
        try {
          yield next;
        } catch (err) {
          // assert that our custom error was thrown
          err.message.should.equal('Custom Not Implemented Error');
          err.type.should.equal('custom');
          err.statusCode.should.equal(501);

          // translate the HTTPError to a normal response
          this.body = err.body;
          this.status = err.statusCode;
        }
      });
      app.use(router.allowedMethods({
        throw: true,
        notImplemented: function() {
          var notImplementedErr = new Error('Custom Not Implemented Error');
          notImplementedErr.type = 'custom';
          notImplementedErr.statusCode = 501;
          notImplementedErr.body = {
            error: 'Custom Not Implemented Error',
            statusCode: 501,
            otherStuff: true
          };
          return notImplementedErr;
        }
      }));
      router.get('/users', function *() {});
      router.put('/users', function *() {});
      request(http.createServer(app.callback()))
      .search('/users')
      .expect(501)
      .end(function(err, res) {
        if (err) return done(err);
        // the 'Allow' header is not set when throwing
        res.header.should.not.have.property('allow');
        res.body.should.eql({ error: 'Custom Not Implemented Error',
          statusCode: 501,
          otherStuff: true
        });
        done();
      });
    });

    it('does not send 405 if route matched but status is 404', function (done) {
      var app = koa();
      var router = new Router();
      app.use(router.routes());
      app.use(router.allowedMethods());
      router.get('/users', function *() {
        this.status = 404;
      });
      request(http.createServer(app.callback()))
      .get('/users')
      .expect(404)
      .end(function(err, res) {
        if (err) return done(err);
        done();
      });
    });
  });

  it('supports custom routing detect path: ctx.routerPath', function(done) {
    var app = koa();
    var router = new Router();
    app.use(function *(next) {
      // bind helloworld.example.com/users => example.com/helloworld/users
      var appname = this.request.hostname.split('.', 1)[0];
      this.routerPath = '/' + appname + this.path;
      yield *next;
    });
    app.use(router.routes());
    router.get('/helloworld/users', function *() {
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
      var router = new Router();
      app.use(router.routes());
      methods.forEach(function(method) {
        router.should.have.property(method);
        router[method].should.be.type('function');
        router[method]('/', function *() {});
      });
      router.stack.should.have.length(methods.length);
    });

    it('registers route with a regexp path', function() {
      var router = new Router();
      methods.forEach(function(method) {
        router[method](/^\/\w$/i, function *() {}).should.equal(router);
      });
    });

    it('registers route with a given name', function() {
      var router = new Router();
      methods.forEach(function(method) {
        router[method](method, '/', function *() {}).should.equal(router);
      });
    });

    it('registers route with with a given name and regexp path', function() {
      var router = new Router();
      methods.forEach(function(method) {
        router[method](method, /^\/$/i, function *() {}).should.equal(router);
      });
    });

    it('enables route chaining', function() {
      var router = new Router();
      methods.forEach(function(method) {
        router[method]('/', function *() {}).should.equal(router);
      });
    });

    it('registers routes without params before routes with params', function(done) {
      var app = koa();
      var router = new Router();

      router.get('/:parameter', function *(next) {
        this.body = {
          test: 'foo'
        };
      });

      router.get('/notparameter', function *(next) {
        this.body = {
          test: 'bar'
        };
      });

      app.use(router.routes());
      request(http.createServer(app.callback()))
        .get('/testparameter')
        .expect(200)
        .end(function (err, res) {
          if (err) return done(err);

          expect(res.body).to.have.property('test', 'foo');
          request(http.createServer(app.callback()))
            .get('/notparameter')
            .expect(200)
            .end(function (err, res) {
              if (err) return done(err);

              expect(res.body).to.have.property('test', 'bar');
              done();
            });
        });
    });

    it.skip('resolves non-parameterized routes without attached parameters', function(done) {
      var app = koa();
      var router = new Router();

      router.get('/notparameter', function *(next) {
        this.body = {
          param: this.params.parameter,
        };
      });

      router.get('/:parameter', function *(next) {
        this.body = {
          param: this.params.parameter,
        };
      });

      app.use(router.routes());
      request(http.createServer(app.callback()))
        .get('/notparameter')
        .expect(200)
        .end(function (err, res) {
          if (err) return done(err);

          expect(res.body.param).to.equal(undefined);
          done();
        });
    });
  });

  describe('Router#use()', function (done) {
    it('uses router middleware without path', function (done) {
      var app = koa();
      var router = new Router();

      router.get('/foo/bar', function *(next) {
        this.body = {
          foobar: this.foo + 'bar'
        };
      });

      router.use(function *(next) {
        this.foo = 'baz';
        yield next;
      });

      router.use(function *(next) {
        this.foo = 'foo';
        yield next;
      });

      app.use(router.routes());
      request(http.createServer(app.callback()))
        .get('/foo/bar')
        .expect(200)
        .end(function (err, res) {
          if (err) return done(err);

          expect(res.body).to.have.property('foobar', 'foobar');
          done();
        });
    });

    it('uses router middleware at given path', function (done) {
      var app = koa();
      var router = new Router();

      router.use('/foo/bar', function *(next) {
        this.foo = 'foo';
        yield next;
      });

      router.get('/foo/bar', function *(next) {
        this.body = {
          foobar: this.foo + 'bar'
        };
      });

      app.use(router.routes());
      request(http.createServer(app.callback()))
        .get('/foo/bar')
        .expect(200)
        .end(function (err, res) {
          if (err) return done(err);

          expect(res.body).to.have.property('foobar', 'foobar');
          done();
        });
    });

    it('runs router middleware before subrouter middleware', function (done) {
      var app = koa();
      var router = new Router();
      var subrouter = new Router();

      router.use(function *(next) {
        this.foo = 'boo';
        yield next;
      });

      subrouter
        .use(function *(next) {
          this.foo = 'foo';
          yield next;
        })
        .get('/bar', function *(next) {
          this.body = {
            foobar: this.foo + 'bar'
          };
        });

      router.use('/foo', subrouter.routes());
      app.use(router.routes());
      request(http.createServer(app.callback()))
        .get('/foo/bar')
        .expect(200)
        .end(function (err, res) {
          if (err) return done(err);

          expect(res.body).to.have.property('foobar', 'foobar');
          done();
        });
    });

    it('assigns middleware to array of paths', function (done) {
      var app = koa();
      var router = new Router();

      router.use(['/foo', '/bar'], function *(next) {
        this.foo = 'foo';
        this.bar = 'bar';
        yield next;
      });

      router.get('/foo', function *(next) {
        this.body = {
          foobar: this.foo + 'bar'
        };
      });

      router.get('/bar', function *(next) {
        this.body = {
          foobar: 'foo' + this.bar
        };
      });

      app.use(router.routes());
      request(http.createServer(app.callback()))
        .get('/foo')
        .expect(200)
        .end(function (err, res) {
          if (err) return done(err);
          expect(res.body).to.have.property('foobar', 'foobar');
          request(http.createServer(app.callback()))
            .get('/bar')
            .expect(200)
            .end(function (err, res) {
              if (err) return done(err);
              expect(res.body).to.have.property('foobar', 'foobar');
              done();
            });
        });
    });

    it('without path, does not set params.0 to the matched path - gh-247', function (done) {
      var app = koa();
      var router = new Router();

      router.use(function *(next) {
        yield next;
      });

      router.get('/foo/:id', function *(next) {
        this.body = this.params;
      });

      app.use(router.routes());
      request(http.createServer(app.callback()))
        .get('/foo/815')
        .expect(200)
        .end(function (err, res) {
          if (err) return done(err);

          expect(res.body).to.have.property('id', '815');
          expect(res.body).to.not.have.property('0');
          done();
        });
    });
  });

  describe('Router#register()', function() {
    it('registers new routes', function(done) {
      var app = koa();
      var router = new Router();
      router.should.have.property('register');
      router.register.should.be.type('function');
      var route = router.register('/', ['GET', 'POST'], function *() {});
      app.use(router.routes());
      router.stack.should.be.an.instanceOf(Array);
      router.stack.should.have.property('length', 1);
      router.stack[0].should.have.property('path', '/');
      done();
    });
  });

  describe('Router#redirect()', function() {
    it('registers redirect routes', function(done) {
      var app = koa();
      var router = new Router();
      router.should.have.property('redirect');
      router.redirect.should.be.type('function');
      router.redirect('/source', '/destination', 302);
      app.use(router.routes());
      router.stack.should.have.property('length', 1);
      router.stack[0].should.be.instanceOf(Layer);
      router.stack[0].should.have.property('path', '/source');
      done();
    });

    it('redirects using route names', function(done) {
      var app = koa();
      var router = new Router();
      app.use(router.routes());
      router.get('home', '/', function *() {});
      router.get('sign-up-form', '/sign-up-form', function *() {});
      router.redirect('home', 'sign-up-form');
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

  describe('Router#route()', function () {
    it('inherits routes from nested router', function () {
      var app = koa();
      var subrouter = Router().get('child', '/hello', function *(next) {
        this.body = { hello: 'world' };
      });
      var router = Router().use(subrouter.routes());
      expect(router.route('child')).to.have.property('name', 'child');
    });
  });

  describe('Router#url()', function() {
    it('generates URL for given route', function(done) {
      var app = koa();
      var router = new Router();
      app.use(router.routes());
      router.get('books', '/:category/:title', function *(next) {
        this.status = 204;
      });
      var url = router.url('books', { category: 'programming', title: 'how to node' });
      url.should.equal('/programming/how%20to%20node');
      url = router.url('books', 'programming', 'how to node');
      url.should.equal('/programming/how%20to%20node');
      done();
    });
  });

  describe('Router#param()', function() {
    it('runs parameter middleware', function(done) {
      var app = koa();
      var router = new Router();
      app.use(router.routes());
      router
        .param('user', function *(id, next) {
          this.user = { name: 'alex' };
          if (!id) return this.status = 404;
          yield next;
        })
        .get('/users/:user', function *(next) {
          this.body = this.user;
        });
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

    it('runs parameter middleware in order of URL appearance', function(done) {
      var app = koa();
      var router = new Router();
      router
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
        });

      request(http.createServer(
        app
          .use(router.routes())
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

    it('runs parent parameter middleware for subrouter', function (done) {
      var app = koa();
      var router = new Router();
      var subrouter = new Router();
      subrouter.get('/:cid', function *(next) {
        this.body = {
          id: this.params.id,
          cid: this.params.cid
        };
      });
      router
        .param('id', function *(id, next) {
          this.params.id = 'ran';
          if (!id) return this.status = 404;
          yield next;
        })
        .use('/:id/children', subrouter.routes());

      request(http.createServer(app.use(router.routes()).callback()))
      .get('/did-not-run/children/2')
      .expect(200)
      .end(function(err, res) {
        if (err) return done(err);
        res.should.have.property('body');
        res.body.should.have.property('id', 'ran');
        res.body.should.have.property('cid', '2');
        done();
      });
    });
  });

  describe('Router#opts', function() {
    it('responds with 200', function(done) {
      var app = koa();
      var router = new Router({
        strict: true
      });
      router.get('/info', function *() {
        this.body = 'hello';
      });
      request(http.createServer(
        app
          .use(router.routes())
          .callback()))
      .get('/info')
      .expect(200)
      .end(function(err, res) {
        if (err) return done(err);
        res.text.should.equal('hello');
        done();
      });
    });

    it('should allow setting a prefix', function (done) {
      var app = koa();
      var routes = Router({ prefix: '/things/:thing_id' });

      routes.get('/list', function * (next) {
        this.body = this.params;
      });

      app.use(routes.routes());

      request(http.createServer(app.callback()))
        .get('/things/1/list')
        .expect(200)
        .end(function (err, res) {
          if (err) return done(err);
          res.body.thing_id.should.equal('1');
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
      });
      request(http.createServer(
        app
          .use(router.routes())
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
          .use(router.routes())
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
          .use(router.routes())
          .callback()))
      .get('/info/')
      .expect(404)
      .end(function(err, res) {
        if (err) return done(err);
        done();
      });
    });
  });

  describe('router.routes()', function () {
    it('should return composed middleware', function (done) {
      var app = koa();
      var router = new Router();
      var middlewareCount = 0;
      var middlewareA = function *(next) {
        middlewareCount++;
        yield next;
      };
      var middlewareB = function *(next) {
        middlewareCount++;
        yield next;
      };

      router.use(middlewareA, middlewareB);
      router.get('/users/:id', function *() {
        should.exist(this.params.id);
        this.body = { hello: 'world' };
      });

      var routerMiddleware = router.routes();

      expect(routerMiddleware).to.be.a('function');

      request(http.createServer(
        app
          .use(routerMiddleware)
          .callback()))
      .get('/users/1')
      .expect(200)
      .end(function(err, res) {
        if (err) return done(err);
        expect(res.body).to.be.an('object');
        expect(res.body).to.have.property('hello', 'world');
        expect(middlewareCount).to.equal(2);
        done();
      });
    });

    it('places a `_matchedRoute` value on context', function(done) {
      var app = koa();
      var router = new Router();
      var middleware = function *(next) {
        expect(this._matchedRoute).to.be('/users/:id')
        yield next;
      };

      router.use(middleware);
      router.get('/users/:id', function *() {
        expect(this._matchedRoute).to.be('/users/:id')
        should.exist(this.params.id);
        this.body = { hello: 'world' };
      });

      var routerMiddleware = router.routes();

      request(http.createServer(
        app
          .use(routerMiddleware)
          .callback()))
      .get('/users/1')
      .expect(200)
      .end(function(err, res) {
        if (err) return done(err);
        done();
      });
    });
  });

  describe('If no HEAD method, default to GET', function() {
    it('should default to GET', function(done) {
      var app = koa();
      var router = new Router();
      router.get('/users/:id', function *() {
        should.exist(this.params.id);
        this.body = 'hello';
      });
      request(http.createServer(
        app
          .use(router.routes())
          .callback()))
      .head('/users/1')
      .expect(200)
      .end(function(err, res) {
        if (err) return done(err);
        expect(res.body).to.be.empty();
        done();
      });
    });

    it('should work with middleware', function(done) {
      var app = koa();
      var router = new Router();
      router.get('/users/:id', function *() {
        should.exist(this.params.id);
        this.body = 'hello';
      })
      request(http.createServer(
        app
          .use(router.routes())
          .callback()))
      .head('/users/1')
      .expect(200)
      .end(function(err, res) {
        if (err) return done(err);
        expect(res.body).to.be.empty();
        done();
      });
    });
  });

  describe('Router#prefix', function () {
    it('should set opts.prefix', function () {
      var router = Router();
      expect(router.opts).to.not.have.key('prefix');
      router.prefix('/things/:thing_id');
      expect(router.opts.prefix).to.equal('/things/:thing_id');
    });

    it('should prefix existing routes', function () {
      var router = Router();
      router.get('/users/:id', function *() {
        this.body = 'test';
      })
      router.prefix('/things/:thing_id');
      var route = router.stack[0];
      expect(route.path).to.equal('/things/:thing_id/users/:id');
      expect(route.paramNames).to.have.length(2);
      expect(route.paramNames[0]).to.have.property('name', 'thing_id');
      expect(route.paramNames[1]).to.have.property('name', 'id');
    });

    describe('when used with .use(fn) - gh-247', function () {
      it('does not set params.0 to the matched path', function (done) {
        var app = koa();
        var router = new Router();

        router.use(function *(next) {
          yield next;
        });

        router.get('/foo/:id', function *() {
          this.body = this.params;
        });

        router.prefix('/things');

        app.use(router.routes());
        request(http.createServer(app.callback()))
          .get('/things/foo/108')
          .expect(200)
          .end(function (err, res) {
            if (err) return done(err);

            expect(res.body).to.have.property('id', '108');
            expect(res.body).to.not.have.property('0');
            done();
          });
      });
    });

    describe('with trailing slash', testPrefix('/admin/'));
    describe('without trailing slash', testPrefix('/admin'));

    function testPrefix(prefix) {
      return function() {
        var server;
        var middlewareCount = 0;

        before(function() {
          var app = koa();
          var router = Router();

          router.get('/', function *() {
            middlewareCount++;
            this.body = { name: this.thing };
          });

          router.use(function *(next) {
            middlewareCount++;
            this.thing = 'worked';
            yield next;
          });

          router.prefix(prefix);
          server = http.createServer(app.use(router.routes()).callback());
        });

        after(function() {
          server.close();
        });

        beforeEach(function() {
          middlewareCount = 0;
        });

        it('should support root level router middleware', function(done) {
          request(server)
          .get(prefix)
          .expect(200)
          .end(function (err, res) {
            if (err) return done(err);
            expect(middlewareCount).to.equal(2);
            expect(res.body).to.be.an('object');
            expect(res.body).to.have.property('name', 'worked');
            done();
          });
        });

        it('should support requests with a trailing path slash', function(done) {
          request(server)
          .get('/admin/')
          .expect(200)
          .end(function (err, res) {
            if (err) return done(err);
            expect(middlewareCount).to.equal(2);
            expect(res.body).to.be.an('object');
            expect(res.body).to.have.property('name', 'worked');
            done();
          });
        });

        it('should support requests without a trailing path slash', function(done) {
          request(server)
          .get('/admin')
          .expect(200)
          .end(function (err, res) {
            if (err) return done(err);
            expect(middlewareCount).to.equal(2);
            expect(res.body).to.be.an('object');
            expect(res.body).to.have.property('name', 'worked');
            done();
          });
        });
      }
    }
  });

  describe('Static Router#url()', function() {
    it('generates route URL', function() {
        var url = Router.url('/:category/:title', { category: 'programming', title: 'how-to-node' });
        url.should.equal('/programming/how-to-node');
    });

    it('escapes using encodeURIComponent()', function() {
      var url = Router.url('/:category/:title', { category: 'programming', title: 'how to node' });
      url.should.equal('/programming/how%20to%20node');
    });
  });
});
