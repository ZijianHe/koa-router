const Router = require('./router');

const publicRouter = new Router({ prefix: '/:lang?', name: 'public' });

publicRouter.get('/one', () => {});

publicRouter.param('lang', (ctx, next) => {
  console.log('lang lookup');
  return next();
});

const adminRouter = new Router({ prefix: '/:lang/admin', name: 'admin' });

adminRouter.param('lang', (ctx, next) => {
  console.log('admin lang lookup');
  return next();
});

adminRouter.use(function middlewareA(ctx, next) {
  console.log(this.name);
  return next();
});
adminRouter.use(function middlewareB(ctx, next) {
  console.log(this.name);
  return next();
});
adminRouter.use(function middlewareC(ctx, next) {
  console.log(this.name);
  return next();
});

const userRouter = new Router({
  name: 'user',
  prefix: '/users'
});

userRouter.use(function middlewareG(ctx, next) {
  console.log(this.name);
  return next();
});

userRouter.use(function middlewareH(ctx, next) {
  console.log(this.name);
  return next();
});

userRouter.use(function middlewareI(ctx, next) {
  console.log(this.name);
  return next();
});

userRouter.param('id', (ctx, next) => {
  console.log('param id lookup');
  return next();
});

userRouter.get('/:id', (ctx) => {
  console.log('get id endpoint');
  console.log(ctx);
});

userRouter.post('/:id', () => {
  console.log('post id endpoint');
});

userRouter.get('', () => {
  console.log('get index endpoint');
});

publicRouter.nest(userRouter);
adminRouter.nest(userRouter);
// adminRouter.nest(userRouter);

const photosRouter = new Router({name: 'photo'});

photosRouter.get('/:id', function photoIndex(ctx, next) {
  console.log('got photos');
  return next();
});

userRouter.nest('/photos', photosRouter);
adminRouter.nest('/userphotos', photosRouter);

console.log(publicRouter.toString(true));
console.log();
console.log();
const adminRoutes = adminRouter.compile();
console.log(adminRouter.toString(true));
adminRoutes[0].call({matchedRoute: adminRoutes[0], path: '/en/admin/users/123'});

