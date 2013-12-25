# Router middleware for [koa](https://github.com/koajs/koa)

[![Build Status](https://secure.travis-ci.org/alexmingoia/koa-router.png)](http://travis-ci.org/alexmingoia/koa-router) 
[![Dependency Status](https://david-dm.org/alexmingoia/koa-router.png)](http://david-dm.org/alexmingoia/koa-router)
[![NPM version](https://badge.fury.io/js/koa-router.png)](http://badge.fury.io/js/koa-router)

* REST routing using `app.get`, `app.put`, `app.post`, etc.
* Rails-like resource routing, with nested resources.
* Named parameters.
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

After the router has been initialized, you can register routes or resources:

```javascript
app.get('/users/:id', function *(next) {
  var user = yield User.findOne(this.params.id);
  this.body = user;
});

app.resource('forums', require('./controllers/forums'));
```

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

#### Named parameters

Named route parameters are captured and added to `ctx.params`.

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

### app.resource(path, actions)

Resource routing is provided by the `app.resource()` method. `app.resource()`
registers routes for corresponding controller actions, and returns a
`Resource` object that can be used to further nest resources.

```javascript
var app    = require('koa')()
  , router = require('koa-router')(app);

app.use(router);

app.resource('users', {
  // GET /users
  index: function *(next) {
  },
  // GET /users/new
  new: function *(next) {
  },
  // POST /users
  create: function *(next) {
  },
  // GET /users/:id
  show: function *(next) {
  },
  // GET /users/:id/edit
  edit: function *(next) {
  },
  // PUT /users/:id
  update: function *(next) {
  },
  // DELETE /users/:id
  destroy: function *(next) {
  }
});
```

#### Action mapping

Actions are then mapped accordingly:

```javascript
GET     /users             ->  index
GET     /users/new         ->  new
POST    /users             ->  create
GET     /users/:user       ->  show
GET     /users/:user/edit  ->  edit
PUT     /users/:user       ->  update
DELETE  /users/:user       ->  destroy
```

#### Top-level resource

Omit the resource name to specify a top-level resource:

```javascript
app.resource(require('./frontpage'));
```

Top-level controller actions are mapped as follows:

```javascript
GET     /          ->  index
GET     /new       ->  new
POST    /          ->  create
GET     /:id       ->  show
GET     /:id/edit  ->  edit
PUT     /:id       ->  update
DELETE  /:id       ->  destroy
```

#### Nesting

Resources can be nested using `resource.add()`:

```javascript
var forums = app.resource('forums', require('./forum'));
var threads = app.resource('threads', require('./threads'));

forums.add(threads);
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

## License

The MIT License (MIT)

Copyright (c) 2013 Alexander C. Mingoia

Permission is hereby granted, free of charge, to any person obtaining a copy
of this software and associated documentation files (the "Software"), to deal
in the Software without restriction, including without limitation the rights
to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
copies of the Software, and to permit persons to whom the Software is
furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in
all copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN
THE SOFTWARE.
