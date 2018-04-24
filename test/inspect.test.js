const test = require('ava');
const inspect = require('../lib/inspect');
const { create, request } = require('./_helper');

test('inspect prints out the router details in a human-readable format', t => {
  const publicRouter = create({ prefix: '/:lang?' });

  publicRouter.get('/one', () => {});

  publicRouter.param('lang', (lang, ctx, next) => {
    return next();
  });

  const adminRouter = create({prefix: '/:lang/admin', name: 'admin'});

  adminRouter.param('lang', (lang, ctx, next) => {
    return next();
  });

  adminRouter.use(function middlewareA(ctx, next) {
    return next();
  });
  adminRouter.use(function middlewareB(ctx, next) {
    return next();
  });
  adminRouter.use(function middlewareC(ctx, next) {
    return next();
  });

  const userRouter = create({
    name: 'user',
    prefix: '/users'
  });

  userRouter.use(function middlewareG(ctx, next) {
    return next();
  });

  userRouter.use(function middlewareH(ctx, next) {
    return next();
  });

  userRouter.use(function middlewareI(ctx, next) {
    return next();
  });

  userRouter.param('id', (id, ctx, next) => {
    return next();
  });

  userRouter.get('user-path', '/:id', (ctx) => {});

  userRouter.post('create-user-path', '/:id', () => {});

  userRouter.get('', () => {});

  publicRouter.nest(userRouter);
  adminRouter.nest(userRouter);

  const photosRouter = create({name: 'photo'});

  photosRouter.get('photos-path', '/:id', function photoIndex(ctx, next) {
    return next();
  });

  userRouter.nest('/photos', photosRouter);
  adminRouter.nest('/userphotos', photosRouter);

  const router = create();

  router.nest('/public', publicRouter);
  router.nest('/private', adminRouter);

  const noRoutesRouter = create();

  noRoutesRouter.use(() => {});

  router.nest(noRoutesRouter);

  t.snapshot(inspect(router));
});
