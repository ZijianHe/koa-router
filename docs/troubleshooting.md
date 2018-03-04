# Troubleshooting

You can visually inspect a router's current state with `inspect`.

```js
const router = new Router();
const v1Router = new Router();
const v2Router = new Router();
const healthRouter = new Router();
healthRouter
  .use((ctx, next) => {
    // A
    return next();
  })
  .get('/_health', (ctx, next) => {
    // B
  });
router.get('/version', () => {
  // C
});
v1Router.post('/post', () => {
  // D
});
v2Router
  .use((ctx, next) => {
    // E
  })
  .post('/post', () => {
    // F
  });
router.nest(healthRouter);
router.nest('/v1', v1Router);
router.nest('/v2', v2Router);
```

After the setup above, we can use `inspect` to turn the router into a string showing its middleware, routes, nested routers, and route details.

```js
const { inspect } = require('koa-router/utils');

console.log(inspect(router));
// =>
// * Router
// ├── middleware
// │   ├── anonymous
// │   └── anonymous
// ├── routes
// │   ├──     GET  /version            /^\/version(?:\/(?=$))?$/i
// │   ├──     GET  /_health            /^\/_health(?:\/(?=$))?$/i
// │   ├──    POST  /v1/post            /^\/v1\/post(?:\/(?=$))?$/i
// │   └──    POST  /v2/post            /^\/v2\/post(?:\/(?=$))?$/i
// └── nested
//     * Router
//     ├── middleware
//     │   └── anonymous
//     ├── routes
//     │   └──     GET  /_health            /^\/_health(?:\/(?=$))?$/i
//     └── nested
//     * /v1 prefix
//     └── nested
//         * Router
//         ├── middleware
//         ├── routes
//         │   └──    POST  /post         /^\/post(?:\/(?=$))?$/i
//         └── nested
//     * /v2 prefix
//     └── nested
//         * Router
//         ├── middleware
//         │   └── anonymous
//         ├── routes
//         │   └──    POST  /post         /^\/post(?:\/(?=$))?$/i
//         └── nested
```
