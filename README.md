# koa-router

[![NPM version](https://img.shields.io/npm/v/koa-router.svg?style=flat)](https://npmjs.org/package/koa-router)
[![NPM Downloads](https://img.shields.io/npm/dm/koa-router.svg?style=flat)](https://npmjs.org/package/koa-router)
[![Node.js Version](https://img.shields.io/node/v/koa-router.svg?style=flat)](http://nodejs.org/download/)
[![Build Status](https://img.shields.io/travis/alexmingoia/koa-router.svg?style=flat)](http://travis-ci.org/alexmingoia/koa-router)
[![Gitter Chat](https://img.shields.io/badge/gitter-join%20chat-1dce73.svg?style=flat)](https://gitter.im/alexmingoia/koa-router/)

Express-like HTTP routing for [koa](https://github.com/koajs/koa)

[API Documentation](docs/api.md)

[Examples and Other Documentation](docs/)

[Changelog](CHANGELOG.md)

[UPGRADING.md](UPGRADING.md)

## Installation

`koa-router` **requires node 8** or above.

```sh
npm install -S koa-router
```

## Hello World

```js
const app = new Koa();
const router = new Router();

router.get('/hello', async (ctx) => {
  ctx.body = 'world';
});

app.use(router.routes());
app.listen(3000);
```

## Features

* Express-style routing using `router.get`, `router.put`, `router.post`, etc

```js
const router = new Router();

router.patch('/users/:id', (ctx) => ...);
router.get('/users', (ctx) => ...);
```

* Named URL parameters (`/users/:id` -> `ctx.params.id`)

```js
const router = new Router();

router.get('/articles/:category', (ctx) => {
  // ctx.params.category available
});
```

* Named routes with URL/path generation

```js
const router = new Router();

router.get('article', '/article/:id', (ctx) => ...);
router.path('article', 3);
// => /articles/3
```

* Nest, prefix routers recursively

```js
const rootRouter = new Router();
const authorRouter = new Router();
const bookRouter = new Router();

bookRouter.get('/', (ctx) => ...);
authorRouter.get('/:id', (ctx) => ...);

authorRouter.nest('/:id/books', bookRouter);
rootRouter.nest('/books', bookRouter);
rootRouter.nest('/authors', authorRouter);

rootRouter.routes();
// =>
// /books
// /authors/:id
// /authors/:id/books

```

* async/await support

```js
const router = new Router();

router.get('/users/:id', async (ctx) => {
  ctx.state.user = await User.find(ctx.params.id);
});
```

* Responds to `OPTIONS` requests with allowed methods
* Support for `405 Method Not Allowed` and `501 Not Implemented` handlers
* Robust matching engine: [`path-to-regexp`](https://github.com/pillarjs/path-to-regexp)

_Koa Router version 7 and 8 are only compatible with koa 2 and do not work with koa 1 or any other koa 1 middlewares_

## Upgrading from 7.x to 8.x

See the [UPGRADING.md](./UPGRADING.md)

## Contributing

Please submit all issues and pull requests to the [alexmingoia/koa-router](http://github.com/alexmingoia/koa-router) repository!

Generate coverage reports with `npm run coverage`

Generate the docs with `npm run docs`

Run the linter with `npm lint`

## Tests

Run tests using `npm test`

## Support

If you identify an issue with this software or have a suggestion, please open an issue [here](https://github.com/alexmingoia/koa-router/issues).

## License

[MIT](LICENSE.md)
