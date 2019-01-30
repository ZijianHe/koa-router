'use strict';

const EggRouter = require('../../').EggRouter;
const assert = require('assert');
const is = require('is-type-of');

describe('test/lib/egg_router.test.js', () => {
  it('creates new router with egg app', function () {
    const app = { controller: {} };
    const router = new EggRouter({}, app);
    assert(router);
    [ 'head', 'options', 'get', 'put', 'patch', 'post', 'delete', 'all', 'resources' ].forEach(method => {
      assert(typeof router[method] === 'function');
    });
  });

  it('should app.verb(url, controller) work', () => {
    const app = {
      controller: {
        async foo() {},
        hello: {
          * world() {},
        },
      },
    };

    const router = new EggRouter({}, app);
    router.get('/foo', app.controller.foo);
    router.post('/hello/world', app.controller.hello.world);

    assert(router.stack[0].path === '/foo');
    assert.deepEqual(router.stack[0].methods, [ 'HEAD', 'GET' ]);
    assert(router.stack[0].stack.length === 1);
    assert(router.stack[1].path === '/hello/world');
    assert.deepEqual(router.stack[1].methods, [ 'POST' ]);
    assert(router.stack[1].stack.length === 1);
  });

  it('should app.verb(name, url, controller) work', () => {
    const app = {
      controller: {
        async foo() { },
        hello: {
          * world() { },
        },
      },
    };

    const router = new EggRouter({}, app);
    router.get('foo', '/foo', app.controller.foo);
    router.post('hello', '/hello/world', app.controller.hello.world);

    assert(router.stack[0].name === 'foo');
    assert(router.stack[0].path === '/foo');
    assert.deepEqual(router.stack[0].methods, [ 'HEAD', 'GET' ]);
    assert(router.stack[0].stack.length === 1);
    assert(router.stack[1].name === 'hello');
    assert(router.stack[1].path === '/hello/world');
    assert.deepEqual(router.stack[1].methods, [ 'POST' ]);
    assert(router.stack[1].stack.length === 1);
  });

  it('should app.verb(name, url, controllerString) work', () => {
    const app = {
      controller: {
        async foo() { },
        hello: {
          * world() { },
        },
      },
    };

    const router = new EggRouter({}, app);
    router.get('foo', '/foo', 'foo');
    router.post('hello', '/hello/world', 'hello.world');

    assert(router.stack[0].name === 'foo');
    assert(router.stack[0].path === '/foo');
    assert.deepEqual(router.stack[0].methods, [ 'HEAD', 'GET' ]);
    assert(router.stack[0].stack.length === 1);
    assert(router.stack[1].name === 'hello');
    assert(router.stack[1].path === '/hello/world');
    assert.deepEqual(router.stack[1].methods, [ 'POST' ]);
    assert(router.stack[1].stack.length === 1);
  });

  it('should app.verb() throw if not found controller', () => {
    const app = {
      controller: {
        async foo() { },
        hello: {
          * world() { },
        },
      },
    };

    const router = new EggRouter({}, app);
    assert.throws(() => {
      router.get('foo', '/foo', 'foobar')
    }, /controller 'foobar' not exists/);

    assert.throws(() => {
      router.get('/foo', app.bar);
    }, /controller not exists/);
  });

  it('should app.verb(name, url, [middlewares], controllerString) work', () => {
    const app = {
      controller: {
        async foo() { },
        hello: {
          * world() { },
        },
      },
    };

    const generatorMiddleware = function* () {};
    const asyncMiddleware = async function() {};
    const commonMiddleware = function() {};

    const router = new EggRouter({}, app);
    router.get('foo', '/foo', generatorMiddleware, asyncMiddleware, commonMiddleware, 'foo');
    router.post('hello', '/hello/world', generatorMiddleware, asyncMiddleware, commonMiddleware, 'hello.world');

    assert(router.stack[0].name === 'foo');
    assert(router.stack[0].path === '/foo');
    assert.deepEqual(router.stack[0].methods, [ 'HEAD', 'GET' ]);
    assert(router.stack[0].stack.length === 4);
    assert(!is.generatorFunction(router.stack[0].stack[0]));
    assert(is.asyncFunction(router.stack[0].stack[1]));
    assert(!is.generatorFunction(router.stack[0].stack[3]));
    assert(router.stack[1].name === 'hello');
    assert(router.stack[1].path === '/hello/world');
    assert.deepEqual(router.stack[1].methods, [ 'POST' ]);
    assert(router.stack[1].stack.length === 4);
    assert(!is.generatorFunction(router.stack[1].stack[0]));
    assert(is.asyncFunction(router.stack[1].stack[1]));
    assert(!is.generatorFunction(router.stack[1].stack[3]));
  });

  it('should app.resource() work', () => {
    const app = {
      controller: {
        post: {
          async index() { },
          async show() { },
          async create() { },
          async update() { },
          async new() {},
        },
      },
    };

    const asyncMiddleware = async function () { };

    const router = new EggRouter({}, app);
    router.resources('/post', asyncMiddleware, app.controller.post);
    assert(router.stack.length === 5);
    assert(router.stack[0].stack.length === 2);

    router.resources('api_post', '/api/post', app.controller.post);
    assert(router.stack.length === 10);
    assert(router.stack[5].stack.length === 1);
    assert(router.stack[5].name === 'api_posts');
  });

  it('should router.url work', () => {
    const app = {
      controller: {
        async foo() { },
        hello: {
          * world() { },
        },
      },
    };
    const router = new EggRouter({}, app);
    router.get('post', '/post/:id', app.controller.foo);
    router.get('hello', '/hello/world', app.controller.hello.world);

    assert(router.url('post', { id: 1, foo: [1, 2], bar: 'bar' }) === '/post/1?foo=1&foo=2&bar=bar');
    assert(router.url('post', { foo: [1, 2], bar: 'bar' }) === '/post/:id?foo=1&foo=2&bar=bar');
    assert(router.url('fooo') === '');
    assert(router.url('hello') === '/hello/world');

    assert(router.pathFor('post', { id: 1, foo: [1, 2], bar: 'bar' }) === '/post/1?foo=1&foo=2&bar=bar');
    assert(router.pathFor('fooo') === '');
    assert(router.pathFor('hello') === '/hello/world');
  });
});
