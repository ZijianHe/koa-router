# Router middleware for [koa](https://github.com/koajs/koa)

[![Build Status](https://secure.travis-ci.org/alexmingoia/koa-router.png)](http://travis-ci.org/alexmingoia/koa-router) 
[![Dependency Status](https://david-dm.org/alexmingoia/koa-router.png)](http://david-dm.org/alexmingoia/koa-router)
[![NPM version](https://badge.fury.io/js/koa-router.png)](http://badge.fury.io/js/koa-router)

* REST routing using `app.get`, `app.put`, `app.post`, etc.
* Named parameters.
* String or regexp route matching.
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
var APIv1 = new Router();
var APIv2 = new Router();

APIv1.get('/sign-in', function *() {
  // ...
});

APIv2.get('/sign-in', function *() {
  // ...
});

app.use(mount('/v1', APIv1.middleware()));
app.use(mount('/v2', APIv2.middleware()));
```

### app.verb(path, middleware, [middleware...])

Match URL patterns to callback functions or controller actions using `app.verb()`,
where **verb** is one of the HTTP verbs such as `app.get()` or `app.post()`.

```javascript
app.get('/', function *(next) {
  this.body = 'Hello World!';
});
```

Route paths will be translated to regular expressions used to match requests.
Query strings will not be considered when matching requests.

### Multiple route callbacks / middleware

Multiple middleware may be given:

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

#### Named parameters / Capture groups

Named route parameters are captured and added to `ctx.params`. Capture groups
from regular expression routes are also added to `ctx.params`, which is an
array.

```javascript
app.get('/:category/:title', function *(next) {
  console.log(this.params);
  // => { category: 'programming', title: 'how-to-node' }
});
```

#### Regular expressions

Control route matching exactly by specifying a regular expression instead of
a path string when creating the route. For example, it might be useful to match
date formats for a blog, such as `/blog/2013-09-04`:

```javascript
app.get(/^\/blog\/\d{4}-\d{2}-\d{2}\/?$/i, function *(next) {
  // ...
});
```

#### Multiple methods

You can map routes to multiple HTTP methods using `app.map()`:

```javascript
app.map(['GET', 'POST'], '/', function *(next) {
  // ...
});
```

You can map to all methods use `app.all()`:

```javascript
app.all('/', function *(next) {
  // ...
});
```

### app.redirect(path, destination, [code])

Redirect `path` to `destination` URL with optional 30x status `code`.

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

## Tests

Tests use [mocha](https://github.com/visionmedia/mocha) and can be run 
with [npm](https://npmjs.org):

```
npm test
```

## MIT Licensed
