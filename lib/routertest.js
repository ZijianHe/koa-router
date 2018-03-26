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

adminRouter.use(function someMiddleware1(ctx, next) {
  console.log('ensure admin mw 1');
  return next();
});
adminRouter.use(function someMiddleware2(ctx, next) {
  console.log('ensure admin mw 2');
  return next();
});
adminRouter.use(function someMiddleware3(ctx, next) {
  console.log('ensure admin mw 3');
  return next();
});

const userRouter = new Router({
  name: 'user',
  prefix: '/users'
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
adminRouter.nest(userRouter);

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
const adminRoutes = adminRouter.compileRoutes();
console.log(adminRouter.toString(true));
adminRoutes[0].call({matchedRoute: adminRoutes[0], path: '/en/admin/users/123'});
console.log();


// // parent's params
// // parent's middleware
// // child's params
// // child's middleware
// // grandchild's params
// // grandchild's middleware
// // route handler

