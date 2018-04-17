const test = require('ava');
const { create, request } = require('./_helper');

test('defaults to "" when called with undefined', async t => {
  const router = create();
  router.setPrefix();
  router.get('/', () => t.pass());

  await request(router.routes()).get('/');
});

test('allows setting the prefix after construction', async t => {
  const router = create();
  router.setPrefix('/a-prefix');

  t.is(router.prefix, '/a-prefix');
});

test('matches prefixed routes', async t => {
  const router = create({ prefix: '/a-prefix' });
  router.get('/a-route', () => t.pass());

  await request(router.routes()).get('/a-prefix/a-route');
});

test('prefixed router invokes a matched route', async t => {
  const router = create();
  router.get('/a-route', () => t.pass());

  await request(router.routes()).get('/a-route');
});

test('prefix + root wildcard does not greedily match', async t => {
  const publicRouter = create();
  const adminRouter = create();
  adminRouter.get('*', (ctx) => ctx.body = 'admin');
  publicRouter.nest('/admin', adminRouter);
  publicRouter.get('*', (ctx) => ctx.body = 'public');
  const agent = request(publicRouter.routes());
  let body;

  ({ body } = await agent.get('/'));
  t.is(body, 'public');
  ({ body } = await agent.get('/admin'));
  t.is(body, 'admin');
  ({ body } = await agent.get('/admin/'));
  t.is(body, 'admin');
  ({ body } = await agent.get('/admin/anything'));
  t.is(body, 'admin');
  ({ body } = await agent.get('/administration'));
  t.is(body, 'public', '/administration should not match /admin (prefix) + /* (root wildcard)');
});
