const test = require('ava');
const { create, request } = require('./_helper');

test('exposes at ctx.router', async t => {
  const router = create();
  const ctx = await request(router.routes()).get('/');

  t.is(ctx.router, router);
});
