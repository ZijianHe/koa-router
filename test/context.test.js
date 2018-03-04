const test = require('ava');
const Koa = require('koa');
const { request } = require('./_helper');
const Router = require('../lib/router');
const Route = require('../lib/route');

test('exposes at ctx.router', async t => {
  const app = new Koa();
  const router = new Router();
  router.get('/', ctx => t.is(ctx.router, router));
  app.use(router.routes());

  await request(app).get('/');
});

test('exposes the matched path to ctx._matchedRoute', async t => {
  const app = new Koa();
  const router = new Router();
  router.get('/some-path', ctx => t.is(ctx._matchedRoute, '/some-path'));
  app.use(router.routes());

  await request(app).get('/some-path');
});

test('exposes the matched route to ctx.matchedRoute', async t => {
  const app = new Koa();
  const router = new Router();
  router.get('/some-path', ctx => t.true(ctx.matchedRoute instanceof Route));
  app.use(router.routes());

  await request(app).get('/some-path');
});

test('exposes the matched route name to ctx._matchedRouteName', async t => {
  const app = new Koa();
  const router = new Router();
  router.get('named', '/some-path', ctx => t.is(ctx._matchedRouteName, 'named'));
  app.use(router.routes());

  await request(app).get('/some-path');
});
