  it('trims trailing / on nestings', () => { // #335

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
