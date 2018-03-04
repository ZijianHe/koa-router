# Ordering

## Routes are matched FIFO

Routes are matched first-in, first-out (FIFO)—meaning the first route handlers declared for a path wins (will be executed when that path is requested).

```js
const router = new Router();

router.get('/specific', (ctx) => ctx.body = 'I win');
router.get('/specific', (ctx) => ctx.body = 'I lose');
```

## Ordering matters

The order in which you call `.use`, `.nest`, and `.param` dictates the execution order. Nested routers middleware, param handlers, and routes are inserted relative to the parent router's other middleware, param handlers, and routes. The ordering of `.nest` calls is recorded to insert their middleware, param handlers, and routes in the correct order as declared.

Here's an example:

```js
const parent = new Router();
const child1 = new Router();
const grandchild = new Router();
const child2 = new Router();

parent.use(middlwareA);
parent.use(middlwareB);
parent.param('foo', ...);
parent.use(middlwareC);
parent.param('bar', ...);

child1.param('corge', ...);
child1.use(middlewareD);
child1.use(middlewareE);
child1.use(middlewareF);

child2.use(middlewareG);
child2.param('baz', ...);
child2.param('quz', ...);
child2.use(middlewareH);
child2.use(middlewareI);

grandchild.use(middlewareJ);
grandchild.param('grault', ...);


child1.nest(grandchild);
parent.nest(child1);
parent.nest(child2);

```

The ordering of execution is as follows:

#### === stage I

dispatch -> find matching route, set to context

matching order (FIFO)
  1. routes from parent router
  2. routes from child1
  3. routes from grandchild
  4. routes from child2

#### === stage II

invoke middleware

- parent router (receiver of .routes())
  - middleware a
  - middleware b
  - foo param middleware
  - middleware c
  - bar param middleware
- child1 (nested first)
  - corge param middleware
  - middleware d
  - middleware e
  - middleware f
- grandchild
  - middleware j
  - grault param middleware
- child2 (nested second)
  - middleware g
  - baz param middleware
  - quz param middleware
  - middleware h
  - middleware i

#### === stage III

Invoke matched route
