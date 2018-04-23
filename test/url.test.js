const test = require('ava');
const { create, request } = require('./_helper');

test('allows query params to be passed in', t => {
  const router = create();
  router.get('test-path', '/test', () => {});

  const path = router.path('test-path', { param: 1 });

  t.is(path, '/test?param=1');
});

test('path-encodes path parameters when necessary', t => {
  const router = create();
  router.get('users-category-path', '/users/:id/:category', () => {});

  const path = router.path('users-category-path', { id: 2, category: 'koa router' });

  t.is(path, '/users/2/koa%20router');
});

test('places unmatched captures as query params', t => {
  const router = create();
  router.get('users-path', '/users/:id', () => {});

  const path = router.path('users-path', { id: 1, page: 2, per_page: 100 });

  t.is(path, '/users/1?page=2&per_page=100');
});

test('places unmatched captures as path-encoded query params', t => {
  const router = create();
  router.get('users-path', '/users/:id', () => {});

  const path = router.path('users-path', { id: 1, letter: 'é' });

  t.is(path, '/users/1?letter=%C3%A9');
});

// @todo url tests w/ host

test('allows params passed as positional arguments', t => {
  const router = create();
  router.get('users-category-path', '/users/:id/:category', () => {});

  const path = router.path('users-category-path', 2, 'koa router');

  t.is(path, '/users/2/koa%20router');
});

test('throws when not enough arguments are passed', t => {
  const router = create();
  router.get('users-category-path', '/users/:id/:category', () => {});

  t.throws(() => router.path('users-category-path', 2), /wrong number.*1 for 2/i);
});

test('throws when params is missing required keys', t => {
  const router = create();
  router.get('users-category-path', '/users/:id/:category', () => {});

  t.throws(() => {
    router.path('users-category-path', { category: 'koa router' });
  }, /expected "id" to be defined/i);
});
