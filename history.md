# History

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
