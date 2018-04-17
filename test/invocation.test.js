const test = require('ava');
const { create, request } = require('./_helper');

test('awaits async router handlers', async t => {
  const router = create();

  router.get('/', (ctx) => (
    new Promise((resolve) => (
      setTimeout(() => {
        t.pass();
        resolve();
      }, 10)
    ))
  ));

  await request(router.routes()).get('/');
});
