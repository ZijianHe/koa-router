# koa-router

[![NPM version](https://img.shields.io/npm/v/koa-router.svg?style=flat)](https://npmjs.org/package/koa-router)
[![NPM Downloads](https://img.shields.io/npm/dm/koa-router.svg?style=flat)](https://npmjs.org/package/koa-router)
[![Node.js Version](https://img.shields.io/node/v/koa-router.svg?style=flat)](http://nodejs.org/download/)
[![Build Status](https://img.shields.io/travis/alexmingoia/koa-router.svg?style=flat)](http://travis-ci.org/alexmingoia/koa-router)
[![Gitter Chat](https://img.shields.io/badge/gitter-join%20chat-1dce73.svg?style=flat)](https://gitter.im/alexmingoia/koa-router/)

Router middleware for [koa](https://github.com/koajs/koa)

* Express-style routing using `app.get`, `app.put`, `app.post`, etc
* Named URL parameters (`/users/:id`)
* Based on [`path-to-regexp`](https://github.com/pillarjs/path-to-regexp)
* Named routes with URL generation
* Nestable/Prefixed routers
* async/await support
* Responds to `OPTIONS` requests with allowed methods
* Support for `405 Method Not Allowed` and `501 Not Implemented`
* Works with Koa@2

## Upgrading from 7.x to 8.x

See the [UPGRADING.md](./UPGRADING.md)

## Installation

```sh
npm install -S koa-router
# or yarn add koa-router
```

## Contributing

Please submit all issues and pull requests to the [alexmingoia/koa-router](http://github.com/alexmingoia/koa-router) repository!

## Tests

Run tests using `npm test`.

## Support

If you have any problem or suggestion please open an issue [here](https://github.com/alexmingoia/koa-router/issues).
