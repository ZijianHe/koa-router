
1.1.0 / 2019-01-30
==================

**features**
  * [[`b318dd5`](http://github.com/eggjs/egg-router/commit/b318dd5ff2eea60013ed62b2a435f803c12bf20f)] - feat: add egg-router (dead-horse <<dead_horse@qq.com>>)

**fixes**
  * [[`b3db7b4`](http://github.com/eggjs/egg-router/commit/b3db7b41988d3bf1b4e885ed76b3a8165c1d3b1d)] - fix: add missing dependencies koa-convert (dead-horse <<dead_horse@qq.com>>)
  * [[`c280336`](http://github.com/eggjs/egg-router/commit/c2803368a8256bc9504ae3c821eefeb9d1fcbc4d)] - fix: only support node@8 (dead-horse <<dead_horse@qq.com>>)
  * [[`7a887a2`](http://github.com/eggjs/egg-router/commit/7a887a252445e602c2ea7e1c6f4cde52a433644d)] - fix: update license (dead-horse <<dead_horse@qq.com>>)

**others**
  * [[`ae40168`](http://github.com/eggjs/egg-router/commit/ae4016862fb8bdaf30e730a9278fbb1455d8b75d)] - docs: clean doc (dead-horse <<dead_horse@qq.com>>)
  * [[`e4f21a8`](http://github.com/eggjs/egg-router/commit/e4f21a8ed6dfd72c4d6f4a13bbda9a4e90b0401c)] - chore: fix history (dead-horse <<dead_horse@qq.com>>)

1.0.0 / 2019-01-30
==================

**others**
  * [[`d6496e0`](http://github.com/eggjs/egg-router/commit/d6496e09be6b0f91dcb96611f31ec5ab6ad8ac78)] - refactor: rename to @eggjs/router (dead-horse <<dead_horse@qq.com>>)

-------------------------------

# Release History from koa-router

## 7.4.0

- Fix router.url() for multiple nested routers [#407](https://github.com/alexmingoia/koa-router/pull/407)
- `layer.name` added to `ctx` at `ctx.routerName` during routing [#412](https://github.com/alexmingoia/koa-router/pull/412)
- Router.use() was erroneously settings `(.*)` as a prefix to all routers nested with .use that did not pass an explicit prefix string as the first argument. This resulted in routes being matched that should not have been, included the running of multiple route handlers in error. [#369](https://github.com/alexmingoia/koa-router/issues/369) and [#410](https://github.com/alexmingoia/koa-router/issues/410) include information on this issue.

## 7.3.0

- Router#url() now accepts query parameters to add to generated urls [#396](https://github.com/alexmingoia/koa-router/pull/396)

## 7.2.1

- Respond to CORS preflights with 200, 0 length body [#359](https://github.com/alexmingoia/koa-router/issues/359)

## 7.2.0

- Fix a bug in Router#url and append Router object to ctx. [#350](https://github.com/alexmingoia/koa-router/pull/350)
- Adds `_matchedRouteName` to context [#337](https://github.com/alexmingoia/koa-router/pull/337)
- Respond to CORS preflights with 200, 0 length body [#359](https://github.com/alexmingoia/koa-router/issues/359)

## 7.1.1

- Fix bug where param handlers were run out of order [#282](https://github.com/alexmingoia/koa-router/pull/282)

## 7.1.0

- Backports: merge 5.4 work into the 7.x upstream. See 5.4.0 updates for more details.

## 7.0.1

- Fix: allowedMethods should be ctx.method not this.method [#215](https://github.com/alexmingoia/koa-router/pull/215)

## 7.0.0

- The API has changed to match the new promise-based middleware
  signature of koa 2. See the
  [koa 2.x readme](https://github.com/koajs/koa/tree/2.0.0-alpha.3) for more
  information.
- Middleware is now always run in the order declared by `.use()` (or `.get()`,
  etc.), which matches Express 4 API.

## 5.4.0

- Expose matched route at `ctx._matchedRoute`.

## 5.3.0

- Register multiple routes with array of paths [#203](https://github.com/alexmingoia/koa-router/issue/143).
- Improved router.url() [#143](https://github.com/alexmingoia/koa-router/pull/143)
- Adds support for named routes and regular expressions
  [#152](https://github.com/alexmingoia/koa-router/pull/152)
- Add support for custom throw functions for 405 and 501 responses [#206](https://github.com/alexmingoia/koa-router/pull/206)

## 5.2.3

- Fix for middleware running twice when nesting routes [#184](https://github.com/alexmingoia/koa-router/issues/184)

## 5.2.2

- Register routes without params before those with params [#183](https://github.com/alexmingoia/koa-router/pull/183)
- Fix for allowed methods [#182](https://github.com/alexmingoia/koa-router/issues/182)

## 5.2.0

- Add support for async/await. Resolves [#130](https://github.com/alexmingoia/koa-router/issues/130).
- Add support for array of paths by Router#use(). Resolves [#175](https://github.com/alexmingoia/koa-router/issues/175).
- Inherit param middleware when nesting routers. Fixes [#170](https://github.com/alexmingoia/koa-router/issues/170).
- Default router middleware without path to root. Fixes [#161](https://github.com/alexmingoia/koa-router/issues/161), [#155](https://github.com/alexmingoia/koa-router/issues/155), [#156](https://github.com/alexmingoia/koa-router/issues/156).
- Run nested router middleware after parent's. Fixes [#156](https://github.com/alexmingoia/koa-router/issues/156).
- Remove dependency on koa-compose.

## 5.1.1

- Match routes in order they were defined. Fixes #131.

## 5.1.0

- Support mounting router middleware at a given path.

## 5.0.1

- Fix bug with missing parameters when nesting routers.

## 5.0.0

- Remove confusing API for extending koa app with router methods. Router#use()
  does not have the same behavior as app#use().
- Add support for nesting routes.
- Remove support for regular expression routes to achieve nestable routers and
  enable future trie-based routing optimizations.

## 4.3.2

- Do not send 405 if route matched but status is 404. Fixes #112, closes #114.

## 4.3.1

- Do not run middleware if not yielded to by previous middleware. Fixes #115.

## 4.3.0

- Add support for router prefixes.
- Add MIT license.

## 4.2.0

- Fixed issue with router middleware being applied even if no route was
matched.
- Router.url - new static method to generate url from url pattern and data

## 4.1.0

Private API changed to separate context parameter decoration from route
matching. `Router#match` and `Route#match` are now pure functions that return
an array of routes that match the URL path.

For modules using this private API that need to determine if a method and path
match a route, `route.methods` must be checked against the routes returned from
`router.match()`:

```javascript
var matchedRoute = router.match(path).filter(function (route) {
  return ~route.methods.indexOf(method);
}).shift();
```

## 4.0.0

405, 501, and OPTIONS response handling was moved into separate middleware
`router.allowedMethods()`. This resolves incorrect 501 or 405 responses when
using multiple routers.

### Breaking changes

4.x is mostly backwards compatible with 3.x, except for the following:

- Instantiating a router with `new` and `app` returns the router instance,
  whereas 3.x returns the router middleware. When creating a router in 4.x, the
  only time router middleware is returned is when creating using the
  `Router(app)` signature (with `app` and without `new`).
