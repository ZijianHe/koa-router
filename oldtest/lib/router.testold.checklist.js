  it('trims trailing / on nestings', () => { // #335

  });

  describe('Router#[verb]()', function () {

    // it('registers array of paths', function () { // #203
    //   var router = new Router();
    //   router.get(['/one', '/two'], function (ctx, next) {
    //     return next();
    //   });
    //   expect(router.stack).to.have.property('length', 2);
    //   expect(router.stack[0]).to.have.property('path', '/one');
    //   expect(router.stack[1]).to.have.property('path', '/two');
    // });

  });


    // it('assigns middleware to array of paths', function (done) {
    //   var app = new Koa();
    //   var router = new Router();

    //   router.use(['/foo', '/bar'], function (ctx, next) {
    //     ctx.foo = 'foo';
    //     ctx.bar = 'bar';
    //     return next();
    //   });

    //   router.get('/foo', function (ctx, next) {
    //     ctx.body = {
    //       foobar: ctx.foo + 'bar'
    //     };
    //   });

    //   router.get('/bar', function (ctx) {
    //     ctx.body = {
    //       foobar: 'foo' + ctx.bar
    //     };
    //   });

    //   app.use(router.routes());
    //   request(http.createServer(app.callback()))
    //     .get('/foo')
    //     .expect(200)
    //     .end(function (err, res) {
    //       if (err) return done(err);
    //       expect(res.body).to.have.property('foobar', 'foobar');
    //       request(http.createServer(app.callback()))
    //         .get('/bar')
    //         .expect(200)
    //         .end(function (err, res) {
    //           if (err) return done(err);
    //           expect(res.body).to.have.property('foobar', 'foobar');
    //           done();
    //         });
    //     });
    // });

  describe('Router#redirect()', function () {
    it('registers redirect routes', function (done) {
      var app = new Koa();
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

    it('redirects using route names', function (done) {
      var app = new Koa();
      var router = new Router();
      app.use(router.routes());
      router.get('home', '/', function () {});
      router.get('sign-up-form', '/sign-up-form', function () {});
      router.redirect('home', 'sign-up-form');
      request(http.createServer(app.callback()))
        .post('/')
        .expect(301)
        .end(function (err, res) {
          if (err) return done(err);
          res.header.should.have.property('location', '/sign-up-form');
          done();
        });
    });
  });

  describe('Router#route()', function () {
    it('inherits routes from nested router', function () {
      var app = new Koa();
      var subrouter = new Router().get('child', '/hello', function (ctx) {
        ctx.body = { hello: 'world' };
      });
      var router = new Router().use(subrouter.routes());
      expect(router.route('child')).to.have.property('name', 'child');
    });
  });

  describe('Router#url()', function () {
    it('generates URL for given route name', function (done) {
      var app = new Koa();
      var router = new Router();
      app.use(router.routes());
      router.get('books', '/:category/:title', function (ctx) {
        ctx.status = 204;
      });
      var url = router.url('books', { category: 'programming', title: 'how to node' });
      url.should.equal('/programming/how%20to%20node');
      url = router.url('books', 'programming', 'how to node');
      url.should.equal('/programming/how%20to%20node');
      done();
    });

    it('generates URL for given route name within embedded routers', function (done) {
        var app = new Koa();
        var router = new Router({
          prefix: "/books"
        });

        var embeddedRouter = new Router({
          prefix: "/chapters"
        });
        embeddedRouter.get('chapters', '/:chapterName/:pageNumber', function (ctx) {
          ctx.status = 204;
        });
        router.use(embeddedRouter.routes());
        app.use(router.routes());
        var url = router.url('chapters', { chapterName: 'Learning ECMA6', pageNumber: 123 });
        url.should.equal('/books/chapters/Learning%20ECMA6/123');
        url = router.url('chapters', 'Learning ECMA6', 123);
        url.should.equal('/books/chapters/Learning%20ECMA6/123');
        done();
    });

    it('generates URL for given route name within two embedded routers', function (done) {
      var app = new Koa();
      var router = new Router({
        prefix: "/books"
      });
      var embeddedRouter = new Router({
        prefix: "/chapters"
      });
      var embeddedRouter2 = new Router({
        prefix: "/:chapterName/pages"
      });
      embeddedRouter2.get('chapters', '/:pageNumber', function (ctx) {
        ctx.status = 204;
      });
      embeddedRouter.use(embeddedRouter2.routes());
      router.use(embeddedRouter.routes());
      app.use(router.routes());
      var url = router.url('chapters', { chapterName: 'Learning ECMA6', pageNumber: 123 });
      url.should.equal('/books/chapters/Learning%20ECMA6/pages/123');
      done();
    });

    it('generates URL for given route name with params and query params', function(done) {
        var app = new Koa();
        var router = new Router();
        router.get('books', '/books/:category/:id', function (ctx) {
          ctx.status = 204;
        });
        var url = router.url('books', 'programming', 4, {
          query: { page: 3, limit: 10 }
        });
        url.should.equal('/books/programming/4?page=3&limit=10');
        var url = router.url('books',
          { category: 'programming', id: 4 },
          { query: { page: 3, limit: 10 }}
        );
        url.should.equal('/books/programming/4?page=3&limit=10');
        var url = router.url('books',
          { category: 'programming', id: 4 },
          { query: 'page=3&limit=10' }
        );
        url.should.equal('/books/programming/4?page=3&limit=10');
        done();
    })


    it('generates URL for given route name without params and query params', function(done) {
        var app = new Koa();
        var router = new Router();
        router.get('category', '/category', function (ctx) {
          ctx.status = 204;
        });
        var url = router.url('category', {
          query: { page: 3, limit: 10 }
        });
        url.should.equal('/category?page=3&limit=10');
        done();
    })
  });

  describe('Router#opts', function () {
    it('responds with 200', function (done) {
      var app = new Koa();
      var router = new Router({
        strict: true
      });
      router.get('/info', function (ctx) {
        ctx.body = 'hello';
      });
      request(http.createServer(
        app
          .use(router.routes())
          .callback()))
      .get('/info')
      .expect(200)
      .end(function (err, res) {
        if (err) return done(err);
        res.text.should.equal('hello');
        done();
      });
    });

    it('responds with 404 when has a trailing slash', function (done) {
      var app = new Koa();
      var router = new Router({
        strict: true
      });
      router.get('/info', function (ctx) {
        ctx.body = 'hello';
      });
      request(http.createServer(
        app
          .use(router.routes())
          .callback()))
      .get('/info/')
      .expect(404)
      .end(function (err, res) {
        if (err) return done(err);
        done();
      });
    });
  });

  describe('use middleware with opts', function () {
    it('responds with 200', function (done) {
      var app = new Koa();
      var router = new Router({
        strict: true
      });
      router.get('/info', function (ctx) {
        ctx.body = 'hello';
      })
      request(http.createServer(
        app
          .use(router.routes())
          .callback()))
      .get('/info')
      .expect(200)
      .end(function (err, res) {
        if (err) return done(err);
        res.text.should.equal('hello');
        done();
      });
    });

    it('responds with 404 when has a trailing slash', function (done) {
      var app = new Koa();
      var router = new Router({
        strict: true
      });
      router.get('/info', function (ctx) {
        ctx.body = 'hello';
      })
      request(http.createServer(
        app
          .use(router.routes())
          .callback()))
      .get('/info/')
      .expect(404)
      .end(function (err, res) {
        if (err) return done(err);
        done();
      });
    });
  });

  describe('If no HEAD method, default to GET', function () {
    it('should default to GET', function (done) {
      var app = new Koa();
      var router = new Router();
      router.get('/users/:id', function (ctx) {
        should.exist(ctx.params.id);
        ctx.body = 'hello';
      });
      request(http.createServer(
        app
          .use(router.routes())
          .callback()))
      .head('/users/1')
      .expect(200)
      .end(function (err, res) {
        if (err) return done(err);
        expect(res.body).to.be.empty();
        done();
      });
    });

    it('should work with middleware', function (done) {
      var app = new Koa();
      var router = new Router();
      router.get('/users/:id', function (ctx) {
        should.exist(ctx.params.id);
        ctx.body = 'hello';
      })
      request(http.createServer(
        app
          .use(router.routes())
          .callback()))
      .head('/users/1')
      .expect(200)
      .end(function (err, res) {
        if (err) return done(err);
        expect(res.body).to.be.empty();
        done();
      });
    });
  });

    describe('with trailing slash', testPrefix('/admin/'));
    describe('without trailing slash', testPrefix('/admin'));

    function testPrefix(prefix) {
      return function () {
        var server;
        var middlewareCount = 0;

        before(function () {
          var app = new Koa();
          var router = new Router();
          router.use(function (ctx, next) {
            middlewareCount++;
            ctx.thing = 'worked';
            return next();
          });
          router.get('/', function (ctx) {
            middlewareCount++;
            ctx.body = { name: ctx.thing };
          });
          router.prefix(prefix);
          app.use(router.routes());
          server = http.createServer(app.callback());
        });

        after(function () {
          server.close();
        });

        beforeEach(function () {
          middlewareCount = 0;
        });

        it('should support root level router middleware', function (done) {
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

        it('should support requests with a trailing path slash', function (done) {
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

        it('should support requests without a trailing path slash', function (done) {
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

  describe('Static Router#url()', function () {
    it('generates route URL', function () {
        var url = Router.url('/:category/:title', { category: 'programming', title: 'how-to-node' });
        url.should.equal('/programming/how-to-node');
    });

    it('escapes using encodeURIComponent()', function () {
      var url = Router.url('/:category/:title', { category: 'programming', title: 'how to node' });
      url.should.equal('/programming/how%20to%20node');
    });
  });

});
