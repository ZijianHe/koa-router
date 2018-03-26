# Upgrading to 8.0

---

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
