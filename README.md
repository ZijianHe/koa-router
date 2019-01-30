# @eggjs/router

Router core component for [Egg.js](https://github.com/eggjs).

> **This repository is a fork of [koa-router](https://github.com/alexmingoia/koa-router).** with some additional features.

> And thanks for the greate work of @alexmingoia and the original team.

## API Reference

* [egg-router](#module_egg-router)
    * [Router](#exp_module_egg-router--Router) ⏏
        * [new Router([opts])](#new_module_egg-router--Router_new)
        * _instance_
            * [.get|put|post|patch|delete|del](#module_egg-router--Router+get|put|post|patch|delete|del) ⇒ <code>Router</code>
            * [.routes](#module_egg-router--Router+routes) ⇒ <code>function</code>
            * [.use([path], middleware)](#module_egg-router--Router+use) ⇒ <code>Router</code>
            * [.prefix(prefix)](#module_egg-router--Router+prefix) ⇒ <code>Router</code>
            * [.allowedMethods([options])](#module_egg-router--Router+allowedMethods) ⇒ <code>function</code>
            * [.redirect(source, destination, [code])](#module_egg-router--Router+redirect) ⇒ <code>Router</code>
            * [.route(name)](#module_egg-router--Router+route) ⇒ <code>Layer</code> &#124; <code>false</code>
            * [.url(name, params, [options])](#module_egg-router--Router+url) ⇒ <code>String</code> &#124; <code>Error</code>
            * [.param(param, middleware)](#module_egg-router--Router+param) ⇒ <code>Router</code>
        * _static_
            * [.url(path, params)](#module_egg-router--Router.url) ⇒ <code>String</code>

<a name="exp_module_egg-router--Router"></a>

### Router ⏏
**Kind**: Exported class
<a name="new_module_egg-router--Router_new"></a>

#### new Router([opts])
Create a new router.


| Param | Type | Description |
| --- | --- | --- |
| [opts] | <code>Object</code> |  |
| [opts.prefix] | <code>String</code> | prefix router paths |

**Example**
Basic usage:

```javascript
var Koa = require('koa');
var Router = require('@eggjs/router');

var app = new Koa();
var router = new Router();

router.get('/', (ctx, next) => {
  // ctx.router available
});

app
  .use(router.routes())
  .use(router.allowedMethods());
```
<a name="module_egg-router--Router+get|put|post|patch|delete|del"></a>

#### router.get|put|post|patch|delete|del ⇒ <code>Router</code>
Create `router.verb()` methods, where *verb* is one of the HTTP verbs such
as `router.get()` or `router.post()`.

Match URL patterns to callback functions or controller actions using `router.verb()`,
where **verb** is one of the HTTP verbs such as `router.get()` or `router.post()`.

Additionaly, `router.all()` can be used to match against all methods.

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
  })
  .all('/users/:id', (ctx, next) => {
    // ...
  });
```

When a route is matched, its path is available at `ctx._matchedRoute` and if named,
the name is available at `ctx._matchedRouteName`

Route paths will be translated to regular expressions using
[path-to-regexp](https://github.com/pillarjs/path-to-regexp).

Query strings will not be considered when matching requests.

#### Named routes

Routes can optionally have names. This allows generation of URLs and easy
renaming of URLs during development.

```javascript
router.get('user', '/users/:id', (ctx, next) => {
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
router.get('/:category/:title', (ctx, next) => {
  console.log(ctx.params);
  // => { category: 'programming', title: 'how-to-node' }
});
```

The [path-to-regexp](https://github.com/pillarjs/path-to-regexp) module is
used to convert paths to regular expressions.

**Kind**: instance property of <code>[Router](#exp_module_egg-router--Router)</code>

| Param | Type | Description |
| --- | --- | --- |
| path | <code>String</code> |  |
| [middleware] | <code>function</code> | route middleware(s) |
| callback | <code>function</code> | route callback |

<a name="module_egg-router--Router+routes"></a>

#### router.routes ⇒ <code>function</code>
Returns router middleware which dispatches a route matching the request.

**Kind**: instance property of <code>[Router](#exp_module_egg-router--Router)</code>
<a name="module_egg-router--Router+use"></a>

#### router.use([path], middleware) ⇒ <code>Router</code>
Use given middleware.

Middleware run in the order they are defined by `.use()`. They are invoked
sequentially, requests start at the first middleware and work their way
"down" the middleware stack.

**Kind**: instance method of <code>[Router](#exp_module_egg-router--Router)</code>

| Param | Type |
| --- | --- |
| [path] | <code>String</code> |
| middleware | <code>function</code> |
| [...] | <code>function</code> |

**Example**
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
<a name="module_egg-router--Router+prefix"></a>

#### router.prefix(prefix) ⇒ <code>Router</code>
Set the path prefix for a Router instance that was already initialized.

**Kind**: instance method of <code>[Router](#exp_module_egg-router--Router)</code>

| Param | Type |
| --- | --- |
| prefix | <code>String</code> |

**Example**
```javascript
router.prefix('/things/:thing_id')
```
<a name="module_egg-router--Router+allowedMethods"></a>

#### router.allowedMethods([options]) ⇒ <code>function</code>
Returns separate middleware for responding to `OPTIONS` requests with
an `Allow` header containing the allowed methods, as well as responding
with `405 Method Not Allowed` and `501 Not Implemented` as appropriate.

**Kind**: instance method of <code>[Router](#exp_module_egg-router--Router)</code>

| Param | Type | Description |
| --- | --- | --- |
| [options] | <code>Object</code> |  |
| [options.throw] | <code>Boolean</code> | throw error instead of setting status and header |
| [options.notImplemented] | <code>function</code> | throw the returned value in place of the default NotImplemented error |
| [options.methodNotAllowed] | <code>function</code> | throw the returned value in place of the default MethodNotAllowed error |

**Example**
```javascript
var Koa = require('koa');
var Router = require('egg-router');

var app = new Koa();
var router = new Router();

app.use(router.routes());
app.use(router.allowedMethods());
```

**Example with [Boom](https://github.com/hapijs/boom)**

```javascript
var Koa = require('koa');
var Router = require('egg-router');
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
<a name="module_egg-router--Router+redirect"></a>

#### router.redirect(source, destination, [code]) ⇒ <code>Router</code>
Redirect `source` to `destination` URL with optional 30x status `code`.

Both `source` and `destination` can be route names.

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

**Kind**: instance method of <code>[Router](#exp_module_egg-router--Router)</code>

| Param | Type | Description |
| --- | --- | --- |
| source | <code>String</code> | URL or route name. |
| destination | <code>String</code> | URL or route name. |
| [code] | <code>Number</code> | HTTP status code (default: 301). |

<a name="module_egg-router--Router+route"></a>

#### router.route(name) ⇒ <code>Layer</code> &#124; <code>false</code>
Lookup route with given `name`.

**Kind**: instance method of <code>[Router](#exp_module_egg-router--Router)</code>

| Param | Type |
| --- | --- |
| name | <code>String</code> |

<a name="module_egg-router--Router+url"></a>

#### router.url(name, params, [options]) ⇒ <code>String</code> &#124; <code>Error</code>
Generate URL for route. Takes a route name and map of named `params`.

**Kind**: instance method of <code>[Router](#exp_module_egg-router--Router)</code>

| Param | Type | Description |
| --- | --- | --- |
| name | <code>String</code> | route name |
| params | <code>Object</code> | url parameters |
| [options] | <code>Object</code> | options parameter |
| [options.query] | <code>Object</code> &#124; <code>String</code> | query options |

**Example**
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
<a name="module_egg-router--Router+param"></a>

#### router.param(param, middleware) ⇒ <code>Router</code>
Run middleware for named route parameters. Useful for auto-loading or
validation.

**Kind**: instance method of <code>[Router](#exp_module_egg-router--Router)</code>

| Param | Type |
| --- | --- |
| param | <code>String</code> |
| middleware | <code>function</code> |

**Example**
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
<a name="module_egg-router--Router.url"></a>

#### Router.url(path, params [, options]) ⇒ <code>String</code>
Generate URL from url pattern and given `params`.

**Kind**: static method of <code>[Router](#exp_module_egg-router--Router)</code>

| Param | Type | Description |
| --- | --- | --- |
| path | <code>String</code> | url pattern |
| params | <code>Object</code> | url parameters |
| [options] | <code>Object</code> | options parameter |
| [options.query] | <code>Object</code> &#124; <code>String</code> | query options |

**Example**
```javascript
var url = Router.url('/users/:id', {id: 1});
// => "/users/1"

const url = Router.url('/users/:id', {id: 1}, {query: { active: true }});
// => "/users/1?active=true"
```

## Tests

Run tests using `npm test`.
