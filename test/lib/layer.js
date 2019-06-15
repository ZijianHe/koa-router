/**
 * Route tests
 */

var Koa = require('koa')
var http = require('http')
var request = require('supertest')
var Router = require('../../lib/router')
var Layer = require('../../lib/layer')

describe('Layer', function () {
  it('composes multiple callbacks/middlware', function (done) {
    var app = new Koa()
    var router = new Router()
    app.use(router.routes())
    router.get(
      '/:category/:title',
      function (ctx, next) {
        ctx.status = 500
        return next()
      },
      function (ctx, next) {
        ctx.status = 204
        return next()
      }
    )
    request(http.createServer(app.callback()))
      .get('/programming/how-to-node')
      .expect(204)
      .end(function (err) {
        if (err) return done(err)
        done()
      })
  })

  describe('Layer#match()', function () {
    it('captures URL path parameters', function (done) {
      var app = new Koa()
      var router = new Router()
      app.use(router.routes())
      router.get('/:category/:title', function (ctx) {
        ctx.should.have.property('params')
        ctx.params.should.be.type('object')
        ctx.params.should.have.property('category', 'match')
        ctx.params.should.have.property('title', 'this')
        ctx.status = 204
      })
      request(http.createServer(app.callback()))
        .get('/match/this')
        .expect(204)
        .end(function (err, res) {
          if (err) return done(err)
          done()
        })
    })

    it('return orginal path parameters when decodeURIComponent throw error', function (done) {
      var app = new Koa()
      var router = new Router()
      app.use(router.routes())
      router.get('/:category/:title', function (ctx) {
        ctx.should.have.property('params')
        ctx.params.should.be.type('object')
        ctx.params.should.have.property('category', '100%')
        ctx.params.should.have.property('title', '101%')
        ctx.status = 204
      })
      request(http.createServer(app.callback()))
        .get('/100%/101%')
        .expect(204)
        .end(done)
    })

    it('should throw friendly error message when handle not exists', function () {
      var app = new Koa()
      var router = new Router()
      app.use(router.routes())
      var notexistHandle;
      (function () {
        router.get('/foo', notexistHandle)
      }).should.throw('get `/foo`: `middleware` must be a function, not `undefined`');

      (function () {
        router.get('foo router', '/foo', notexistHandle)
      }).should.throw('get `foo router`: `middleware` must be a function, not `undefined`');

      (function () {
        router.post('/foo', function () { }, notexistHandle)
      }).should.throw('post `/foo`: `middleware` must be a function, not `undefined`')
    })
  })

  describe('Layer#param()', function () {
    it('composes middleware for param fn', function (done) {
      var app = new Koa()
      var router = new Router()
      var route = new Layer('/users/:user', ['GET'], [function (ctx) {
        ctx.body = ctx.user
      }])
      route.param('user', function (id, ctx, next) {
        ctx.user = { name: 'alex' }
        if (!id) {
          ctx.status = 404
          return
        }
        return next()
      })
      router.stack.push(route)
      app.use(router.middleware())
      request(http.createServer(app.callback()))
        .get('/users/3')
        .expect(200)
        .end(function (err, res) {
          if (err) return done(err)
          res.should.have.property('body')
          res.body.should.have.property('name', 'alex')
          done()
        })
    })

    it('ignores params which are not matched', function (done) {
      var app = new Koa()
      var router = new Router()
      var route = new Layer('/users/:user', ['GET'], [function (ctx) {
        ctx.body = ctx.user
      }])
      route.param('user', function (id, ctx, next) {
        ctx.user = { name: 'alex' }
        if (!id) {
          ctx.status = 404
          return
        }
        return next()
      })
      route.param('title', function (id, ctx, next) {
        ctx.user = { name: 'mark' }
        if (!id) {
          ctx.status = 404
          return
        }
        return next()
      })
      router.stack.push(route)
      app.use(router.middleware())
      request(http.createServer(app.callback()))
        .get('/users/3')
        .expect(200)
        .end(function (err, res) {
          if (err) return done(err)
          res.should.have.property('body')
          res.body.should.have.property('name', 'alex')
          done()
        })
    })
  })

  describe('Layer#url()', function () {
    it('generates route URL', function () {
      var route = new Layer('/:category/:title', ['get'], [function () { }], 'books')
      var url = route.url({ category: 'programming', title: 'how-to-node' })
      url.should.equal('/programming/how-to-node')
      url = route.url('programming', 'how-to-node')
      url.should.equal('/programming/how-to-node')
    })

    it('escapes using encodeURIComponent()', function () {
      var route = new Layer('/:category/:title', ['get'], [function () { }], 'books')
      var url = route.url({ category: 'programming', title: 'how to node' })
      url.should.equal('/programming/how%20to%20node')
    })
  })
})
