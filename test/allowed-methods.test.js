const test = require('ava');
const Koa = require('koa');
const supertest = require('supertest');
const { request } = require('./_helper');
const { NotImplemented, MethodNotAllowed } = require('http-errors');
const Router = require('../lib/router');

test('writes an Allow header for available methods', async t => {
  const app = new Koa();
  const router = new Router()
    .get('/users', () => {})
    .put('/users', () => {});
  app.use(router.routes());
  app.use(router.allowedMethods());

  const res = await request(app).options('/users');

  t.is(res.headers.allow, 'GET, PUT');
});

test('writes a content-length of 0 for OPTIONS requests', async t => {
  const app = new Koa();
  const router = new Router().get('/users', () => {});
  app.use(router.routes());
  app.use(router.allowedMethods());

  const res = await request(app).options('/users');

  t.is(res.headers['content-length'], '0');
});

test('unmapped route methods return 405 Method Not Allowed', async t => {
  const app = new Koa();
  const router = new Router()
    .get('/users', () => {})
    .put('/users', () => {})
    .post('/events', () => {});
  app.use(router.routes());
  app.use(router.allowedMethods());

  const res = await request(app).post('/users');

  t.is(res.status, 405);
  t.is(res.headers.allow, 'GET, PUT');
});

test('unimplemented HTTP methods return 501 Not Implemented', async t => {
  const app = new Koa();
  const router = new Router()
    .get('/users', () => {})
    .put('/users', () => {});
  app.use(router.routes());
  app.use(router.allowedMethods());

  const res = await request(app).search('/users');

  t.is(res.status, 501);
});

test('implemented HTTP methods do not return 501', async t => {
  const app = new Koa();
  const router = new Router().search('/users', (ctx) => ctx.status = 200);
  app.use(router.routes());
  app.use(router.allowedMethods());

  const res = await request(app).search('/users');

  t.is(res.status, 200);
});

test('throw - unmapped route methods throw MethodNotAllowed', async t => {
  const app = new Koa();
  const router = new Router();
  router
    .get('/users', () => {})
    .put('/users', () => {})
    .post('/events', () => {});
  app.use(router.routes());
  app.use(router.allowedMethods({ throw: true }));

  app.on('error', err => t.truthy(err instanceof MethodNotAllowed));

  await supertest(app.listen()).post('/users');
});

test('throw - unimplemented route methods throw NotImplemented', async t => {
  const app = new Koa();
  const router = new Router();
  router
    .get('/users', () => {})
    .put('/users', () => {})
    .post('/events', () => {});
  app.use(router.routes());
  app.use(router.allowedMethods({ throw: true }));

  app.on('error', err => t.truthy(err instanceof NotImplemented));

  await supertest(app.listen()).search('/users');
});

test('throw - unmapped route methods throw from user-defined method', async t => {
  const app = new Koa();
  const router = new Router();
  router
    .get('/users', () => {})
    .put('/users', () => {})
    .post('/events', () => {});
  app.use(router.routes());
  app.use(router.allowedMethods({
    throw: true,
    methodNotAllowed: () => {
      const error = new Error('Custom');
      error.status = 405;
      return error;
    }
  }));

  app.on('error', err => t.is(err.message, 'Custom'));

  await request(app).post('/users').expect(405);
});

test('throw - unimplemented route methods throw from user-defined method', async t => {
  const app = new Koa();
  const router = new Router();
  router
    .get('/users', () => {})
    .put('/users', () => {})
    .post('/events', () => {});
  app.use(router.routes());
  app.use(router.allowedMethods({
    throw: true,
    notImplemented: () => {
      const error = new Error('Custom');
      error.status = 501;
      return error;
    }
  }));

  app.on('error', err => t.is(err.message, 'Custom'));

  await request(app).search('/users').expect(501);
});

test('does not run if route is matched and sets 404 status', async t => {
  const app = new Koa();
  const router = new Router();
  router.get('/users', (ctx) => ctx.status = 404);
  app.use(router.routes());
  app.use(router.allowedMethods());

  const res = await request(app).get('/users');

  t.is(res.status, 404);
});

test('a many-method route sends the correct Allow header', async t => {
  const app = new Koa();
  const router = new Router();
  router
    .get('/users', () => {})
    .get('/_health', () => {})
    .post('/_health', () => {})
    .patch('/_health', () => {});
  app.use(router.routes());
  app.use(router.allowedMethods());

  const res = await request(app).options('/_health');

  t.deepEqual(res.headers.allow, 'GET, POST, PATCH');
});

test('implemented and matched methods do not 501', async t => {
  const app = new Koa();
  const router = new Router()
    .search('/users', (ctx, next) => {
      ctx.status = 200;
      return next();
    });
  app.use(router.routes());
  app.use(router.allowedMethods());

  const res = await request(app).search('/users');

  t.is(res.status, 200);
});

test('mapped and matched methods do not 405', async t => {
  const app = new Koa();
  const router = new Router()
    .get('/users', (ctx, next) => {
      ctx.status = 200;
      return next();
    });
  app.use(router.routes());
  app.use(router.allowedMethods());

  const res = await request(app).get('/users');

  t.is(res.status, 200);
});
