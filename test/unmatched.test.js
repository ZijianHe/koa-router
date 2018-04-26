const test = require('ava');
const Koa = require('koa');
const Router = require('../lib/router');
const { request } = require('./_helper');

test('router always invokes middleware regardless of a route match', async t => { // #257
  const app = new Koa();
  const router = new Router();
  router.use((ctx, next) => {
    t.falsy(ctx.matchedRoute);
    return next();
  });
  app.use(router.routes());

  await request(app).get('/nomatch');
});

test('strict - does not match a trailing slash', async t => {
  const app = new Koa();
  const router = new Router({ strict: true });
  router.get('/hello', () => t.fail());

  await request(app).get('/hello/');
  t.pass();
});

test('sensitive - does not match wrong case paths', async t => {
  const app = new Koa();
  const router = new Router({ sensitive: true });
  router.get('/hello', () => t.fail());

  await request(app).get('/HELLO');
  t.pass();
});
