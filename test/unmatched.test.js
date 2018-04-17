const test = require('ava');
const { create, request } = require('./_helper');

test('router always invokes middleware regardless of a route match', async t => { // #257
  const router = create();
  router.use((ctx, next) => {
    t.pass();
    return next();
  });

  await request(router.routes()).get('/');
});
