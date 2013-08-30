# Router middleware for [koa](https://github.com/koajs/koa)

RESTful resource routing for [koa](https://github.com/koajs/koa).

## Install

koa-router is available using [npm](https://npmjs.org):

    npm install koa-router

## Usage

First, require the middleware and mount it:

    var koa = require('koa');
    var router = require('koa-router');
    
    var app = koa();
    app.use(router(app));
    

### Map specific routes

You can map specific routes using methods corresponding to the HTTP verb, such as `app.get` or `app.post`.

    app.get('/', function *(next) {
      this.body = 'Hello world!';
    });

### Named parameters

Named route parameters are captured and passed as arguments to the route callback. They are also available in the app context using `this.params`.

    app.get('/:category/:title', function *(category, title, next) {
      console.log(this.params); // Also available in app context
    });

### Multiple methods

You can map routes to multiple HTTP methods using `app.map`:

    app.map(['GET', 'POST', '/come/get/some', function *(next) {
      this.body = 'Here it is!';
    });

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
