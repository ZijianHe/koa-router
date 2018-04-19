const test = require('ava');
const Route = require('../lib/route');
const { create, request } = require('./_helper');

test('exposes at ctx.router', async t => {
  const router = create();
  const ctx = await request(router.routes()).get('/');

  t.is(ctx.router, router);
});

test('exposes the matched path to ctx._matchedRoute', async t => {
  const router = create();
  router.get('/some-path', () => {});
  const { _matchedRoute } = await request(router.routes()).get('/some-path');

  t.is(_matchedRoute, '/some-path');
});

test('exposes the matched route to ctx.matchedRoute', async t => {
  const router = create();
  router.get('/some-path', () => {});
  const { matchedRoute } = await request(router.routes()).get('/some-path');

  t.true(matchedRoute instanceof Route);
});

test('exposes the matched route name to ctx._matchedRouteName', async t => {
  const router = create();
  router.get('named', '/some-path', () => {});
  const { _matchedRouteName } = await request(router.routes()).get('/some-path');

  t.is(_matchedRouteName, 'named');
});
