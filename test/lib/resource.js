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
    var forums = app.resource('forums', {
      index: function *() {}
    });
    var threads = app.resource('threads', {
      index: function *() {},
      show: function *() {
        should.exist(this.params);
        this.params.should.have.property('forum', '54');
        this.params.should.have.property('thread', '12');
        this.status = 200;
      }
    });
    forums.add(threads);
    threads.base.should.equal('/forums/:forum/threads');
    request(http.createServer(app.callback()))
      .get('/forums/54/threads/12')
      .expect(200)
      .end(function(err, res) {
        if (err) return done(err);
        done();
      });
  });

  it('routes top-level resource', function(done) {
    var app = koa();
    var router = new Router(app);
    app.use(router.middleware());
    app.resource({
      index: function *() {
        this.status = 200;
      }
    });
    request(http.createServer(app.callback()))
      .get('/')
      .expect(200)
      .end(function(err, res) {
        if (err) return done(err);
        done();
      });
  });

  it('doesn\'t call multiple controller actions', function(done) {
    var app = koa();
    var router = new Router(app);
    app.use(router.middleware());
    var counter = 0;
    function *increaseCounter() {
      counter++;
      this.status = 204;
    }
    app.resource('threads', {
      index: increaseCounter,
      new: increaseCounter,
      create: increaseCounter,
      show: increaseCounter,
      edit: increaseCounter,
      update: increaseCounter,
      destroy: increaseCounter,
    });
    var server = http.createServer(app.callback());
    request(server)
    .get('/threads')
    .expect(204)
    .end(function(err, res) {
      if (err) return done(err);
      request(server)
      .get('/threads/new')
      .expect(204)
      .end(function(err, res) {
        if (err) return done(err);
        request(server)
        .post('/threads')
        .expect(204)
        .end(function(err, res) {
          if (err) return done(err);
          request(server)
          .get('/threads/1234')
          .expect(204)
          .end(function(err, res) {
            if (err) return done(err);
            request(server)
            .get('/threads/1234/edit')
            .expect(204)
            .end(function(err, res) {
              if (err) return done(err);
              request(server)
              .put('/threads/1234')
              .expect(204)
              .end(function(err, res) {
                if (err) return done(err);
                request(server)
                .get('/threads/1234')
                .expect(204)
                .end(function(err, res) {
                  if (err) return done(err);
                  counter.should.equal(7);
                  done();
                });
              });
            });
          });
        });
      });
    });
  });
});
