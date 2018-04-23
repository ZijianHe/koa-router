# Upgrading from 7 to 8

```js
router.use('/nested/path', otherRouter.routes())
router.use('/users', userAuth());
```

// becomes

```js
const router = new Router({prefix: '/nested/path'})
router.nest('/nested/path', otherRouter);

const router = new Router({prefix: '/users'});
router.use(userAuth());
```

```js
parentRouter.use(childRouter.routes());
```

becomes

```js
parentRouter.nest(childRouter);
```

---

```js
// use -> nest
forums.use(posts.routes());
```

becomes

```js
forums.nest(posts);
```

---

declaring routes after using .routes()
no longer works.
you *MUST* declare routes before using .routes()
.routes() is a snapshot of the router at that point in time. no modifications
after using .routes() will have an affect on the previous .routes() call dispatcher

```js
app.use(router.routes());
router.post('/some-endpoint', () => {});
```

becomes

```js
router.post('/some-endpoint', () => {});
// MUST register handlers before calling .routes()!
app.use(router.routes());
```

---

ctx.routerPath is deprecated

```js
```

---

`.use()` no longer accepts a path prefix. Nest a router instead.

```js
const router = new Router();
router.use('/admin', authenticateAdmin);
router.get('/secrets', () => {});
app.use(router.routes());
```

becomes

```js
const secretsRouter = new Router();
const adminRouter = new Router();
secretsRouter.get('/secrets', () => {});
adminRouter.nest('/admin', secretsRouter);
app.use(adminRouter.routes());
```

---

Changes to a router after calling routes() will not have an effect on the middleware previously returned by routes().

When a router is nested, changes can still be made to it. Changes to a router are ignored after calling routes() on that router or any ancestor.


---

```js
router.use('*', ...)
```

becomes

```js
router.use(...);
```

---

runs parameter middleware in order of URL appearance

becomes

it runs in the order of `param(` calls

---

```js
router.get('users-index', '/users', () => { ... });
router.url('users-index', {}, { query: { page: 1 } });
// => /users?page=1
```

becomes

```js
router.get('users-index', '/users', () => { ... });
router.url('users-index', { page: 1 });
// => /users?page=1
```



























## Nesting with nest():

let parent Router:
let parent.middleware = a, b, c

let child1 Router
let child1.middleware = d, e, f

let child2 Router
let child2.middleware = g, h, i

parent.nest(child2)
parent.nest(child1)

dispatch always happens on the parent (the one that .routes) gets called on
request passes through all the middleware of the parent and nesteds and then the dispatch for route matching occurs

.routes() =>

=== stage I

- from parent router
middleware a
middleware b
middleware c
- from child2, nested first
middleware g
middleware h
middleware i
- from child1, nested second
middleware d
middleware e
middleware f

=== stage II

- from parent router
params middleware
- from child2
params middleware
- from child1
params middleware

=== stage III

- from parent router
dispatch

  - from parent router
  routes
  - from child2
  routes
  - from child1
  routes


ORDERING / Compose Stack:

find matched route or not (FIFO)
  set ctx.params, matchedRoute, etc
param handlers
middleware
invoke route
  invoke route middleware specific to route
  invoke route handler itself



## Nesting with use():




var forums = new Router();
var posts = new Router();

posts.get('/', (ctx, next) => {...});
posts.get('/:pid', (ctx, next) => {...});
forums.use('/forums/:fid/posts', posts.routes(), posts.allowedMethods());

// responds to "/forums/123/posts" and "/forums/123/posts/123"
app.use(forums.routes());


