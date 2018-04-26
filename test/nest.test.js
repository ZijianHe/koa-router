const test = require('ava');
const Koa = require('koa');
const { request } = require('./_helper');
const Router = require('../lib/router');

test('invokes all nested middleware in order of nesting regardless of a route match', async t => {
  const app = new Koa();
  const parentRouter = new Router();
  const childRouter = new Router();
  const grandchildRouter = new Router();
  let order = '';
  parentRouter.use(async (ctx, next) => {
    order += 'A';
    await next();
    order += 'G';
  });
  childRouter.use(async (ctx, next) => {
    order += 'B';
    await next();
    order += 'F';
  });
  grandchildRouter.use(async (ctx, next) => {
    order += 'C';
    await next();
    order += 'E';
  });
  childRouter.nest(grandchildRouter);
  parentRouter.nest(childRouter);
  app.use(parentRouter.routes());

  await request(app).get('/a-route');

  t.is(order, 'ABCEFG');
});

test('invokes all nested middleware in order of nesting when a route is matched', async t => {
  const app = new Koa();
  const parentRouter = new Router();
  const childRouter = new Router();
  const grandchildRouter = new Router();
  let order = '';
  parentRouter.use(async (ctx, next) => {
    order = '';
    order += 'A';
    await next();
    order += 'G';
  });
  childRouter.use(async (ctx, next) => {
    order += 'B';
    await next();
    order += 'F';
  });
  grandchildRouter.use(async (ctx, next) => {
    order += 'C';
    await next();
    order += 'E';
  });
  grandchildRouter.get('/a-route', (ctx, next) => {
    order += 'D';
  });
  childRouter.nest(grandchildRouter)
  parentRouter.nest(childRouter);
  app.use(parentRouter.routes());

  await request(app).get('/a-route');

  t.is(order, 'ABCDEFG');
});

test('invokes a matched route handler when that route is from a nested router', async t => {
  const app = new Koa();
  const parentRouter = new Router();
  const childRouter = new Router();
  childRouter.get('/a-route', () => t.pass());
  parentRouter.nest(childRouter);
  app.use(parentRouter.routes());

  await request(app).get('/a-route');
});

test('invokes a matched router handler when that route is from a nested, prefixed router', async t => {
  const app = new Koa();
  const parentRouter = new Router();
  const childRouter = new Router();
  childRouter.get('/a-route', () => t.pass());
  parentRouter.nest('/a-prefix', childRouter);
  app.use(parentRouter.routes());

  await request(app).get('/a-prefix/a-route');
});

test('invokes root path at prefixed, nested router', async t => {
  const app = new Koa();
  const parentRouter = new Router();
  const childRouter = new Router();
  childRouter.get('/', () => t.pass());
  parentRouter.nest('/a-prefix', childRouter);
  app.use(parentRouter.routes());

  await request(app).get('/a-prefix');
});

test('invokes wildcard path at prefixed, nested router', async t => {
  const app = new Koa();
  const parentRouter = new Router();
  const childRouter = new Router();
  childRouter.get('*', () => t.pass());
  parentRouter.nest('/a-prefix', childRouter);
  app.use(parentRouter.routes());

  await request(app).get('/a-prefix/test');
});

test('invokes path/* path at prefixed, nested router', async t => {
  const app = new Koa();
  const parentRouter = new Router();
  const childRouter = new Router();
  childRouter.get('/test*', () => t.pass());
  parentRouter.nest('/a-prefix', childRouter);
  app.use(parentRouter.routes());

  await request(app).get('/a-prefix/test');
});

test('throws when the arg list contains multiple functions', t => {
  const router = new Router();

  t.throws(() => {
    router.nest('/a-prefix', () => {}, () => {});
  });
});

// #438
test('preserves specificity when the parnet has a wildcard', async t => {
  const app = new Koa();
  const router = new Router();
  const adminRouter = new Router();
  let collector = '';
  adminRouter.get('*', () => collector += 'A');
  router.nest('/admin', adminRouter);
  router.get('*', () => collector += 'B');
  app.use(router.routes());

  const agent = request(app);

  await agent.get('/');
  await agent.get('/admin');
  await agent.get('/adminsomething');

  t.is(collector, 'BAB');
});

// #415
test('prefix does not greedily match', async t => {
  const app = new Koa();
  const router = new Router({ prefix: '/countries' });
  const parentRouter = new Router();
  router.get('/', () => t.fail());
  parentRouter.nest(router);
  app.use(parentRouter.routes());
  const agent = request(app);

  await agent.get('/some_other/countries');
  await agent.get('/some_other/route/countries');
  await agent.get('/some_other/route/entirely/countries');

  t.pass();
});

// #244
test('nesting a router does not mutate it', async t => {
  const app = new Koa();
  const nested = new Router();
  const router = new Router();
  let collector = '';
  nested.get('/hello', () => collector += 'A');
  router.nest(nested);
  router.nest('/foo', nested);
  router.nest('/bar', nested);
  app.use(router.routes());
  const agent = request(app);

  await agent.get('/hello');
  await agent.get('/foo/hello');
  await agent.get('/bar/hello');

  t.is(collector, 'AAA');
});
