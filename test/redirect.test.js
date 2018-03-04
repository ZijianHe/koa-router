const test = require('ava');
const Koa = require('koa');
const Router = require('../lib/router');
const { request } = require('./_helper');

test('redirects from path to path', async t => {
  const app = new Koa();
  const router = new Router();
  router.get('/newpage', () => {});
  router.redirect('/oldpage', '/newpage');
  app.use(router.routes());

  const { headers } = await request(app).get('/oldpage');

  t.is(headers.location, '/newpage');
});

test('defaults to 301 status', async t => {
  const app = new Koa();
  const router = new Router();
  router.get('/newpage', () => {});
  router.redirect('/oldpage', '/newpage');
  app.use(router.routes());

  const { status } = await request(app).get('/oldpage');

  t.is(status, 301);
});

test('redirects with provided status code', async t => {
  const app = new Koa();
  const router = new Router();
  router.get('/newpage', () => {});
  router.redirect('/oldpage', '/newpage', 302);
  app.use(router.routes());

  const { status } = await request(app).get('/oldpage');

  t.is(status, 302);
});

test('redirects to route by name', async t => {
  const app = new Koa();
  const router = new Router()
    .get('newpage', '/newpage', () => {})
    .redirect('/oldpage', 'newpage');
  app.use(router.routes());

  const { headers } = await request(app).get('/oldpage');

  t.is(headers.location, '/newpage');
});
