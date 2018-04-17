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

test.skip('router builds urls from named routes (.url)', t => {
  const router = create();
  router.get('rr', '/a-route', (ctx) => ctx.body = 'hit me');

  t.is(router.url('rr'), '/a-route');
});

test('generates a url with interpolated params', t => {
  const url = Router.url('/:lang/users/:id', { lang: 'en', id: 10 });

  t.is(url, '/en/users/10');
});
