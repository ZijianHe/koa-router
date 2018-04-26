const test = require('ava');
const Koa = require('koa');
const methods = require('methods');
const Router = require('../lib/router');
const { request } = require('./_helper');

test('router has a method for all http methods', t => {
  const router = new Router();

  t.truthy(methods.indexOf('get') > -1);
  methods.forEach((method) => {
    t.truthy(typeof router[method] === 'function');
  });
});

test('accepts an array of paths when declaring route', async t => {
  let collector = [];
  const app = new Koa();
  const router = new Router();
  router.get(['/one', '/two', '/three/four'], (ctx) => {
    collector.push(ctx.matchedRoute.path)
  });
  app.use(router.routes());
  const agent = request(app);

  await agent.get('/one');
  await agent.get('/two');
  await agent.get('/three/four');

  t.deepEqual(collector, ['/one', '/two', '/three/four']);
});

test('throws when an invalid signature is used', t => {
  const router = new Router();

  t.throws(() => {
    router.get('named', ['/one', '/two', '/three'], () => {});
  }, /arguments/);
});

test('generates a url with interpolated params', t => {
  const url = Router.url('/:lang/users/:id', { lang: 'en', id: 10 });

  t.is(url, '/en/users/10');
});

test('.routes() returns a _named function', t => {
  const router = new Router();
  const dispatch = router.routes();

  t.is(dispatch._name, 'koa-router');
});

test('registers array of paths', async t => { // #203
  t.plan(2);
  const app = new Koa();
  const router = new Router();
  router.get(['/one', '/two'], () => t.is(1, 1));
  app.use(router.routes());
  const agent = request(app);

  await agent.get('/one');
  await agent.get('/two');
});

test('runs the stack in order', async t => {
  const app = new Koa();
  const router = new Router();
  const nested1 = new Router();
  const nested2 = new Router();
  let collector = [];
  router.use((ctx, next) => {
    collector.push('root mw1');
    return next();
  });
  router.use((ctx, next) => {
    collector.push('root mw2');
    return next();
  });
  nested1.use((ctx, next) => {
    collector.push('nested1 mw1');
    return next();
  });
  nested1.use((ctx, next) => {
    collector.push('nested1 mw2');
    return next();
  });
  nested2.use((ctx, next) => {
    collector.push('nested2 mw1');
    return next();
  });
  nested2.use((ctx, next) => {
    collector.push('nested2 mw2');
    return next();
  });
  router.param('id', (id, ctx, next) => {
    collector.push(`root ${id}`);
    return next();
  });
  nested1.param('slug', (slug, ctx, next) => {
    collector.push(`nested1 ${slug}`);
    return next();
  });
  nested1.param('lang', (lang, ctx, next) => {
    collector.push(`nested1 ${lang}`);
    return next();
  });
  nested2.param('category', (category, ctx, next) => {
    collector.push(`nested2 ${category}`);
    return next();
  });
  nested2.get(
    '/:category',
    (ctx, next) => {
      collector.push('nested2 route mw1');
      return next();
    },
    (ctx, next) => {
      collector.push('nested2 route mw2');
      return next();
    },
    (ctx, next) => {
      collector.push('nested2 route');
      return next();
    }
  );
  nested1.nest('/:slug', nested2);
  router.nest('/:lang/:id', nested1);
  app.use(router.routes());

  await request(app).get('/lang/id/slug/category');

  t.deepEqual(collector, [
    'root mw1',
    'root mw2',
    'root id',
    'nested1 mw1',
    'nested1 mw2',
    'nested1 slug',
    'nested1 lang',
    'nested2 mw1',
    'nested2 mw2',
    'nested2 category',
    'nested2 route mw1',
    'nested2 route mw2',
    'nested2 route'
  ]);
});
