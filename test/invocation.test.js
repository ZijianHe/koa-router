const test = require('ava');
const Koa = require('koa');
const { request } = require('./_helper');
const Router = require('../lib/router');

test('awaits async router handlers', async t => {
  t.plan(2);
  const app = new Koa();
  const router = new Router();
  router.get('/', async (ctx, next) => {
    ctx.upstream = true;
    await next();
    t.truthy(ctx.downstream);
  });
  app.use(router.routes());
  app.use(ctx => {
    t.truthy(ctx.upstream);
    ctx.downstream = true;
  });

  await request(app).get('/');
});
