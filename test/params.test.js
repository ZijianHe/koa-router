const test = require('ava');
const Koa = require('koa');
const { request } = require('./_helper');
const Router = require('../lib/router');

test('provides params in ctx.params', async t => {
  const app = new Koa();
  const router = new Router();
  router.get('/:someparam', ctx => {
    t.is(ctx.params.someparam, '123');
  });
  app.use(router.routes());

  await request(app).get('/123');
});

test('decodes param uri components', async t => {
  const app = new Koa();
  const router = new Router();
  const param = '%40%23%24%25~%F0%9F%8D%95';
  router.get('/:encoded', ctx => {
    t.is(ctx.params.encoded, '@#$%~🍕');
  });
  app.use(router.routes());

  await request(app).get(`/${param}`);
});

test('silently passes through malformed param uri components', async t => {
  const app = new Koa();
  const router = new Router();
  const param = '%92%5e%1b%94%98yx%f3%97%ea%db%fa%10d%be%fe%0a5%8c%0a';
  router.get('/:encoded', ctx => {
    t.is(ctx.params.encoded, param);
  });
  app.use(router.routes());

  await request(app).get(`/${param}`);
});

test('invokes param handlers for route captures', async t => {
  const app = new Koa();
  const router = new Router();
  let order = '';
  router.param('id', (id, ctx, next) => {
    order += 'A';
    return next();
  });
  router.get('/:id', (ctx, next) => {
    order += 'B';
    return next();
  });
  app.use(router.routes());

  await request(app).get('/1');

  t.is(order, 'AB');
});

test('invokes param handlers for route captures in order of definition', async t => {
  const app = new Koa();
  const router = new Router();
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
  app.use(router.routes());

  await request(app).get('/1/hello-world');

  t.is(order, 'ABC');
});

test('invokes param handlers from nested routers for route captures', async t => {
  const app = new Koa();
  const parentRouter = new Router();
  const childRouter = new Router();
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
  app.use(parentRouter.routes());

  await request(app).get('/a-prefix/1');

  t.is(order, 'AB');
});

test('does not invoke param handlers for missing params', async t => {
  const app = new Koa();
  const router = new Router();
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
  app.use(router.routes());

  await request(app).get('/home');
});

test('parses and exposes params before invoking middleware', async t => {
  const app = new Koa();
  const router = new Router();
  router.get('/:name', () => {});
  router.use((ctx, next) => {
    t.is(ctx.params.name, 'oscar');
  });
  app.use(router.routes());

  await request(app).get('/oscar');
});

test('captures params for prefixed route', async t => {
  const app = new Koa();
  const router = new Router({ prefix: '/api/v1' });
  router.get('company', '/companies/:id', ({ params }) => {
    t.is(params.id, '1234abcd')
  });
  app.use(router.routes());

  await request(app).get('/api/v1/companies/1234abcd');
});

// #413
test('param captures', t => {
  const app = new Koa();
  const router = new Router();
  router.get('company', '/companies/:id', () => {});
  const route = router.route('company').compile({ prefix: '/api/v1' });

  const matches = route.capture('/api/v1/companies/1234abcd');

  t.deepEqual(matches, [ '1234abcd' ]);
});

test('captures params declared in prefix', async t => {
  const app = new Koa();
  const router = new Router();
  const tagsRouter = new Router();
  tagsRouter.get('/:name', ctx => {
    t.is(ctx.params.id, '123');
    t.is(ctx.params.name, 'me');
  });
  router.nest('/photos/:id/tags', tagsRouter);
  app.use(router.routes());

  await request(app).get('/photos/123/tags/me');
});
