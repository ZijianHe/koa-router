# `koa-router`: the familiar routing middleware for [`koa`](https://github.com/koajs/koa)

[![NPM version](https://img.shields.io/npm/v/koa-router.svg?style=flat)](https://npmjs.org/package/koa-router) [![NPM Downloads](https://img.shields.io/npm/dm/koa-router.svg?style=flat)](https://npmjs.org/package/koa-router) [![Node.js Version](https://img.shields.io/node/v/koa-router.svg?style=flat)](http://nodejs.org/download/) [![Build Status](https://img.shields.io/travis/alexmingoia/koa-router.svg?style=flat)](http://travis-ci.org/alexmingoia/koa-router) [![Tips](https://img.shields.io/gratipay/alexmingoia.svg?style=flat)](https://www.gratipay.com/alexmingoia/) [![Gitter Chat](https://img.shields.io/badge/gitter-join%20chat-1dce73.svg?style=flat)](https://gitter.im/alexmingoia/koa-router/)

## Highlights

* Express-style routing using `app.get`, `app.put`, `app.post`, etc
* Named URL parameters
* Named routes with URL generation
* Responds to `OPTIONS` requests with allowed methods.
* Support for `405 Method Not Allowed` and `501 Not Implemented`
* Multiple route middleware
* Multiple routers
* Nestable routers
* ES7 `async`/`await` support

### Migrating to 7.x / `koa` 2.x

- The API has changed to match `koa`'s new promise-based middleware signature. See the [`koa` 2.x readme](https://github.com/koajs/koa/tree/2.0.0-alpha.3) for more information.
- Middleware is now always run in the order declared by `.use()` (or `.get()`, etc.), which matches the [`express` 4.x API](https://expressjs.com/4x/api.html).

## Installation

Install using [`npm`](https://www.npmjs.org/):

```sh
npm install koa-router
```

## About this documentation

This readme has two main parts:
* __[API Reference](#api-reference)__ - list and explanation of available methods: names, purposes, signatures, returned value(s)
* __[Features](#features)__ - Specific info on some of the program's common features, such as:
  * [Named routes](#named-routes)
  * [Multiple middleware](#multiple-middleware)
  * [Nested routers](#nested-routers)
  * [Router prefixes](#router-prefixes)
  * [URL parameters](#url-parameters)

## API Reference

> The method signatures below follow JSDoc's [namepath rules](http://usejsdoc.org/about-namepaths.html) to differentiate between instance methods (using `#`) and static methods (using `.`)

* [Router](#router-) ⏏
* [new Router(\[opts\])](#new-routeropts)
* [#\[get|put|post|patch|delete|del\]](#getputpostpatchdeletedel--router) ⇒ <code>Router</code>
* [#routes](#routes--function) ⇒ <code>function</code>
* [#use(\[path\], middleware)](#usepath-middleware--router) ⇒ <code>Router</code>
* [#prefix(prefix)](#prefixprefix--router) ⇒ <code>Router</code>
* [#allowedMethods(\[options\])](#allowedmethodsoptions--function) ⇒ <code>function</code>
* [#redirect(source, destination, \[code\])](#redirectsource-destination-code--router) ⇒ <code>Router</code>
* [#route(name)](#routerroutename--layer--false) ⇒ <code>Layer</code> | <code>false</code>
* [#url(name, params, \[options\])](#routerurlname-params-options--string--error) ⇒ <code>String</code> | <code>Error</code>
* [#param(param, middleware)](#routerparamparam-middleware--router) ⇒ <code>Router</code>
* [Router.url(path, params)](#routerurlpath-params--string) ⇒ <code>String</code>

### Router ⏏

The exported class of the `koa-router` package.

#### Example
```javascript
var Router = require('koa-router');
```

### new Router([opts])

Create a new router.

| Param | Type | Description |
| --- | --- | --- |
| [opts] | `Object` |  |
| [opts.prefix] | `String` | prefix router paths |

#### Example
```javascript
var Koa = require('koa');
var Router = require('koa-router');

var app = new Koa();
var router = new Router();

router.get('/', (ctx, next) => {
  // ctx.router available
});

app
  .use(router.routes())
  .use(router.allowedMethods());
```

### #[get|put|post|patch|delete|del] ⇒ `Router`

Create `router.verb()` methods, where *verb* is one of the HTTP verbs such as `router.get()` or `router.post()`.

Match URL patterns to callback functions or controller actions using `router.verb()`, where **verb** is one of the HTTP verbs such as `router.get()` or `router.post()`.

When a route is matched, its path is available at `ctx._matchedRoute` and if named, the name is available at `ctx._matchedRouteName`

Route paths will be translated to regular expressions using [`path-to-regexp`](https://github.com/pillarjs/path-to-regexp).

Query strings will not be considered when matching requests.

#### Example
```javascript
router
  .get('/', (ctx, next) => {
    ctx.body = 'Hello World!';
  })
  .post('/users', (ctx, next) => {
    // ...
  })
  .put('/users/:id', (ctx, next) => {
    // ...
  })
  .del('/users/:id', (ctx, next) => {
    // ...
  });
```

### #all ⇒ `Router`

Can be used to match any HTTP request made using a [supported verb](#getputpostpatchdeletedel--router).

#### Example
```javascript
router
  [...]
  .all('/users/:id', (ctx, next) => {
    // ...
  });
```

### #routes ⇒ `function`

Returns router middleware which dispatches a route matching the request. 

### #use([path], middleware) ⇒ `Router`

Use given middleware.

Middleware run in the order they are defined by `.use()`. They are invoked sequentially, requests start at the first middleware and work their way "down" the middleware stack. 

| Param | Type |
| --- | --- |
| [path] | `String` | 
| middleware | `function` | 
| [...] | `function` | 

#### Example  
```javascript
// session middleware will run before authorize
router
  .use(session())
  .use(authorize());

// use middleware only with given path
router.use('/users', userAuth());

// or with an array of paths
router.use(['/users', '/admin'], userAuth());

app.use(router.routes());
```

### #prefix(prefix) ⇒ `Router`

Set the path prefix for a `Router` instance that was already initialized.

| Param | Type |
| --- | --- |
| prefix | `String` | 

#### Example
```javascript
router.prefix('/things/:thing_id')
```

### #allowedMethods([options]) ⇒ `function`

Returns separate middleware for responding to `OPTIONS` requests with an `Allow` header containing the allowed methods, as well as responding with `405 Method Not Allowed` and `501 Not Implemented` as appropriate.

| Param | Type | Description |
| --- | --- | --- |
| [options] | `Object` |  |
| [options.throw] | `Boolean` | throw error instead of setting status and header |
| [options.notImplemented] | `function` | throw the returned value in place of the default NotImplemented error |
| [options.methodNotAllowed] | `function` | throw the returned value in place of the default MethodNotAllowed error |

#### Example
```javascript
var Koa = require('koa');
var Router = require('koa-router');

var app = new Koa();
var router = new Router();

app.use(router.routes());
app.use(router.allowedMethods());
```

##### with [Boom](https://github.com/hapijs/boom)
```javascript
var Koa = require('koa');
var Router = require('koa-router');
var Boom = require('boom');

var app = new Koa();
var router = new Router();

app.use(router.routes());
app.use(router.allowedMethods({
  throw: true,
  notImplemented: () => new Boom.notImplemented(),
  methodNotAllowed: () => new Boom.methodNotAllowed()
}));
```

### #redirect(source, destination, [code]) ⇒ `Router`

Redirect `source` to `destination` URL with optional 30x status `code`.

| Param | Type | Description |
| --- | --- | --- |
| source | `String` | URL or route name. |
| destination | `String` | URL or route name. |
| [code] | `Number` | HTTP status code (default: 301). |

Both `source` and `destination` can be route names.

#### Example
```javascript
router.redirect('/login', 'sign-in');
```

This is equivalent to:

```javascript
router.all('/login', ctx => {
  ctx.redirect('/sign-in');
  ctx.status = 301;
});
```

### #route(name) ⇒ `Layer` | `false`

Lookup route with given `name`.

| Param | Type |
| --- | --- |
| name | `String` |

### #url(name, params, [options]) ⇒ `String` | `Error`

Generate URL for route. Takes a route name and map of named `params`.

| Param | Type | Description |
| --- | --- | --- |
| name | `String` | route name |
| params | `Object` | url parameters |
| [options] | `Object` | options parameter |
| [options.query] | `Object` \| `String` | query options |

#### Example 
```javascript
router.get('user', '/users/:id', (ctx, next) => {
  // ...
});

router.url('user', 3);
// => "/users/3"

router.url('user', { id: 3 });
// => "/users/3"

router.use((ctx, next) => {
  // redirect to named route
  ctx.redirect(ctx.router.url('sign-in'));
})

router.url('user', { id: 3 }, { query: { limit: 1 } });
// => "/users/3?limit=1"

router.url('user', { id: 3 }, { query: "limit=1" });
// => "/users/3?limit=1"
```

### #param(param, middleware) ⇒ `Router`

Run middleware for named route parameters. Useful for auto-loading or validation.

| Param | Type |
| --- | --- |
| param | `String` | 
| middleware | `function` | 

#### Example
```javascript
router
  .param('user', (id, ctx, next) => {
    ctx.user = users[id];
    if (!ctx.user) return ctx.status = 404;
    return next();
  })
  .get('/users/:user', ctx => {
    ctx.body = ctx.user;
  })
  .get('/users/:user/friends', ctx => {
    return ctx.user.getFriends().then(function(friends) {
      ctx.body = friends;
    });
  })
  // /users/3 => {"id": 3, "name": "Alex"}
  // /users/3/friends => [{"id": 4, "name": "TJ"}]
```

### Router.url(path, params) ⇒ `String`

Generate URL from url pattern and given `params`. 

| Param | Type | Description |
| --- | --- | --- |
| path | `String` | url pattern |
| params | `Object` | url parameters |

#### Example
```javascript
var url = Router.url('/users/:id', {id: 1});
// => "/users/1"
```

## Features

### Named routes

Routes can optionally have names. This allows generation of URLs and easy
renaming of URLs during development.

```javascript
router.get('user', '/users/:id', (ctx, next) => {
 // ...
});

router.url('user', 3);
// => "/users/3"
```

### Multiple middleware

Multiple middleware may be given:

```javascript
router.get(
  '/users/:id',
  (ctx, next) => {
    return User.findOne(ctx.params.id).then(function(user) {
      ctx.user = user;
      next();
    });
  },
  ctx => {
    console.log(ctx.user);
    // => { id: 17, name: "Alex" }
  }
);
```

### Nested routers

Nesting routers is supported:

```javascript
var forums = new Router();
var posts = new Router();

posts.get('/', (ctx, next) => {...});
posts.get('/:pid', (ctx, next) => {...});
forums.use('/forums/:fid/posts', posts.routes(), posts.allowedMethods());

// responds to "/forums/123/posts" and "/forums/123/posts/123"
app.use(forums.routes());
```

### Router prefixes

Route paths can be prefixed at the router level:

```javascript
var router = new Router({
  prefix: '/users'
});

router.get('/', ...); // responds to "/users"
router.get('/:id', ...); // responds to "/users/:id"
```

### URL parameters

Named route parameters are captured and added to `ctx.params`.

```javascript
router.get('/:category/:title', (ctx, next) => {
  console.log(ctx.params);
  // => { category: 'programming', title: 'how-to-node' }
});
```

The [`path-to-regexp`](https://github.com/pillarjs/path-to-regexp) module is
used to convert paths to regular expressions.

| Param | Type | Description |
| --- | --- | --- |
| path | `String` |  |
| [middleware] | `function` | route middleware(s) |
| callback | `function` | route callback |

## Contributing

Please submit all issues and pull requests to the [`alexmingoia/koa-router`](http://github.com/alexmingoia/koa-router) repository!

## Tests

Run tests using `npm test`.

## Support

If you have any problem or suggestion please open an issue [here](https://github.com/alexmingoia/koa-router/issues).
