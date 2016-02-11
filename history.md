# History

## 5.4.0

- Expose matched route at `ctx._matchedRoute`.

## 5.3.0

- Register multiple routes with array of paths [#203](https://github.com/alexmingoia/koa-router/issue/143).
- Improved router.url() [#143](https://github.com/alexmingoia/koa-router/pull/143)
- Adds support for named routes and regular expressions
  [#152](https://github.com/alexmingoia/koa-router/pulls/152)
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
