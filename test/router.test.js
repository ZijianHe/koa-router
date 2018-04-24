const test = require('ava');
const methods = require('methods');
const Router = require('../lib/router');
const { create, request } = require('./_helper');

test('router has a method for all http methods', t => {
  const router = create();

  t.truthy(methods.indexOf('get') > -1);
  methods.forEach((method) => {
    t.truthy(typeof router[method] === 'function');
  });
});

test('generates a url with interpolated params', t => {
  const url = Router.url('/:lang/users/:id', { lang: 'en', id: 10 });

  t.is(url, '/en/users/10');
});

test('.routes() returns a _named function', t => {
  const router = create();
  const dispatch = router.routes();

  t.is(dispatch._name, 'koa-router');
});

test('registers array of paths', async t => { // #203
  t.plan(2);
  const router = create().get(['/one', '/two'], () => t.is(1, 1));

  await request(router.routes()).get('/one');
  await request(router.routes()).get('/two');
});

test('runs the stack in order', async t => {
  const router = create();
  const nested1 = create();
  const nested2 = create();
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

  await request(router.routes()).get('/lang/id/slug/category');

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
