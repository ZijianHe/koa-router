const test = require('ava');
const Router = require('./router');
const Route = require('./route');
const compose = require('koa-compose');
const methods = require('methods');

// base

test('the router responds to all http methods for declaring routes', t => {
  const router = create();

  t.truthy(methods.indexOf('get') > -1);
  methods.forEach((method) => {
    t.is(router[method]('/', () => {}), router);
  });
});

test('the router is exposed at ctx.router', async t => {
  const router = create();
  const ctx = await request(router.routes()).get('/');

  t.is(ctx.router, router);
});

test('the router builds urls from named routes (.url)', t => {
  const router = create();
  router.get('rr', '/a-route', (ctx) => ctx.body = 'hit me');

  t.is(router.url('rr'), '/a-route');
});

// unmatched routes

test('the router always invokes middleware regardless of a route match', async t => { // #257
  const router = create();
  router.use((ctx, next) => {
    ctx.body = 'hello';
    return next();
  });

  const ctx = await request(router.routes()).get('/');

  t.is(ctx.body, 'hello', 'middleware not invoked');
});

// matched routes

test('the router calls the provided handler when a route is matched', async t => {
  const router = create();
  router.get('/a-route', (ctx) => ctx.body = 'hit me');

  const ctx = await request(router.routes()).get('/a-route');

  t.is(ctx.body, 'hit me', 'matched route not invoked');
});


test('the router invokes an all route regardless of the req http method', async t => {
  const router = create();
  router.all('/match-me', (ctx, next) => {
    ctx.body = 'matched';
    return next();
  });
  const agent = request(router.routes());

  let ctx = await agent.patch('/match-me');
  t.is(ctx.body, 'matched');

  ctx = await agent.post('/match-me');
  t.is(ctx.body, 'matched');

  ctx = await agent.get('/match-me');
  t.is(ctx.body, 'matched');
});

test('the router allows naming routes', async t => {
  const router = create();
  router.get('login', '/users/login', (ctx) => ctx.body = 'hit me');

  const ctx = await request(router.routes()).get('/users/login');

  t.is(ctx.body, 'hit me', 'named, matched route not invoked');
});

test('the router fetches routes by name for access later', async t => {
  const router = create();
  router.get('login', '/users/login', (ctx) => ctx.body = 'hit me');

  const fetched = router.route('login');

  t.truthy(fetched instanceof Route);
});

test('the router allows chaining for route declaration', async t => {
  const router = create();
  router
    .get('/a-route', (ctx) => {
      ctx.body = 'got';
    })
    .post('/a-route', (ctx) => {
      ctx.body = 'posted';
    });
  const agent = request(router.routes());

  const getCtx = await agent.get('/a-route');
  const postCtx = await agent.post('/a-route');

  t.is(getCtx.body, 'got', 'first declared, matched route not invoked');
  t.is(postCtx.body, 'posted', 'chained, matched route not invoked');
});

test('the router invokes only the first route handler that matches (FIFO)', async t => {
  const router = create();
  router
    .use((ctx, next) => {
      ctx.body = '';
      return next();
    })
    .get('/a-route', (ctx) => ctx.body += 'first route')
    .get('/a-route', (ctx) => ctx.body += 'last route');

  const ctx = await request(router.routes()).get('/a-route');

  t.is(ctx.body, 'first route', 'incorrect or no handler ran');
});

test('the router yields to downstream middleware', async t => {
  const router = create();
  router.use((ctx, next) => {
    ctx.body = 'hello';
    return next();
  });
  const downstream = (ctx, next) => {
    ctx.body += ' downstream';
    return next();
  };

  const app = compose([
    router.routes(),
    downstream
  ]);

  const ctx = await request(app).get('/');

  t.is(ctx.body, 'hello downstream', 'downstream middleware not invoked');
});

test('the router passes the provided context to middleware', async t => {
  const router = create();
  const context = { secret: 'value' };

  router.use((ctx, next) => {
    ctx.body = ctx.secret;
  });

  router.get('/a-route', (ctx, next) => {
    return next();
  });

  const ctx = await request(router.routes()).get('/a-route', context);

  t.is(ctx.body, 'value');
});

test('the router passes the provided context to handlers', async t => {
  const router = create();
  const context = { secret: 'value' };

  router.get('/a-route', (ctx, next) => {
    ctx.body = ctx.secret;
  });

  const ctx = await request(router.routes()).get('/a-route', context);

  t.is(ctx.body, 'value');
});

// prefixes

test('the router allows setting the prefix after construction', async t => {
  const router = create();

  router.setPrefix('/a-prefix');

  t.is(router.prefix, '/a-prefix');
});

test('when the router has a prefix the router matches prefixed routes', async t => {
  const router = create({ prefix: '/prefix' });

  router.get('/a-route', (ctx, next) => {
    ctx.body = 'hit me';
  });

  const ctx = await request(router.routes()).get('/prefix/a-route');

  t.is(ctx.body, 'hit me', 'matched route not invoked');
});

// test('prefixed router invokes a matched route', async t => {
//   const router = create();

//   router.get('/a-route', (ctx, next) => {
//     ctx.body = 'hit me';
//   });

//   const ctx = await request(router.routes()).get('/a-route');

//   t.is(ctx.body, 'hit me', 'matched route not invoked');
// });

