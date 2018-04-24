const test = require('ava');
const { create, request } = require('./_helper');
const {
  NotImplementedError,
  MethodNotAllowedError,
} = require('http-errors');

test('writes an Allow header for available methods', async t => {
  const router = create()
    .get('/users', () => {})
    .put('/users', () => {});
  const agent = request(router.routes({ allowedMethods: true }));

  const { headers } = await agent.options('/users');

  t.is(headers['Allow'], 'GET, PUT');
});

test('writes a content-length of 0 for OPTIONS requests', async t => {
  const router = create().get('/users', () => {});
  const agent = request(router.routes({ allowedMethods: true }));

  const { headers } = await agent.options('/users');

  t.is(headers['Content-Length'], '0');
});

test('unmapped route methods return 405 Method Not Allowed', async t => {
  const router = create()
    .get('/users', () => {})
    .put('/users', () => {})
    .post('/events', () => {});
  const agent = request(router.routes({ allowedMethods: true }));

  const { headers, status } = await agent.post('/users');

  t.is(status, 405);
  t.is(headers['Allow'], 'GET, PUT');
});

test('unimplemented HTTP methods return 501 Not Implemented', async t => {
  const router = create()
    .get('/users', () => {})
    .put('/users', () => {});
  const agent = request(router.routes({ allowedMethods: true }));

  const { status } = await agent.search('/users');

  t.is(status, 501);
});

test('implemented HTTP methods do not return 501', async t => {
  const router = create().search('/users', (ctx) => ctx.status = 200);
  const agent = request(router.routes({ allowedMethods: true }));

  const { status } = await agent.search('/users');

  t.is(status, 200);
});

test('throw - unmapped route methods throw MethodNotAllowedError', async t => {
  const router = create();
  router
    .get('/users', () => {})
    .put('/users', () => {})
    .post('/events', () => {});
  const agent = request(router.routes({ allowedMethods: 'throw' }));

  await t.throws(agent.post('/users'), MethodNotAllowedError);
});

test('throw - unimplemented route methods throw NotImplementedError', async t => {
  const router = create();
  router
    .get('/users', () => {})
    .put('/users', () => {})
    .post('/events', () => {});
  const agent = request(router.routes({ allowedMethods: 'throw' }));

  await t.throws(agent.search('/users'), NotImplementedError);
});

test('throw - unmapped route methods throw from user-defined method', async t => {
  const router = create();
  router
    .get('/users', () => {})
    .put('/users', () => {})
    .post('/events', () => {});
  const agent = request(router.routes({
    allowedMethods: 'throw',
    methodNotAllowed: () => {
      const error = new Error('Custom');
      error.statusCode = 405;
      return error;
    }
  }));

  const error = await t.throws(agent.post('/users'), Error);
  t.is(error.statusCode, 405);
  t.is(error.message, 'Custom');
});

test('throw - unimplemented route methods throw from user-defined method', async t => {
  const router = create();
  router
    .get('/users', () => {})
    .put('/users', () => {})
    .post('/events', () => {});
  const agent = request(router.routes({
    allowedMethods: 'throw',
    notImplemented: () => {
      const error = new Error('Custom');
      error.statusCode = 501;
      return error;
    }
  }));

  const error = await t.throws(agent.search('/users'), Error);
  t.is(error.statusCode, 501);
  t.is(error.message, 'Custom');
});

test('does not run if route is matched and sets 404 status', async t => {
  const router = create();
  router.get('/users', (ctx) => ctx.status = 404);
  const agent = request(router.routes({ allowedMethods: true }));

  const { status } = await agent.get('/users');

  t.is(status, 404);
});

test('a many-method route sends the correct Allow header', async t => {
  const router = create();
  router
    .get('/users', () => {})
    .get('/_health', () => {})
    .post('/_health', () => {})
    .patch('/_health', () => {});
  const agent = request(router.routes({ allowedMethods: true }));

  const { headers } = await agent.options('/_health');

  t.deepEqual(headers['Allow'], 'GET, POST, PATCH');
});

test('implemented and matched methods do not 501', async t => {
  const router = create()
    .search('/users', (ctx, next) => {
      ctx.status = 200;
      return next();
    });
  const agent = request(router.routes({ allowedMethods: true }));

  const { status } = await agent.search('/users');

  t.is(status, 200);
});

test('mapped and matched methods do not 405', async t => {
  const router = create()
    .get('/users', (ctx, next) => {
      ctx.status = 200;
      return next();
    });
  const agent = request(router.routes({ allowedMethods: true }));

  const { status } = await agent.get('/users');

  t.is(status, 200);
});
