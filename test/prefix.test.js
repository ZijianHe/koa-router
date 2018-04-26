const test = require('ava');
const Koa = require('koa');
const { request } = require('./_helper');
const Router = require('../lib/router');

test('defaults to "" when called with undefined', async t => {
  const app = new Koa();
  const router = new Router();
  router.prefix = '';
  router.get('/', () => t.pass());
  app.use(router.routes());

  await request(app).get('/');
});

test('allows setting the prefix after construction', async t => {
  const router = new Router();
  router.prefix = '/a-prefix';

  t.is(router.prefix, '/a-prefix');
});

test('matches prefixed routes', async t => {
  const app = new Koa();
  const router = new Router({ prefix: '/a-prefix' });
  router.get('/a-route', () => t.pass());
  app.use(router.routes());

  await request(app).get('/a-prefix/a-route');
});

test('prefixed router invokes a matched route', async t => {
  const app = new Koa();
  const router = new Router();
  router.get('/a-route', () => t.pass());
  app.use(router.routes());

  await request(app).get('/a-route');
});

test('prefix + root wildcard does not greedily match', async t => {
  const app = new Koa();
  const publicRouter = new Router();
  const adminRouter = new Router();
  adminRouter.get('*', (ctx) => ctx.body = 'admin');
  publicRouter.nest('/admin', adminRouter);
  publicRouter.get('*', (ctx) => ctx.body = 'public');
  app.use(publicRouter.routes());
  const agent = request(app);
  let text;

  ({ text } = await agent.get('/'));
  t.is(text, 'public');
  ({ text } = await agent.get('/admin'));
  t.is(text, 'admin');
  ({ text } = await agent.get('/admin/'));
  t.is(text, 'admin');
  ({ text } = await agent.get('/admin/anything'));
  t.is(text, 'admin');
  ({ text } = await agent.get('/administration'));
  t.is(text, 'public', '/administration should not match /admin (prefix) + /* (root wildcard)');
});

// #422
test('captures and handles params declared in prefix', async t => {
  const app = new Koa();
  const router = new Router({ prefix: '/users/:id' });
  router.param('id', (id) => t.is(id, '1'));
  router.get('/', () => {});
  app.use(router.routes());

  await request(app).get('/users/1');
});