// nesting

test('the router invokes all nested middleware in order of nesting regardless of a route match', async t => {
  const parentRouter = create();
  const childRouter = create();
  const grandchildRouter = create();

  parentRouter.use(async (ctx, next) => {
    ctx.body = '';
    ctx.body += 'A';
    await next();
    ctx.body += 'G';
  });

  childRouter.use(async (ctx, next) => {
    ctx.body += 'B';
    await next();
    ctx.body += 'F';
  });

  grandchildRouter.use(async (ctx, next) => {
    ctx.body += 'C';
    await next();
    ctx.body += 'E';
  });

  childRouter.nest(grandchildRouter)
  parentRouter.nest(childRouter);

  const ctx = await request(parentRouter.routes()).get('/a-route');

  t.is(ctx.body, 'ABCEFG');
});

test('the router invokes all nested middleware in order of nesting when a route is matched', async t => {
  const parentRouter = create();
  const childRouter = create();
  const grandchildRouter = create();

  parentRouter.use(async (ctx, next) => {
    ctx.body = '';
    ctx.body += 'A';
    await next();
    ctx.body += 'G';
  });

  childRouter.use(async (ctx, next) => {
    ctx.body += 'B';
    await next();
    ctx.body += 'F';
  });

  grandchildRouter.use(async (ctx, next) => {
    ctx.body += 'C';
    await next();
    ctx.body += 'E';
  });

  grandchildRouter.get('/a-route', (ctx, next) => {
    ctx.body += 'D';
  });

  childRouter.nest(grandchildRouter)
  parentRouter.nest(childRouter);

  const ctx = await request(parentRouter.routes()).get('/a-route');

  t.is(ctx.body, 'ABCDEFG');
});

test('the router invokes a matched route handler when that route is from a nested router', async t => {
  const parentRouter = create();
  const childRouter = create();

  childRouter.get('/a-route', (ctx, next) => {
    ctx.body = 'hit me';
  });

  parentRouter.nest(childRouter);

  const ctx = await request(parentRouter.routes()).get('/a-route');

  t.is(ctx.body, 'hit me', 'matched route not invoked');
});

test('the router invokes a matched router handler when that route is from a nested, prefixed router', async t => {
  const parentRouter = create();
  const childRouter = create();

  childRouter.get('/a-route', (ctx, next) => {
    ctx.body = 'hit me';
  });

  parentRouter.nest('/a-prefix', childRouter);

  const ctx = await request(parentRouter.routes()).get('/a-prefix/a-route');

  t.is(ctx.body, 'hit me', 'matched route not invoked');
});

test('the router provides params in ctx.params', async t => {
  const router = create();
  router.get('/:someparam', (_, next) => next());

  const ctx = await request(router.routes()).get('/123');

  t.is(ctx.params.someparam, '123');
});

test('the router decodes url params', async t => {
  const router = create();
  router.get('/:brand', (_, next) => next());

  const ctx = await request(router.routes()).get("/ben%20%26%20jerry's");

  t.is(ctx.params.brand, "ben & jerry's");
});

test('the router invokes param handlers for route captures', async t => {
  const router = create();
  router.param('id', (ctx, next) => {
    ctx.body = 'param';
    return next();
  });
  router.get('/:id', (ctx, next) => {
    ctx.body += '-handled';
    return next();
  });

  const ctx = await request(router.routes()).get('/1');

  t.is(ctx.body, 'param-handled');
});

test('the router invokes param handlers for route captures in order of appearance', async t => {
  const router = create();
  router.param('slug', (ctx, next) => {
    ctx.body += '2';
    return next();
  });
  router.param('id', (ctx, next) => {
    ctx.body = '1';
    return next();
  });
  router.get('/:id/:slug', (ctx, next) => {
    ctx.body += '3';
    return next();
  });

  const ctx = await request(router.routes()).get('/1/hello-world');

  t.is(ctx.body, '123');
});

test('the router invokes param handlers from nested routers for route captures', async t => {
  const parentRouter = create();
  const childRouter = create();
  childRouter.param('id', (ctx, next) => {
    ctx.body = 'param';
    return next();
  });
  childRouter.get('/:id', (ctx, next) => {
    ctx.body += '-handled';
    return next();
  });
  parentRouter.nest('/a-prefix', childRouter);

  const ctx = await request(parentRouter.routes()).get('/a-prefix/1');

  t.is(ctx.body, 'param-handled');
});

// invocation

test('the router awaits async router handlers', async t => {
  const router = create();
  let called = false;

  router.get('/', (ctx) => (
    new Promise((resolve) => (
      setTimeout(() => {
        called = true;
        resolve();
      }, 10)
    ))
  ));

  await request(router.routes()).get('/');

  t.truthy(called);
});

function create(...args) {
  return new Router(...args);
}

function get(path, middleware) {
  return request('GET', path, middleware);
}

function request(middleware) {
  return {
    get: makeHandler('GET', middleware),
    post: makeHandler('POST', middleware),
    patch: makeHandler('PATCH', middleware),
  };
}

function makeHandler(method, middleware) {
  return async (path, upstreamContext = {}) => {
    const ctx = Object.assign({ method, path }, upstreamContext);
    await middleware(ctx);
    return ctx;
  };
}
