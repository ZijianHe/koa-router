const test = require('ava');
const { create, request } = require('./_helper');

test('redirects from path to path', async t => {
  const router = create();
  router.get('/newpage', () => {});
  router.redirect('/oldpage', '/newpage');

  const { headers } = await request(router.routes()).get('/oldpage');

  t.is(headers['Location'], '/newpage');
});

test('defaults to 301 status', async t => {
  const router = create();
  router.get('/newpage', () => {});
  router.redirect('/oldpage', '/newpage');

  const { status } = await request(router.routes()).get('/oldpage');

  t.is(status, 301);
});

test('redirects with provided status code', async t => {
  const router = create();
  router.get('/newpage', () => {});
  router.redirect('/oldpage', '/newpage', 302);

  const { headers, status } = await request(router.routes()).get('/oldpage');

  t.is(status, 302);
});

test('redirects to route by name', async t => {
  const router = create()
    .get('newpage', '/newpage', () => {})
    .redirect('/oldpage', 'newpage');

  const { headers } = await request(router.routes()).get('/oldpage');

  t.is(headers['Location'], '/newpage');
});
