# koa-router

[![NPM version](http://img.shields.io/npm/v/koa-router.svg?style=flat)](https://npmjs.org/package/koa-router) [![NPM Downloads](https://img.shields.io/npm/dm/koa-router.svg?style=flat)](https://npmjs.org/package/koa-router) [![Node.js Version](https://img.shields.io/node/v/koa-router.svg?style=flat)](http://nodejs.org/download/) [![Build Status](http://img.shields.io/travis/alexmingoia/koa-router.svg?style=flat)](http://travis-ci.org/alexmingoia/koa-router) [![Tips](https://img.shields.io/gratipay/alexmingoia.svg?style=flat)](https://www.gratipay.com/alexmingoia/)

> Router middleware for [koa](https://github.com/koajs/koa)

* Express-style routing using `app.get`, `app.put`, `app.post`, etc.
* Named URL parameters and regexp captures.
* String or regular expression route matching.
* Named routes with URL generation.
* Responds to `OPTIONS` requests with allowed methods.
* Support for `405 Method Not Allowed` and `501 Not Implemented`.
* Multiple route middleware.
* Multiple routers.

## Installation

Install using [npm](https://www.npmjs.org/):

```sh
npm install koa-router
```

## API Reference

* [koa-router](#module_koa-router)
  * [Router](#exp_module_koa-router--Router) ⏏
    * [new Router([app], [opts])](#new_module_koa-router--Router_new)
    * _instance_
      * [.get|put|post|patch|delete](#module_koa-router--Router#get|put|post|patch|delete) ⇒ <code>Router</code>
      * [.routes](#module_koa-router--Router#routes) ⇒ <code>function</code>
      * [.use(middleware, [...])](#module_koa-router--Router#use) ⇒ <code>Router</code>
      * [.prefix(prefix)](#module_koa-router--Router#prefix) ⇒ <code>Router</code>
      * [.allowedMethods([options])](#module_koa-router--Router#allowedMethods) ⇒ <code>function</code>
      * [.all(name, path, [middleware], callback)](#module_koa-router--Router#all) ⇒ <code>Router</code>
      * [.redirect(source, destination, code)](#module_koa-router--Router#redirect) ⇒ <code>Router</code>
      * [.register(name, path, methods, middleware)](#module_koa-router--Router#register) ⇒ <code>Route</code>
      * [.route(name)](#module_koa-router--Router#route) ⇒ <code>Route</code> \| <code>false</code>
      * [.url(name, params)](#module_koa-router--Router#url) ⇒ <code>String</code> \| <code>Error</code>
      * [.param(param, middleware)](#module_koa-router--Router#param) ⇒ <code>Router</code>
    * _static_
      * [.url(path, params)](#module_koa-router--Router.url) ⇒ <code>String</code>

<a name="exp_module_koa-router--Router"></a>
### Router ⏏
**Kind**: Exported class  
<a name="new_module_koa-router--Router_new"></a>
#### new Router([app], [opts])
Create a new router.


| Param | Type | Description |
| --- | --- | --- |
| [app] | <code>koa.Application</code> | extend koa app with router methods |
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

Or if you prefer to extend the app with router methods:

```javascript
var app = require('koa')();
var router = require('koa-router');

app
  .use(router(app))
  .get('/', function *(next) {...});
```
<a name="module_koa-router--Router#get|put|post|patch|delete"></a>
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

Route paths will be translated to regular expressions used to match requests.

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

Multiple middleware may be given and are composed using
[koa-compose](https://github.com/koajs/koa-compose):

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

##### Named parameters

```javascript
router.get('/:category/:title', function *(next) {
  console.log(this.params);
  // => [ category: 'programming', title: 'how-to-node' ]
});
```

##### Parameter middleware

Run middleware for named route parameters. Useful for auto-loading or
validation.

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
```

##### Regular expressions

Control route matching exactly by specifying a regular expression instead of
a path string when creating the route. For example, it might be useful to match
date formats for a blog, such as `/blog/2013-09-04`:

```javascript
router.get(/^\/blog\/\d{4}-\d{2}-\d{2}\/?$/i, function *(next) {
  // ...
});
```

Capture groups from regular expression routes are added to
`ctx.captures`, which is an array.

**Kind**: instance property of <code>[Router](#exp_module_koa-router--Router)</code>  

| Param | Type | Description |
| --- | --- | --- |
| path | <code>String</code> \| <code>RegExp</code> |  |
| [middleware] | <code>function</code> | route middleware(s) |
| callback | <code>function</code> | route callback |

<a name="module_koa-router--Router#routes"></a>
#### router.routes ⇒ <code>function</code>
Returns router middleware which dispatches a route matching the request.

**Kind**: instance property of <code>[Router](#exp_module_koa-router--Router)</code>  
<a name="module_koa-router--Router#use"></a>
#### router.use(middleware, [...]) ⇒ <code>Router</code>
Use given middleware(s) before route callback. Only runs if any route is
matched.

**Kind**: instance method of <code>[Router](#exp_module_koa-router--Router)</code>  

| Param | Type |
| --- | --- |
| middleware | <code>function</code> | 
| [...] | <code>function</code> | 

**Example**  
```javascript
router.use(session(), authorize());

// runs session and authorize middleware before routing
app.use(router.routes());
```
<a name="module_koa-router--Router#prefix"></a>
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
<a name="module_koa-router--Router#allowedMethods"></a>
#### router.allowedMethods([options]) ⇒ <code>function</code>
Returns separate middleware for responding to `OPTIONS` requests with
an `Allow` header containing the allowed methods, as well as responding
with `405 Method Not Allowed` and `501 Not Implemented` as appropriate.

`router.allowedMethods()` is automatically mounted if the router is created
with `app.use(router(app))`. Create the router separately if you do not want
to use `.allowedMethods()`, or if you are using multiple routers.

**Kind**: instance method of <code>[Router](#exp_module_koa-router--Router)</code>  

| Param | Type | Description |
| --- | --- | --- |
| [options] | <code>Object</code> |  |
| [options.throw] | <code>Boolean</code> | throw error instead of setting status and header |

**Example**  
```javascript
var app = koa();
var router = router();

app.use(router.routes());
app.use(router.allowedMethods());
```
<a name="module_koa-router--Router#all"></a>
#### router.all(name, path, [middleware], callback) ⇒ <code>Router</code>
Register route with all methods.

**Kind**: instance method of <code>[Router](#exp_module_koa-router--Router)</code>  

| Param | Type | Description |
| --- | --- | --- |
| name | <code>String</code> | Optional. |
| path | <code>String</code> \| <code>RegExp</code> |  |
| [middleware] | <code>function</code> | You may also pass multiple middleware. |
| callback | <code>function</code> |  |

<a name="module_koa-router--Router#redirect"></a>
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
| source | <code>String</code> | URL, RegExp, or route name. |
| destination | <code>String</code> | URL or route name. |
| code | <code>Number</code> | HTTP status code (default: 301). |

<a name="module_koa-router--Router#register"></a>
#### router.register(name, path, methods, middleware) ⇒ <code>Route</code>
Create and register a route.

**Kind**: instance method of <code>[Router](#exp_module_koa-router--Router)</code>  

| Param | Type | Description |
| --- | --- | --- |
| name | <code>String</code> | Optional. |
| path | <code>String</code> \| <code>RegExp</code> | Path string or regular expression. |
| methods | <code>Array.&lt;String&gt;</code> | Array of HTTP verbs. |
| middleware | <code>function</code> | Multiple middleware also accepted. |

<a name="module_koa-router--Router#route"></a>
#### router.route(name) ⇒ <code>Route</code> \| <code>false</code>
Lookup route with given `name`.

**Kind**: instance method of <code>[Router](#exp_module_koa-router--Router)</code>  

| Param | Type |
| --- | --- |
| name | <code>String</code> | 

<a name="module_koa-router--Router#url"></a>
#### router.url(name, params) ⇒ <code>String</code> \| <code>Error</code>
Generate URL for route. Takes either map of named `params` or series of
arguments (for regular expression routes).

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

<a name="module_koa-router--Router#param"></a>
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
