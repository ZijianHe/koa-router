const test = require('ava');
const { create, request } = require('./_helper');

test('provides params in ctx.params', async t => {
  const router = create();
  router.get('/:someparam', (_, next) => next());

  const { params } = await request(router.routes()).get('/123');

  t.is(params.someparam, '123');
});

test('decodes param uri components', async t => {
  const router = create();
  const param = '%40%23%24%25~%F0%9F%8D%95';

  router.get('/:encoded', () => {});

  const { params } = await request(router.routes()).get(`/${param}`);

  t.is(params.encoded, '@#$%~🍕');
});

test('silently passes through malformed param uri components', async t => {
  const router = create();
  const param = '%92%5e%1b%94%98yx%f3%97%ea%db%fa%10d%be%fe%0a5%8c%0a';

  router.get('/:encoded', () => {});

  const { params } = await request(router.routes()).get(`/${param}`);

  t.is(params.encoded, param);
});

test('invokes param handlers for route captures', async t => {
  const router = create();
  let order = '';
  router.param('id', (id, ctx, next) => {
    order += 'A';
    return next();
  });
  router.get('/:id', (ctx, next) => {
    order += 'B';
    return next();
  });

  await request(router.routes()).get('/1');

  t.is(order, 'AB');
});

test('invokes param handlers for route captures in order of definition', async t => {
  const router = create();
  let order = '';

  router.param('slug', (slug, ctx, next) => {
    order += 'A';
    return next();
  });
  router.param('id', (id, ctx, next) => {
    order += 'B';
    return next();
  });
  router.get('/:id/:slug', (ctx, next) => {
    order += 'C';
    return next();
  });

  await request(router.routes()).get('/1/hello-world');

  t.is(order, 'ABC');
});

test('invokes param handlers from nested routers for route captures', async t => {
  const parentRouter = create();
  const childRouter = create();
  let order = '';
  childRouter.param('id', (id, ctx, next) => {
    order += 'A';
    return next();
  });
  childRouter.get('/:id', (ctx, next) => {
    order += 'B';
    return next();
  });
  parentRouter.nest('/a-prefix', childRouter);

  await request(parentRouter.routes()).get('/a-prefix/1');

  t.is(order, 'AB');
});

test('does not invoke param handlers for missing params', async t => {
  const router = create();
  router.param('slug', (slug, ctx, next) => {
    t.pass();
    return next();
  });
  router.param('id', (id, ctx, next) => {
    t.fail();
    return next();
  });

  router.get('/:slug', (ctx, next) => {
    return next();
  });

  await request(router.routes()).get('/home');
});

test('parses and exposes params before invoking middleware', async t => {
  const router = create();
  router.get('/:name', () => {});
  router.use((ctx, next) => {
    t.is(ctx.params.name, 'oscar');
  });

  await request(router.routes()).get('/oscar');
});

test('captures params for prefixed route', async t => {
  const router = create({ prefix: '/api/v1' });
  router.get('company', '/companies/:id', ({ params }) => t.is(params.id, '1234abcd'));

  await request(router.routes()).get('/api/v1/companies/1234abcd');
});

// #413
test('param captures', t => {
  const router = create();
  router.get('company', '/companies/:id', () => {});
  const route = router.route('company').compile({ prefix: '/api/v1' });

  const matches = route.capture('/api/v1/companies/1234abcd');

  t.deepEqual(matches, [ '1234abcd' ]);
});
