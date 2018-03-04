const test = require('ava');
const Koa = require('koa');
const { request } = require('./_helper');
const Router = require('../lib/router');
const Route = require('../lib/route');

test('calls the provided handler when a route is matched', async t => {
  const app = new Koa();
  const router = new Router();
  router.get('/a-route', () => t.pass());
  app.use(router.routes());

  await request(app).get('/a-route');
});

test('invokes an all route regardless of the req http method', async t => {
  t.plan(3);
  const app = new Koa();
  const router = new Router();
  router.all('/match-me', (ctx, next) => {
    t.is(1, 1);
    return next();
  });
  app.use(router.routes());
  const agent = request(app);

  await agent.patch('/match-me');
  await agent.post('/match-me');
  await agent.get('/match-me');
});

test('allows naming routes', async t => {
  const app = new Koa();
  const router = new Router();
  router.get('login', '/users/login', () => t.pass());
  app.use(router.routes());

  await request(app).get('/users/login');
});

test('fetches a route by name', async t => {
  const router = new Router();
  router.get('login', '/users/login', () => {});

  const fetched = router.route('login');

  t.truthy(fetched instanceof Route);
});

test('allows chaining for route declaration', async t => {
  t.plan(2);
  const app = new Koa();
  const router = new Router();
  router
    .get('/a-route', () => t.is(1, 1))
    .post('/a-route', () => t.is(1, 1));
  app.use(router.routes());
  const agent = request(app);

  await agent.get('/a-route');
  await agent.post('/a-route');
});

test('invokes only the first route handler that matches (FIFO)', async t => {
  const app = new Koa();
  const router = new Router();
  router
    .get('/a-route', () => t.pass())
    .get('/a-route', () => t.fail());
  app.use(router.routes());

  await request(app).get('/a-route');
});

// #444
test('ctx._matchedRoute has the correct route when matched', async t => {
  const app = new Koa();
  const router = new Router();
  const subRouter = new Router();
  subRouter.get('/:id', () => {});
  subRouter.get('/', () => {});
  router.nest('/sub', subRouter);
  router.get('/', () => {});
  app.use(async (ctx, next) => {
    await next();
    ctx.body = ctx._matchedRoute;
  });
  app.use(router.routes());
  const agent = request(app);
  let res;

  res = await agent.get('/');
  t.is(res.text, '/');
  res = await agent.get('/sub');
  t.is(res.text, '/sub/');
  res = await agent.get('/sub/1');
  t.is(res.text, '/sub/:id');
});

// #292, #246
test('does not capture params for preempted routes', async t => {
  const app = new Koa();
  const router = new Router();
  let collector = '';
  router.get('/new', (ctx, next) => {
    collector += 'new';
    if (ctx.params.id) {
      t.fail();
    }
    return next();
  });
  router.get('/:id', () => collector += 'id');
  app.use(router.routes());
  await request(app).get('/new');

  t.is(collector, 'new');
});

test('trailing slash is optional by default', async t => {
  const app = new Koa();
  const router = new Router();
  router.get('/hello', () => t.pass());
  app.use(router.routes());

  await request(app).get('/hello/');
});
