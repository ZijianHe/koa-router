# Router middleware for [koa](https://github.com/koajs/koa)

[![Build Status](https://secure.travis-ci.org/alexmingoia/koa-router.png)](http://travis-ci.org/alexmingoia/koa-router)

* REST routing using `app.get`, `app.put`, `app.post`, etc.
* Rails-like resource routing, with nested resources.
* Named parameters.
* Multiple route callbacks.

## Install

koa-router is available using [npm](https://npmjs.org):

    npm install --global koa-router

## Usage

First, require the middleware and mount it:

    var koa = require('koa')
      , router = require('koa-router')
      , app = koa();
    
    app.use(router(app));
    
    app.get('/users/:id', function *(id) {
      var user = yield User.findOne(id);
      this.body = user;
    });

### app.verb(path, callback, [callback...])

`app.verb()` methods are created for the app used to create the router,
where **verb** is one of the HTTP verbs, such as `app.get()` or `app.post()`.

Multiple callbacks may be given, and each one will be called sequentially.
This allows you to modify the context or route parameters for subsequent
callbacks.

Route paths will be translated to regular expressions used to match requests.
Query strings will not be considered when matching requests.

##### Named parameters

Named route parameters are captured and passed as arguments to the route callback.
They are also available in the app context using `this.params`.

    app.get('/:category/:title', function *(category, title, next) {
      console.log(this.params);
      // => { category: 'programming', title: 'how-to-node' }
    });

##### Regular expressions

Control route matching exactly by specifying a regular expression instead of
a path string when creating the route. For example, it might be useful to match
date formats for a blog, such as `/blog/2013-09-04`:

    app.get(/^\/blog\/\d{4}-\d{2}-\d{2}\/?$/i, function *(next) {
      // ...
    });

##### Multiple methods

You can map routes to multiple HTTP methods using `app.map()`:

    app.map(['GET', 'POST'], '/', function *(next) {
      // ...
    });

You can map to all methods use `app.all()`:

    app.all('/', function *(next) {
      // ...
    });

### Resource routing

Resource routing is provided by the `app.resource()` method. `app.resource()`
registers routes for corresponding controller actions, and returns a
`Resource` object that can be used to further nest resources.

    var app    = require('koa')()
      , router = require('koa-router')(app);
    
    app.use(router);
    
    app.resource('users', require('./user'));

##### Action mapping

Actions are then mapped accordingly:

    GET     /users             ->  index
    GET     /users/new         ->  new
    POST    /users             ->  create
    GET     /users/:user       ->  show
    GET     /users/:user/edit  ->  edit
    PUT     /users/:user       ->  update
    DELETE  /users/:user       ->  destroy

##### Top-level resource

Omit the resource name to specify a top-level resource:

    app.resource(require('./frontpage'));

Top-level controller actions are mapped as follows:

    GET     /          ->  index
    GET     /new       ->  new
    POST    /          ->  create
    GET     /:id       ->  show
    GET     /:id/edit  ->  edit
    PUT     /:id       ->  update
    DELETE  /:id       ->  destroy

##### Auto-loading

Automatically load requested resources by specifying the `load` action
on your controller:

    var actions = {
      show: function *(user) {
        this.body = user;
      },
      load: function *(id) {
        return users[id];
      }
    };
    
    app.resource('users', actions);

The `user` object will then be available to the relevant controller actions.
You can also pass the load method as an option:

    app.resource('users', require('./users'), { load: User.findOne });

##### Nesting

Resources can be nested using `resource.add()`:

    var forums = app.resource('forums', require('./forum'), { load: Forum.findOne });
    var theads = app.resource('threads', require('./threads'), { load: Thread.findOne });
    
    forums.add(threads);

## Tests

Tests use [mocha](https://github.com/visionmedia/mocha) and can be run 
with [npm](https://npmjs.org):

    npm test

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
