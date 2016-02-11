# koa-router

[![NPM version](http://img.shields.io/npm/v/koa-router.svg?style=flat)](https://npmjs.org/package/koa-router) [![NPM Downloads](https://img.shields.io/npm/dm/koa-router.svg?style=flat)](https://npmjs.org/package/koa-router) [![Node.js Version](https://img.shields.io/node/v/koa-router.svg?style=flat)](http://nodejs.org/download/) [![Build Status](http://img.shields.io/travis/alexmingoia/koa-router.svg?style=flat)](http://travis-ci.org/alexmingoia/koa-router) [![Tips](https://img.shields.io/gratipay/alexmingoia.svg?style=flat)](https://www.gratipay.com/alexmingoia/) [![Gitter Chat](https://img.shields.io/badge/gitter-join%20chat-1dce73.svg?style=flat)](https://gitter.im/alexmingoia/koa-router/)

> Router middleware for [koa](https://github.com/koajs/koa)

* Express-style routing using `app.get`, `app.put`, `app.post`, etc.
* Named URL parameters.
* Named routes with URL generation.
* Responds to `OPTIONS` requests with allowed methods.
* Support for `405 Method Not Allowed` and `501 Not Implemented`.
* Multiple route middleware.
* Multiple routers.
* Nestable routers.
* ES7 async/await support (koa-router 7.x).

## koa 2.x

See [koa-router 7.x](https://github.com/alexmingoia/koa-router/tree/master/)
for koa 2.x and async/await support.

## Installation

Install using [npm](https://www.npmjs.org/):

```sh
npm install koa-router
```

## API Reference

* [koa-router](#module_koa-router)
  * [Router](#exp_module_koa-router--Router) ⏏
    * [new Router([opts])](#new_module_koa-router--Router_new)
    * _instance_
      * [.get|put|post|patch|delete](#module_koa-router--Router+get|put|post|patch|delete) ⇒ <code>Router</code>
      * [.param(param, middleware)](#module_koa-router--Router+param) ⇒ <code>Router</code>
      * [.use([path], middleware, [...])](#module_koa-router--Router+use) ⇒ <code>Router</code>
      * [.routes](#module_koa-router--Router+routes) ⇒ <code>function</code>
      * [.allowedMethods([options])](#module_koa-router--Router+allowedMethods) ⇒ <code>function</code>
      * [.redirect(source, destination, code)](#module_koa-router--Router+redirect) ⇒ <code>Router</code>
      * [.route(name)](#module_koa-router--Router+route) ⇒ <code>Layer</code> &#124; <code>false</code>
      * [.url(name, params)](#module_koa-router--Router+url) ⇒ <code>String</code> &#124; <code>Error</code>
    * _static_
      * [.url(path, params)](#module_koa-router--Router.url) ⇒ <code>String</code>

<a name="exp_module_koa-router--Router"></a>
### Router ⏏
**Kind**: Exported class
<a name="new_module_koa-router--Router_new"></a>
#### new Router([opts])
Create a new router.


| Param | Type | Description |
| --- | --- | --- |
| [opts] | <code>Object</code> |  |
| [opts.prefix] | <code>String</code> | prefix router paths |

**Example**
Basic usage:

```javascript
var app = require('koa')();
var router = require('koa-router')();

router.get('/', function *(next) {...});

app
  .use(router.routes())
  .use(router.allowedMethods());
```
<a name="module_koa-router--Router+get|put|post|patch|delete"></a>
#### router.get|put|post|patch|delete ⇒ <code>Router</code>
Create `router.verb()` methods, where *verb* is one of the HTTP verbes such
as `router.get()` or `router.post()`.

Match URL patterns to callback functions or controller actions using `router.verb()`,
where **verb** is one of the HTTP verbs such as `router.get()` or `router.post()`.

```javascript
router
  .get('/', function *(next) {
    this.body = 'Hello World!';
  })
  .post('/users', function *(next) {
    // ...
  })
  .put('/users/:id', function *(next) {
    // ...
  })
  .del('/users/:id', function *(next) {
    // ...
  });
```

Route paths will be translated to regular expressions using
[path-to-regexp](https://github.com/pillarjs/path-to-regexp).

Query strings will not be considered when matching requests.

#### Named routes

Routes can optionally have names. This allows generation of URLs and easy
renaming of URLs during development.

```javascript
router.get('user', '/users/:id', function *(next) {
 // ...
});

router.url('user', 3);
// => "/users/3"
```

#### Multiple middleware

Multiple middleware may be given:

```javascript
router.get(
  '/users/:id',
  function *(next) {
    this.user = yield User.findOne(this.params.id);
    yield next;
  },
  function *(next) {
    console.log(this.user);
    // => { id: 17, name: "Alex" }
  }
);
```

### Nested routers

Nesting routers is supported:

```javascript
var forums = new Router();
var posts = new Router();

posts.get('/', function *(next) {...});
posts.get('/:pid', function *(next) {...});
forums.use('/forums/:fid/posts', posts.routes(), posts.allowedMethods());

// responds to "/forums/123/posts" and "/forums/123/posts/123"
app.use(forums.routes());
```

#### Router prefixes

Route paths can be prefixed at the router level:

```javascript
var router = new Router({
  prefix: '/users'
});

router.get('/', ...); // responds to "/users"
router.get('/:id', ...); // responds to "/users/:id"
```

#### URL parameters

Named route parameters are captured and added to `ctx.params`.

```javascript
router.get('/:category/:title', function *(next) {
  console.log(this.params);
  // => { category: 'programming', title: 'how-to-node' }
});
```

**Kind**: instance property of <code>[Router](#exp_module_koa-router--Router)</code>

| Param | Type | Description |
| --- | --- | --- |
| path | <code>String</code> |  |
| [middleware] | <code>function</code> | route middleware(s) |
| callback | <code>function</code> | route callback |

<a name="module_koa-router--Router+routes"></a>
#### router.routes ⇒ <code>function</code>
Returns router middleware which dispatches a route matching the request.

**Kind**: instance property of <code>[Router](#exp_module_koa-router--Router)</code>
<a name="module_koa-router--Router+use"></a>
#### router.use([path], middleware, [...]) ⇒ <code>Router</code>
Use given middleware(s) before route callback.

Only runs if any route is matched. If a path is given, the middleware will
run for any routes that include that path.

**Kind**: instance method of <code>[Router](#exp_module_koa-router--Router)</code>

| Param | Type |
| --- | --- |
| [path] | <code>String</code> |
| middleware | <code>function</code> |
| [...] | <code>function</code> |

**Example**
```javascript
router.use(session(), authorize());

// use middleware only with given path
router.use('/users', userAuth());

app.use(router.routes());
```
<a name="module_koa-router--Router+prefix"></a>
#### router.prefix(prefix) ⇒ <code>Router</code>
Set the path prefix for a Router instance that was already initialized.

**Kind**: instance method of <code>[Router](#exp_module_koa-router--Router)</code>

| Param | Type |
| --- | --- |
| prefix | <code>String</code> |

**Example**
```javascript
router.prefix('/things/:thing_id')
```
<a name="module_koa-router--Router+allowedMethods"></a>
#### router.allowedMethods([options]) ⇒ <code>function</code>
Returns separate middleware for responding to `OPTIONS` requests with
an `Allow` header containing the allowed methods, as well as responding
with `405 Method Not Allowed` and `501 Not Implemented` as appropriate.

**Kind**: instance method of <code>[Router](#exp_module_koa-router--Router)</code>

| Param | Type | Description |
| --- | --- | --- |
| [options] | <code>Object</code> |  |
| [options.throw] | <code>Boolean</code> | throw error instead of setting status and header |
| [options.notImplemented] | <code>Function</code> | throw the returned value in place of the default NotImplemented error |
| [options.methodNotAllowed] | <code>Function</code> | throw the returned value in place of the default MethodNotAllowed error |

**Example**
```javascript
var app = koa();
var router = router();

app.use(router.routes());
app.use(router.allowedMethods());

```
**Example with [Boom](https://github.com/hapijs/boom)**
```javascript
var app = koa();
var router = router();
var Boom = require('boom');

app.use(router.routes());
app.use(router.allowedMethods({
  throw: true,
  notImplemented: () => new Boom.notImplemented(),
  methodNotAllowed: () => new Boom.methodNotAllowed()
}));
```
<a name="module_koa-router--Router+redirect"></a>
#### router.redirect(source, destination, code) ⇒ <code>Router</code>
Redirect `source` to `destination` URL with optional 30x status `code`.

Both `source` and `destination` can be route names.

```javascript
router.redirect('/login', 'sign-in');
```

This is equivalent to:

```javascript
router.all('/login', function *() {
  this.redirect('/sign-in');
  this.status = 301;
});
```

**Kind**: instance method of <code>[Router](#exp_module_koa-router--Router)</code>

| Param | Type | Description |
| --- | --- | --- |
| source | <code>String</code> | URL or route name. |
| destination | <code>String</code> | URL or route name. |
| code | <code>Number</code> | HTTP status code (default: 301). |

<a name="module_koa-router--Router+route"></a>
#### router.route(name) ⇒ <code>Layer</code> &#124; <code>false</code>
Lookup route with given `name`.

**Kind**: instance method of <code>[Router](#exp_module_koa-router--Router)</code>

| Param | Type |
| --- | --- |
| name | <code>String</code> |

<a name="module_koa-router--Router+url"></a>
#### router.url(name, params) ⇒ <code>String</code> &#124; <code>Error</code>
Generate URL for route. Takes the route name and a map of named `params`.

```javascript
router.get('user', '/users/:id', function *(next) {
 // ...
});

router.url('user', 3);
// => "/users/3"

router.url('user', { id: 3 });
// => "/users/3"
```

**Kind**: instance method of <code>[Router](#exp_module_koa-router--Router)</code>

| Param | Type | Description |
| --- | --- | --- |
| name | <code>String</code> | route name |
| params | <code>Object</code> | url parameters |

<a name="module_koa-router--Router+param"></a>
#### router.param(param, middleware) ⇒ <code>Router</code>
Run middleware for named route parameters. Useful for auto-loading or
validation.

**Kind**: instance method of <code>[Router](#exp_module_koa-router--Router)</code>

| Param | Type |
| --- | --- |
| param | <code>String</code> |
| middleware | <code>function</code> |

**Example**
```javascript
router
  .param('user', function *(id, next) {
    this.user = users[id];
    if (!this.user) return this.status = 404;
    yield next;
  })
  .get('/users/:user', function *(next) {
    this.body = this.user;
  })
  .get('/users/:user/friends', function *(next) {
    this.body = yield this.user.getFriends();
  })
  // /users/3 => {"id": 3, "name": "Alex"}
  // /users/3/friends => [{"id": 4, "name": "TJ"}]
```
<a name="module_koa-router--Router.url"></a>
#### Router.url(path, params) ⇒ <code>String</code>
Generate URL from url pattern and given `params`.

**Kind**: static method of <code>[Router](#exp_module_koa-router--Router)</code>

| Param | Type | Description |
| --- | --- | --- |
| path | <code>String</code> | url pattern |
| params | <code>Object</code> | url parameters |

**Example**
```javascript
var url = Router.url('/users/:id', {id: 1});
// => "/users/1"
```
## Contributing

Please submit all issues and pull requests to the [alexmingoia/koa-router](http://github.com/alexmingoia/koa-router) repository!

## Tests

Run tests using `npm test`.

## Support

If you have any problem or suggestion please open an issue [here](https://github.com/alexmingoia/koa-router/issues).
