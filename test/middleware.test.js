const test = require('ava');
const compose = require('koa-compose');
const { create, request } = require('./_helper');

test('yields to downstream middleware', async t => {
  t.plan(2);
  const router = create();
  router.use((ctx, next) => {
    t.is(1, 1);
    return next();
  });
  const downstream = (ctx, next) => {
    t.is(1, 1);
    return next();
  };
  const app = compose([router.routes(), downstream]);

  await request(app).get('/');
});

test('passes upstream context to middleware', async t => {
  const router = create();
  const context = { secret: 'value' };
  router.use((ctx) => ctx.body = ctx.secret);
  router.get('/', () => () => {});

  const { body } = await request(router.routes()).get('/', context);

  t.is(body, 'value');
});

// @TODO deprecation helper text output?
test('.use throws when given a prefix (*)', t => {
  const router = create();

  t.throws(() => {
    router.use('*', () => {});
  });
});

// @TODO deprecation helper text output?
test('.use throws when given a prefix', t => {
  const router = create();

  t.throws(() => {
    router.use('/some-prefix', () => {});
  });
});

test('invokes all middleware passed during route definition', async t => {
  const router = create();
  let order = '';
  router.get(
    '/',
    (ctx, next) => {
      order += 'A';
      return next();
    },
    (ctx, next) => {
      order += 'B';
      return next();
    },
    (ctx, next) => {
      order += 'C';
      return next();
    },
  );

  await request(router.routes()).get('/');

  t.is(order, 'ABC');
});
