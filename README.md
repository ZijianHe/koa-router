# Router middleware for [koa](https://github.com/koajs/koa)

[![Build Status](https://secure.travis-ci.org/alexmingoia/koa-router.png)](http://travis-ci.org/alexmingoia/koa-router)
[![Dependency Status](https://david-dm.org/alexmingoia/koa-router.png)](http://david-dm.org/alexmingoia/koa-router)
[![NPM version](https://badge.fury.io/js/koa-router.png)](http://badge.fury.io/js/koa-router)

* Express-style routing using `app.get`, `app.put`, `app.post`, etc.
* Named URL parameters and regexp captures.
* String or regular expression route matching.
* Named routes with URL generation.
* Responds to `OPTIONS` requests with allowed methods.
* Support for `405 Method Not Allowed` and `501 Not Implemented`.
* Multiple route middleware.
* Multiple routers.

## Install

koa-router is available using [npm](https://npmjs.org):

```
npm install koa-router
```

## Usage

Require the router and mount the middleware:

```javascript
var koa = require('koa')
  , router = require('koa-router')
  , app = koa();

app.use(router(app));
```

After the router has been initialized you can register routes:

```javascript
app.get('/users/:id', function *(next) {
  var user = yield User.findOne(this.params.id);
  this.body = user;
});
```

### Multiple routers

You can use multiple routers and sets of routes by omitting the `app`
argument. For example, separate routers for two versions of an API:

```javascript
var koa = require('koa');
  , mount = require('koa-mount')
  , Router = require('koa-router');

var app = koa();

var APIv1 = new Router();
var APIv2 = new Router();

APIv1.get('/sign-in', function *() {
  // ...
});

APIv2.get('/sign-in', function *() {
  // ...
});

app
  .use(mount('/v1', APIv1.middleware()))
  .use(mount('/v2', APIv2.middleware()));
```

### Chaining

The http methods (get, post, etc) return their `Router` instance,
so routes can be chained as you're used to with express:

```javascript
var api = new Router();

api
  .get('/foo', showFoo)
  .get('/bar', showBar)
  .post('/foo', createFoo);
```

## API

### Migrating from 2.x to 3.x

Resource routing was separated into the
[koa-resource-router](https://github.com/alexmingoia/koa-resource-router)
module.

### Router#verb([name, ]path, middleware[, middleware...])

Match URL patterns to callback functions or controller actions using `router.verb()`,
where **verb** is one of the HTTP verbs such as `router.get()` or `router.post()`.

```javascript
app
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
app.get('user', '/users/:id', function *(next) {
 // ...
});

app.url('user', 3);
// => "/users/3"
```

#### Multiple middleware

Multiple middleware may be given and are composed using
[koa-compose](https://github.com/koajs/koa-compose):

```javascript
app.get(
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

#### URL parameters

Named route parameters are captured and added to `ctx.params`.

Capture groups from regular expression routes are also added to
`ctx.params`, which is an array.

##### Named parameters

```javascript
app.get('/:category/:title', function *(next) {
  console.log(this.params);
  // => [ category: 'programming', title: 'how-to-node' ]
});
```

##### Parameter middleware

Run middleware for named route parameters. Useful for auto-loading or
validation.

```javascript
app
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
app.get(/^\/blog\/\d{4}-\d{2}-\d{2}\/?$/i, function *(next) {
  // ...
});
```

#### Multiple methods

Create routes with multiple HTTP methods using `router.register()`:

```javascript
app.register('/', ['get', 'post'], function *(next) {
  // ...
});
```

Create route for all methods using `router.all()`:

```javascript
app.all('/', function *(next) {
  // ...
});
```

### Router#redirect(source, destination, [code])

Redirect `source` to `destination` URL with optional 30x status `code`.

Both `source` and `destination` can be route names.

```javascript
app.redirect('/login', 'sign-in');
```

This is equivalent to:

```javascript
app.all('/login', function *() {
  this.redirect('/sign-in');
  this.status = 301;
});
```

### Router#route(name)

Lookup route with given `name`. Returns the route or `false`.

### Router#url(name, params)

Generate URL for route. Takes either map of named `params` or series of
arguments (for regular expression routes).

Returns `Error` if no route is found with given `name`.

```javascript
app.get('user', '/users/:id', function *(next) {
 // ...
});

app.url('user', 3);
// => "/users/3"

app.url('user', { id: 3 });
// => "/users/3"
```

## Tests

Tests use [mocha](https://github.com/visionmedia/mocha) and can be run
with [npm](https://npmjs.org):

```
npm test
```

## MIT Licensed
