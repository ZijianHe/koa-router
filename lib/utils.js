/**
 * utilities for working with koa-router
 *
 * @module  utils
 */

function safeDecodeURIComponent(text) {
  try {
    return decodeURIComponent(text);
  } catch (e) {
    return text;
  }
}

function headerForIteration(array, i) {
  return i === array.length - 1 ? '└──' : '├──';
}

function middlewareToString(router, leadin) {
  return router.middleware
    .map((fn, i, middleware) => {
      const header = headerForIteration(middleware, i);
      return `${leadin}${header} ${fn._name || fn.name || 'anonymous'}`;
    })
    .join('\n');
}

function inspectRoute(route, padEnd) {
  const { method, path, handler } = route;
  return `${method.padStart(7, ' ')}\
  ${path.padEnd(padEnd, ' ')}\
  ${(route.name || '').padEnd(padEnd, '  ')}\
  ${route.regex.toString().padEnd(50, ' ')}\t${handler.name || ''}`;
}

function routesToString(router, leadin) {
  return router
    .compile()
    .map((route, i, routes) => {
      const header = headerForIteration(routes, i);
      const padEnd = Math.max(...routes.map(r => r.path.length));
      return `${leadin}${header} ${inspectRoute(route, padEnd)}`;
    })
    .join('\n');
}

/**
 * toString utility to turn a router into a tree-like diagram of its current
 * stack and composition. Useful for debugging the current state of a router.
 *
 * @static
 * @example
 *
 * ```js
 * const router = new Router();
 * const usersRouter = new Router();
 *
 * router.get('root', '/', () => {});
 * usersRouter.get('user', '/users/:id', () => {});
 * usersRouter.param('id', (id, ctx, next) => {});
 *
 * router.use(() => {});
 * router.nest(usersRouter);
 *
 * console.log(inspect(router));
 * // outputs:
 * // * Router
 * // ├── middleware
 * // │   ├── anonymous
 * // │   └── paramHandler(id)
 * // ├── routes
 * // │   ├──     GET  /           root        /^(?:\/(?=$))?$/i
 * // │   └──     GET  /users/:id  user        /^\/users\/((?:[^\/]+?))(?:\/(?=$))?$/i
 * // └── nested
 * //     * Router
 * //     ├── middleware
 * //     │   └── paramHandler(id)
 * //     ├── routes
 * //     │   └──     GET  /users/:id  user        /^\/users\/((?:[^\/]+?))(?:\/(?=$))?$/i
 * //     └── nested
 * ```
 *
 * @param  {router} router  the router to inspect
 * @return {string}         the router tree representation as a string
 */
function inspect(router, options = {}) {
  const { depth = 0, padToken = '  ' } = options;
  const padding = options.padding || padToken.repeat(depth);
  const nestedPadding = `${padding}│   `;
  const routesString = routesToString(router, nestedPadding);
  const { isWrapper } = router;

  let tree = `
${padding}* ${router.name || 'Router'}`;

  if (!isWrapper) {
    tree += `
${router.prefix ? `\n${padding}├── prefix: ${router.prefix} ` : ''}${padding}├── middleware ${
  router.middleware.length ? `\n${middlewareToString(router, nestedPadding)}` : ''
}
${padding}├── routes ${
  routesString ? `\n${routesString}` : ''
}`;
  }

  tree += `
${padding}└── nested ${
  router.nestedRouters.length ? `${childrenToString(router, depth + 2)}` : ''
}`;

  return tree;
}

module.exports.inspect = inspect;

function childrenToString(router, depth) {
  return router.nestedRouters
    .map(child => inspect(child, { depth }))
    .join('');
}

/**
 * try to decode a URI component and fall back to the value if unable to
 *
 * @private
 * @param  {(string|*)} value the value captured from the URL (encoded)
 * @return {(string|*)}       the value URI-decoded or the value itself
 */
module.exports.decode = function decode(value) {
  return value ? safeDecodeURIComponent(value) : value;
};

/**
 * wrap a function with a deprecation warning
 *
 * @private
 * @param  {Function} fn      the function to wrap in a warning
 * @param  {string}   message the message to display with the warning
 * @return {Function}           the wrapped function
 */
module.exports.withDeprecationWarning = function withDeprecationWarning(fn, message) {
  const warning = `DEPRECATION WARNING (koa-router): ${message}
Called from: ${new Error().stack.split('\n').slice(2, 15).join('\n')}`;
  console.warn(warning);
  return fn();
};
