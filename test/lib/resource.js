/**
 * Resource tests
 */

var koa = require('koa')
  , http = require('http')
  , request = require('supertest')
  , Router = require('../../lib/router')
  , should = require('should');

describe('Resource', function() {
  it('creates `app.resource()` alias', function(done) {
    var app = koa();
    app.use(Router(app));
    app.should.have.property('resource');
    app.resource.should.be.a('function');
    done();
  });

  it('creates new resource', function(done) {
    var app = koa();
    app.use(Router(app));
    var resource = app.resource('forums', {
      index: function *() {},
      show: function *() {}
    });
    resource.should.be.a('object');
    resource.should.have.property('name', 'forums');
    resource.should.have.property('id', 'forum');
    resource.should.have.property('routes');
    resource.routes.should.be.an.instanceOf(Array);
    resource.routes.should.have.property(0);
    resource.routes.should.have.property(1);
    resource.routes[0].should.have.property('path', '/forums');
    resource.routes[1].should.have.property('path', '/forums/:forum');
    done();
  });

  it('skips non-functions', function(done) {
    var app = koa();
    app.use(Router(app));
    var resource = app.resource('forums', {
      index: function *() {},
      show: function *() {},
      config: { port: 8080 }
    });
    resource.should.be.a('object');
    resource.should.have.property('name', 'forums');
    resource.should.have.property('id', 'forum');
    resource.should.have.property('routes');
    resource.routes.should.be.an.instanceOf(Array);
    resource.routes.should.have.property(0);
    resource.routes.should.have.property(1);
    resource.routes[0].should.have.property('path', '/forums');
    resource.routes[1].should.have.property('path', '/forums/:forum');
    done();
  });

  it('nests resources', function(done) {
    var app = koa();
    var router = new Router(app);
    app.use(router.middleware());
    var forums = app.resource('forums', { index: function *() {} });
    var threads = app.resource('threads', { index: function *() {} });
    forums.add(threads);
    threads.base.should.equal('/forums/:forum/threads');
    should.exist(router.routes.get[1]);
    router.routes.get[1].should.be.a('object');
    router.routes.get[1].should.have.property('path', '/forums/:forum/threads');
    done();
  });
});
