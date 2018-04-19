const test = require('ava');
const { create, request } = require('./_helper');

test('invokes all nested middleware in order of nesting regardless of a route match', async t => {
  const parentRouter = create();
  const childRouter = create();
  const grandchildRouter = create();
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

  await request(parentRouter.routes()).get('/a-route');

  t.is(order, 'ABCEFG');
});

test('invokes all nested middleware in order of nesting when a route is matched', async t => {
  const parentRouter = create();
  const childRouter = create();
  const grandchildRouter = create();
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
  await request(parentRouter.routes()).get('/a-route');

  t.is(order, 'ABCDEFG');
});

test('invokes a matched route handler when that route is from a nested router', async t => {
  const parentRouter = create();
  const childRouter = create();
  childRouter.get('/a-route', () => t.pass());
  parentRouter.nest(childRouter);

  await request(parentRouter.routes()).get('/a-route');
});

test('invokes a matched router handler when that route is from a nested, prefixed router', async t => {
  const parentRouter = create();
  const childRouter = create();
  childRouter.get('/a-route', () => t.pass());
  parentRouter.nest('/a-prefix', childRouter);

  await request(parentRouter.routes()).get('/a-prefix/a-route');
});

test('invokes root path at prefixed, nested router', async t => {
  const parentRouter = create();
  const childRouter = create();
  childRouter.get('/', () => t.pass());
  parentRouter.nest('/a-prefix', childRouter);

  await request(parentRouter.routes()).get('/a-prefix');
});

test('invokes wildcard path at prefixed, nested router', async t => {
  const parentRouter = create();
  const childRouter = create();
  childRouter.get('*', () => t.pass());
  parentRouter.nest('/a-prefix', childRouter);

  await request(parentRouter.routes()).get('/a-prefix/test');
});

test('invokes path/* path at prefixed, nested router', async t => {
  const parentRouter = create();
  const childRouter = create();
  childRouter.get('/test*', () => t.pass());
  parentRouter.nest('/a-prefix', childRouter);

  await request(parentRouter.routes()).get('/a-prefix/test');
});

test('throws when the arg list contains multiple functions', t => {
  const router = create();

  t.throws(() => {
    router.nest('/a-prefix', () => {}, () => {});
  });
});

// #438
test('preserves specificity when the parnet has a wildcard', async t => {
  const router = create();
  const adminRouter = create();
  let collector = '';
  adminRouter.get('*', () => collector += 'A');
  router.nest('/admin', adminRouter);
  router.get('*', () => collector += 'B');
  const agent = request(router.routes());

  await agent.get('/');
  await agent.get('/admin');
  await agent.get('/adminsomething');

  t.is(collector, 'BAB');
});

// #415
test('prefix does not greedily match', async t => {
  const router = create({ prefix: '/countries' });
  const parentRouter = create();
  router.get('/', () => t.fail());
  parentRouter.nest(router);
  const agent = request(parentRouter.routes());

  await agent.get('/some_other/countries');
  await agent.get('/some_other/route/countries');
  await agent.get('/some_other/route/entirely/countries');

  t.pass();
});

// #244
test('nesting a router does not mutate it', async t => {
  const nested = create();
  const router = create();
  let collector = '';
  nested.get('/hello', () => collector += 'A');
  router.nest(nested);
  router.nest('/foo', nested);
  router.nest('/bar', nested);
  const agent = request(router.routes());

  await agent.get('/hello');
  await agent.get('/foo/hello');
  await agent.get('/bar/hello');

  t.is(collector, 'AAA');
});
