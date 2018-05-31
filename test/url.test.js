const test = require('ava');
const Router = require('../lib/router');

test('builds a path from the named route', t => {
  const router = new Router().get('gen-path', '/generated', () => {});

  const path = router.path('gen-path');

  t.is(path, '/generated');
});

test('allows query params to be passed in', t => {
  const router = new Router().get('test-path', '/test', () => {});

  const path = router.path('test-path', { param: 1 });

  t.is(path, '/test?param=1');
});

test('path-encodes path parameters when necessary', t => {
  const router = new Router();
  router.get('users-category-path', '/users/:id/:category', () => {});

  const path = router.path('users-category-path', { id: 2, category: 'koa router' });

  t.is(path, '/users/2/koa%20router');
});

test('places unmatched captures as query params', t => {
  const router = new Router();
  router.get('users-path', '/users/:id', () => {});

  const path = router.path('users-path', { id: 1, page: 2, per_page: 100 });

  t.is(path, '/users/1?page=2&per_page=100');
});

test('places unmatched captures as path-encoded query params', t => {
  const router = new Router();
  router.get('users-path', '/users/:id', () => {});

  const path = router.path('users-path', { id: 1, letter: 'é' });

  t.is(path, '/users/1?letter=%C3%A9');
});

// @todo url tests w/ host

test('allows params passed as positional arguments', t => {
  const router = new Router();
  router.get('users-category-path', '/users/:id/:category', () => {});

  const path = router.path('users-category-path', 2, 'koa router');

  t.is(path, '/users/2/koa%20router');
});

test('throws when not enough arguments are passed', t => {
  const router = new Router();
  router.get('users-category-path', '/users/:id/:category', () => {});

  t.throws(() => router.path('users-category-path', 2), /wrong number.*1 for 2/i);
});

test('throws when params is missing required keys', t => {
  const router = new Router();
  router.get('users-category-path', '/users/:id/:category', () => {});

  t.throws(() => {
    router.path('users-category-path', { category: 'koa router' });
  }, /expected "id" to be defined/i);
});

test('throws when the named route cannot be found', t => {
  const router = new Router();

  t.throws(() => {
    router.path('doesntexist');
  }, /not found/i);
});

test('static - produces a path', t => {
  const path = Router.path('/users');

  t.is(path, '/users');
});

test('static - produces a path with query paramaters', t => {
  const path = Router.path('/users', { role: 'admin', limit: '10' });

  t.is(path, '/users?role=admin&limit=10');
});

test('static - produces a path with params', t => {
  const path = Router.path('/users/:id/photos/:tag', { id: 1, tag: 'me' });

  t.is(path, '/users/1/photos/me');
});

test('static - produces a path with positional params', t => {
  const path = Router.path('/users/:id/photos/:tag', 1, 'me');

  t.is(path, '/users/1/photos/me');
});

test('.url is an alias for .path', t => {
  const router = new Router();
  const args = [1, 2, 3];
  router.path = (...got) => t.deepEqual(args, got);

  router.url(...args);
});

test('produces a path for a nested route', t => {
  const router = new Router();
  const child = new Router();
  child.get('photos', '/photos', () => {});
  router.nest(child);

  const path = router.path('photos');

  t.is(path, '/photos');
});

test('produces a path for a nested nested route', t => {
  const router = new Router();
  const child = new Router();
  const grandchild = new Router();
  grandchild.get('photos', '/photos', () => {});
  child.nest(grandchild);
  router.nest(child);

  const path = router.path('photos');

  t.is(path, '/photos');
});
