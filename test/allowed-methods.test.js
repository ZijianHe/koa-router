    // it('responds to OPTIONS requests', function (done) {
    //   var app = new Koa();
    //   var router = new Router();
    //   router.get('/users', function (ctx, next) {});
    //   router.put('/users', function (ctx, next) {});

    //   app.use(router.routes());
    //   app.use(router.allowedMethods());

    //   request(http.createServer(app.callback()))
    //     .options('/users')
    //     .expect(200)
    //     .end(function (err, res) {
    //       if (err) return done(err);
    //       res.header.should.have.property('content-length', '0');
    //       res.header.should.have.property('allow', 'HEAD, GET, PUT');
    //       done();
    //     });
    // });

    // it('responds with 405 Method Not Allowed', function (done) {
    //   var app = new Koa();
    //   var router = new Router();
    //   router.get('/users', function () {});
    //   router.put('/users', function () {});
    //   router.post('/events', function () {});
    //   app.use(router.routes());
    //   app.use(router.allowedMethods());
    //   request(http.createServer(app.callback()))
    //   .post('/users')
    //   .expect(405)
    //   .end(function (err, res) {
    //     if (err) return done(err);
    //     res.header.should.have.property('allow', 'HEAD, GET, PUT');
    //     done();
    //   });
    // });

    // it('responds with 405 Method Not Allowed using the "throw" option', function (done) {
    //   var app = new Koa();
    //   var router = new Router();
    //   app.use(router.routes());
    //   app.use(function (ctx, next) {
    //     return next().catch(function (err) {
    //       // assert that the correct HTTPError was thrown
    //       err.name.should.equal('MethodNotAllowedError');
    //       err.statusCode.should.equal(405);

    //       // translate the HTTPError to a normal response
    //       ctx.body = err.name;
    //       ctx.status = err.statusCode;
    //     });
    //   });
    //   app.use(router.allowedMethods({ throw: true }));
    //   router.get('/users', function () {});
    //   router.put('/users', function () {});
    //   router.post('/events', function () {});
    //   request(http.createServer(app.callback()))
    //   .post('/users')
    //   .expect(405)
    //   .end(function (err, res) {
    //     if (err) return done(err);
    //     // the 'Allow' header is not set when throwing
    //     res.header.should.not.have.property('allow');
    //     done();
    //   });
    // });

    // it('responds with user-provided throwable using the "throw" and "methodNotAllowed" options', function (done) {
    //   var app = new Koa();
    //   var router = new Router();
    //   app.use(router.routes());
    //   app.use(function (ctx, next) {
    //     return next().catch(function (err) {
    //       // assert that the correct HTTPError was thrown
    //       err.message.should.equal('Custom Not Allowed Error');
    //       err.statusCode.should.equal(405);

    //       // translate the HTTPError to a normal response
    //       ctx.body = err.body;
    //       ctx.status = err.statusCode;
    //     });
    //   });
    //   app.use(router.allowedMethods({
    //     throw: true,
    //     methodNotAllowed: function () {
    //       var notAllowedErr = new Error('Custom Not Allowed Error');
    //       notAllowedErr.type = 'custom';
    //       notAllowedErr.statusCode = 405;
    //       notAllowedErr.body = {
    //         error: 'Custom Not Allowed Error',
    //         statusCode: 405,
    //         otherStuff: true
    //       };
    //       return notAllowedErr;
    //     }
    //   }));
    //   router.get('/users', function () {});
    //   router.put('/users', function () {});
    //   router.post('/events', function () {});
    //   request(http.createServer(app.callback()))
    //   .post('/users')
    //   .expect(405)
    //   .end(function (err, res) {
    //     if (err) return done(err);
    //     // the 'Allow' header is not set when throwing
    //     res.header.should.not.have.property('allow');
    //     res.body.should.eql({ error: 'Custom Not Allowed Error',
    //       statusCode: 405,
    //       otherStuff: true
    //     });
    //     done();
    //   });
    // });

    // it('responds with 501 Not Implemented', function (done) {
    //   var app = new Koa();
    //   var router = new Router();
    //   app.use(router.routes());
    //   app.use(router.allowedMethods());
    //   router.get('/users', function () {});
    //   router.put('/users', function () {});
    //   request(http.createServer(app.callback()))
    //   .search('/users')
    //   .expect(501)
    //   .end(function (err, res) {
    //     if (err) return done(err);
    //     done();
    //   });
    // });

    // it('responds with 501 Not Implemented using the "throw" option', function (done) {
    //   var app = new Koa();
    //   var router = new Router();
    //   app.use(router.routes());
    //   app.use(function (ctx, next) {
    //     return next().catch(function (err) {
    //       // assert that the correct HTTPError was thrown
    //       err.name.should.equal('NotImplementedError');
    //       err.statusCode.should.equal(501);

    //       // translate the HTTPError to a normal response
    //       ctx.body = err.name;
    //       ctx.status = err.statusCode;
    //     });
    //   });
    //   app.use(router.allowedMethods({ throw: true }));
    //   router.get('/users', function () {});
    //   router.put('/users', function () {});
    //   request(http.createServer(app.callback()))
    //   .search('/users')
    //   .expect(501)
    //   .end(function (err, res) {
    //     if (err) return done(err);
    //     // the 'Allow' header is not set when throwing
    //     res.header.should.not.have.property('allow');
    //     done();
    //   });
    // });
    // it('responds with user-provided throwable using the "throw" and "notImplemented" options', function (done) {
    //   var app = new Koa();
    //   var router = new Router();
    //   app.use(router.routes());
    //   app.use(function (ctx, next) {
    //     return next().catch(function (err) {
    //       // assert that our custom error was thrown
    //       err.message.should.equal('Custom Not Implemented Error');
    //       err.type.should.equal('custom');
    //       err.statusCode.should.equal(501);

    //       // translate the HTTPError to a normal response
    //       ctx.body = err.body;
    //       ctx.status = err.statusCode;
    //     });
    //   });
    //   app.use(router.allowedMethods({
    //     throw: true,
    //     notImplemented: function () {
    //       var notImplementedErr = new Error('Custom Not Implemented Error');
    //       notImplementedErr.type = 'custom';
    //       notImplementedErr.statusCode = 501;
    //       notImplementedErr.body = {
    //         error: 'Custom Not Implemented Error',
    //         statusCode: 501,
    //         otherStuff: true
    //       };
    //       return notImplementedErr;
    //     }
    //   }));
    //   router.get('/users', function () {});
    //   router.put('/users', function () {});
    //   request(http.createServer(app.callback()))
    //   .search('/users')
    //   .expect(501)
    //   .end(function (err, res) {
    //     if (err) return done(err);
    //     // the 'Allow' header is not set when throwing
    //     res.header.should.not.have.property('allow');
    //     res.body.should.eql({ error: 'Custom Not Implemented Error',
    //       statusCode: 501,
    //       otherStuff: true
    //     });
    //     done();
    //   });
    // });

    // it('does not send 405 if route matched but status is 404', function (done) {
    //   var app = new Koa();
    //   var router = new Router();
    //   app.use(router.routes());
    //   app.use(router.allowedMethods());
    //   router.get('/users', function (ctx, next) {
    //     ctx.status = 404;
    //   });
    //   request(http.createServer(app.callback()))
    //   .get('/users')
    //   .expect(404)
    //   .end(function (err, res) {
    //     if (err) return done(err);
    //     done();
    //   });
    // });

    // it('sets the allowed methods to a single Allow header #273', function (done) {
    //   // https://tools.ietf.org/html/rfc7231#section-7.4.1
    //   var app = new Koa();
    //   var router = new Router();
    //   app.use(router.routes());
    //   app.use(router.allowedMethods());

    //   router.get('/', function (ctx, next) {});

    //   request(http.createServer(app.callback()))
    //     .options('/')
    //     .expect(200)
    //     .end(function (err, res) {
    //       if (err) return done(err);
    //       res.header.should.have.property('allow', 'HEAD, GET');
    //       let allowHeaders = res.res.rawHeaders.filter((item) => item == 'Allow');
    //       expect(allowHeaders.length).to.eql(1);
    //       done();
    //     });
    // });
