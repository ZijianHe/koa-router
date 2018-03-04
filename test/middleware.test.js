const test = require('ava');
const Koa = require('koa');
const compose = require('koa-compose');
const { request } = require('./_helper');
const Router = require('../lib/router');

test('yields to downstream middleware', async t => {
  t.plan(2);
  const app = new Koa();
  const router = new Router();
  router.use((ctx, next) => {
    t.is(1, 1);
    return next();
  });
  const downstream = (ctx, next) => {
    t.is(1, 1);
    return next();
  };
  app.use(router.routes());
  app.use(downstream);

  await request(app).get('/');
});

test('passes the upstream context to handlers', async t => {
  const app = new Koa();
  const router = new Router();
  const token = '12345';
  app.use((ctx, next) => {
    ctx.state.token = token;
    return next();
  });
  router.get('/', ctx => ctx.body = ctx.state.token);
  app.use(router.routes());

  const res = await request(app).get('/');

  t.is(res.text, token);
});

// @TODO deprecation helper text output?
test('.use throws when given a prefix (*)', t => {
  const router = new Router();

  t.throws(() => {
    router.use('*', () => {});
  });
});

// @TODO deprecation helper text output?
test('.use throws when given a prefix', t => {
  const router = new Router();

  t.throws(() => {
    router.use('/some-prefix', () => {});
  });
});

test('invokes all middleware passed during route definition', async t => {
  const app = new Koa();
  const router = new Router();
  let order = '';
  router.get(
    '/',
    (ctx, next) => {
      order += 'A';
      return next();
    },
    (ctx, next) => {
      order += 'B';
      return next();
    },
    (ctx, next) => {
      order += 'C';
      return next();
    },
  );
  app.use(router.routes());

  await request(app).get('/');

  t.is(order, 'ABC');
});
