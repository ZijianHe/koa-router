const test = require('ava');
const Route = require('../lib/route');
const { create, request } = require('./_helper');

test('calls the provided handler when a route is matched', async t => {
  const router = create();
  router.get('/a-route', () => t.pass());

  await request(router.routes()).get('/a-route');
});

test('invokes an all route regardless of the req http method', async t => {
  const router = create();
  t.plan(3);
  router.all('/match-me', (ctx, next) => {
    t.is(1, 1);
    return next();
  });
  const agent = request(router.routes());

  await agent.patch('/match-me');
  await agent.post('/match-me');
  await agent.get('/match-me');
});

test('allows naming routes', async t => {
  const router = create();
  router.get('login', '/users/login', () => t.pass());

  await request(router.routes()).get('/users/login');
});

test('fetches a route by name', async t => {
  const router = create();
  router.get('login', '/users/login', () => {});

  const fetched = router.route('login');

  t.truthy(fetched instanceof Route);
});

test('allows chaining for route declaration', async t => {
  t.plan(2);
  const router = create();
  router
    .get('/a-route', (ctx) => {
      t.is(1, 1);
    })
    .post('/a-route', (ctx) => {
      t.is(1, 1);
    });
  const agent = request(router.routes());

  await agent.get('/a-route');
  await agent.post('/a-route');
});

test('invokes only the first route handler that matches (FIFO)', async t => {
  const router = create();
  router
    .get('/a-route', () => t.pass())
    .get('/a-route', () => t.fail());

  await request(router.routes()).get('/a-route');
});

test('passes the provided context to handlers', async t => {
  const router = create();
  const context = { secret: 'value' };
  router.get('/', (ctx) => ctx.body = ctx.secret);

  const { body } = await request(router.routes()).get('/', context);

  t.is(body, 'value');
});

// #444
test('ctx._matchedRoute has the correct route when matched', async t => {
  const router = create();
  const subRouter = create();
  subRouter.get('/:id', () => {});
  subRouter.get('/', () => {});
  router.nest('/sub', subRouter);
  router.get('/', () => {});
  const agent = request(router.routes());
  let matched;

  ({ _matchedRoute: matched } = await agent.get('/'));
  t.is(matched, '/');
  ({ _matchedRoute: matched } = await agent.get('/sub'));
  t.is(matched, '/sub/');
  ({ _matchedRoute: matched } = await agent.get('/sub/1'));
  t.is(matched, '/sub/:id');
});

// #292, #246
test('does not capture params for preempted routes', async t => {
  const router = create();
  let collector = '';
  router.get('/new', (ctx, next) => {
    collector += 'new';
    if (ctx.params.id) {
      t.fail();
    }
    return next();
  });
  router.get('/:id', () => collector += 'id');

  await request(router.routes()).get('/new');

  t.is(collector, 'new');
});

test('trailing slash is optional', async t => {
  const router = create()
    .get('/hello', () => t.pass());

  await request(router.routes()).get('/hello/');
});
