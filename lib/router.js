const compose = require('koa-compose');
const methods = require('methods');
const { NotImplemented, MethodNotAllowed } = require('http-errors');
const debug = require('debug')('koa-router');
const Route = require('./route');
const { withDeprecationWarning } = require('./utils');

/**
 * The Router object provides the API for mapping paths to functions and composing routers.
 * Use it to declare your routes, add middleware, and map requests to handler functions.
 *
 * @example
 *
 * ```js
 * const router = new Router();
 * ```
 *
 * with options.prefix and options.name
 *
 * ```js
 * const router = new Router({ prefix: '/admin', name: 'admin-router' });
 * ```
 */
class Router {
  /**
   * Create a new router.
   *
   * @param {object} [options]
   * @param {string} [options.prefix=''] the string to prefix all routes
   *                                     declared for this router with
   * @param {string} [options.name] the name of the router—used for debugging
   *                                and log lines
   * @param {boolean} [options.strict=false] whether or not a trailing slash is
   *                                         is required for routes
   * @param {boolean} [options.sensitive=false] whether the routes should be case
   *                                            sensitive or not
   */
  constructor({
    name, prefix, strict = false, sensitive = false,
  } = {}) {
    /**
     * the name of the router (provided during construction)
     * @readonly
     * @type {?string}
     */
    this.name = name;
    this.routeOptions = {
      sensitive,
      strict,
    };
    this.implementedMethods = {};
    this._prefix = prefix || '';
    this._middleware = [];
    this.nestedRouters = [];
    this.routeStack = [];
    this.routesByName = {};
  }

  /**
   * getter for the router prefix
   *
   * @readonly
   * @return {string}      the prefix
   */
  get prefix() {
    return this._prefix;
  }

  /**
   * setter for the router prefix
   *
   * @name  Router#prefix=
   * @param  {string} [path=''] the prefix to set
   * @return {string}      the prefix
   */
  set prefix(path) {
    this._prefix = path || '';
    return this.prefix;
  }

  /**
   * [use description]
   * @param  {...function} functions middleware functions to add to the middleware stack
   *                           for this router
   * @return {Router} self
   */
  use(...fns) {
    fns.forEach((fn) => {
      if (typeof fn !== 'function') {
        throw new Error(`middleware must be a function (${typeof fn} provided: ${fn})`);
      }
    });
    this._middleware.push(...fns);
    return this;
  }

  /**
   * nests a router in another router [optionally with a prefix]
   *
   * This is used for nesting when one router (parent) nests another (child) at
   * a specific path. In order to not modify the child router, we create a
   * surrogate router with the intended prefix. The child router is nested
   * within this surrogate, and then the surrogate is nested within the parent.
   * That way, the child router is not modified (no prefix added) and thus
   * can be continued to be used in other contexts (nested again somewhere else)
   *
   * All middleware, param handlers, and routes will be added to the parent router
   * in order of declaration at the time of mounting. Modifying the child after
   * it has been nested will affect the routes nested within the parent.
   *
   * @example
   *
   * ```js
   * const router = new Router();
   * const v1Router = new Router();
   * const v2Router = new Router();
   * const healthRouter = new Router();
   *
   * healthRouter
   *   .use((ctx, next) => {
   *     // A
   *     return next();
   *   })
   *   .get('/_health', (ctx, next) => {
   *     // B
   *   });
   *
   * router.get('/version', () => {
   *   // C
   * });
   *
   * v1Router.post('/post', () => {
   *   // D
   * });
   *
   * v2Router
   *   .use((ctx, next) => {
   *     // E
   *   })
   *   .post('/post', () => {
   *     // F
   *   });
   *
   * router.nest(healthRouter);
   * router.nest('/v1', v1Router);
   * router.nest('/v2', v2Router);
   *
   * // The router state:
   *
   * * Router
   * ├── middleware
   * │   ├── anonymous
   * │   └── anonymous
   * ├── routes
   * │   ├──     GET  /version            /^\/version(?:\/(?=$))?$/i
   * │   ├──     GET  /_health            /^\/_health(?:\/(?=$))?$/i
   * │   ├──    POST  /v1/post            /^\/v1\/post(?:\/(?=$))?$/i
   * │   └──    POST  /v2/post            /^\/v2\/post(?:\/(?=$))?$/i
   * └── nested
   *     * Router
   *     ├── middleware
   *     │   └── anonymous
   *     ├── routes
   *     │   └──     GET  /_health            /^\/_health(?:\/(?=$))?$/i
   *     └── nested
   *     * /v1 prefix
   *     └── nested
   *         * Router
   *         ├── middleware
   *         ├── routes
   *         │   └──    POST  /post         /^\/post(?:\/(?=$))?$/i
   *         └── nested
   *     * /v2 prefix
   *     └── nested
   *         * Router
   *         ├── middleware
   *         │   └── anonymous
   *         ├── routes
   *         │   └──    POST  /post         /^\/post(?:\/(?=$))?$/i
   *         └── nested
   * ```
   *
   * @param  {string} [prefix] the prefix to add to the nested router's routes
   * @param {Router} child the router to nest within this router
   * @return {Router} self
   */
  nest(...args) {
    let prefix;
    let child;

    if (args.length === 1) {
      [child] = args;
    } else if (args.length === 2) {
      [prefix, child] = args;
      child = Router.wrapNested(prefix, child);
    } else {
      throw new Error(`wrong number of arguments (${args.length} for 1..2)`);
    }

    this.nestedRouters.push(child);
    this.routeStack.push(child);

    return this;
  }

  /**
   * adds a middleware function to be called whenever a param with the provided name is found in
   * the request path. This is useful for loading a record from the database or validation on
   * path parameters before the request reaches the route handler.
   *
   * @example
   *
   * ```js
   * const postsRouter = new Router();
   *
   * postsRouter.get('/posts/:id/comments', () => {});
   *
   * postsRouter.param('id', async (id, ctx, next) => {
   *   // find a post in the database when `id` appears in the matched path
   *   ctx.state.post = await Post.find(id);
   * });
   * ```
   *
   * In the example above, a request to `/posts/1/comments` will trigger the
   * param middleware and call `Post.find(1)`.
   *
   * Param handlers are added to the middleware stack of a router in the order they are
   * defined. They are executed in the order they are defined.
   *
   * @param  {String} name    the name of the path parameter the provided function handles
   * @param  {Function} handler the function to call when the named parameter is captured
   *                            in a request path
   * @return {Router}         the router
   */
  param(name, handler) {
    const paramHandler = (ctx, next) => {
      let promise;

      if (Object.keys(ctx.params).indexOf(name) > -1) {
        promise = handler(ctx.params[name], ctx, next);
      } else {
        promise = next();
      }

      return promise;
    };

    paramHandler._name = `paramHandler(${name})`;

    return this.use(paramHandler);
  }

  route(name) {
    return (
      this.routesByName[name] ||
      this.nestedRouters.map(child => child.route(name)).find(path => path)
    );
  }

  /**
   * generates a path with interpolated path parameters
   *
   * @example
   *
   * Generate a path with an object of path params:
   *
   * ```js
   * Router.path('/users/:id', { id: 1 });
   * // => '/users/1'
   * ```
   *
   * Generate a path with path params as positional arguments:
   *
   * ```js
   * Router.path('/users/:id', 1);
   * // => '/users/1'
   * ```
   *
   * @param  {string}    path the path to interpolate path params in
   * @param  {...*} args forwarded to [Route#toPathWithParams]{@link Route#toPathWithParams}
   * @return {string}         the path with interpolated params and query string if necessary
   */
  static path(path, ...args) {
    return new Route({ path, method: '*' }).toPathWithParams(...args);
  }

  /**
   * delegates to [Router.path]{@link Router.path}
   * present for backwards compatibility. Eventually should support adding host, subdomain,
   * etc to the returned URL
   *
   * @private
   */
  static url(...args) {
    return withDeprecationWarning(
      () => this.path(...args),
      `\
Router.url behavior will change in version 9.
Please use Router.path unless you need the host,
domain, and/or subdomain in the returned string.`,
    );
  }

  /**
   * build a path for a route found by the name provided
   *
   * @example
   *
   * Generate a path with params as an object:
   *
   * ```js
   * router.get('user-photos', '/users/:id/photos/:category', () => {});
   *
   * router.path('user-photos', { id: 1, category: 'me' });
   * // => '/users/1/photos/me'
   * ```
   *
   * Generate a path with path params as positional arguments:
   *
   * ```js
   * router.get('user-photos', '/users/:id/photos/:category', () => {});
   *
   * router.path('user-photos', 1, 'me');
   * // => '/users/1/photos/me'
   * ```
   *
   * @throws Error
   * @param {string} name the route name to build a path for
   * @param {...*} args forwarded to [Route#toPathWithParams]{@link Route#toPathWithParams}
   * @return {string}         the path with interpolated params and query string if necessary
   */
  path(name, ...args) {
    const route = this.route(name);
    if (!route) throw new Error(`Failed to generate path: route ${name} not found`);

    return route.toPathWithParams(...args);
  }

  /**
   * delegates to [Router#path]{@link Router#path}
   * present for backwards compatibility. Eventually should support adding host, subdomain,
   * etc to the returned URL
   *
   * @private
   */
  url(...args) {
    return withDeprecationWarning(
      () => this.path(...args),
      `\
Router#url behavior will change in version 9.
Please use Router#path unless you need the host,
domain, and/or subdomain in the returned string.`,
    );
  }

  /**
   * creates a middleware function to mount on a koa2 application that handles
   * dispatching to routes:
   *
   * @example
   *
   * Mount routes on a koa application:
   *
   * ```js
   * const app = new Koa();
   * const router = new Router();
   *
   * router.get('/', (ctx) => ctx.body = 'Hello World');
   *
   * app.use(router.routes());
   *
   * app.listen(3000);
   * ```
   *
   * Mount routes on a koa application with MethodNotAllowed and NotImplemented middleware:
   *
   * ```js
   * const app = new Koa();
   * const router = new Router();
   *
   * router.get('/', (ctx) => ctx.body = 'Hello World');
   *
   * app.use(router.routes({ allowedMethods: true }));
   *
   * app.listen(3000);
   * ```
   *
   * Mount routes on a koa application with MethodNotAllowed and NotImplemented middleware
   * that throws a custom error (with [Boom](https://github.com/hapijs/boom)) when necessary:
   *
   * ```js
   * const app = new Koa();
   * const router = new Router();
   * const Boom = require('boom');
   *
   * router.get('/', (ctx) => ctx.body = 'Hello World');
   *
   * app.use(router.routes({
   *   allowedMethods: 'throw',
   *   notImplemented: () => new Boom.notImplemented(),
   *   methodNotAllowed: () => new Boom.methodNotAllowed(),
   * }));
   *
   * app.listen(3000);
   * ```
   *
   * @return {function} router middleware function that handles dispatching and invocation
   */
  routes() {
    const stack = [
      this.createDispatch(),
      Router.createCaptureParams(),
      ...this.middleware,
      Router.createInvokeRoute(),
    ];

    const composed = compose(stack);
    composed._name = this.name || 'koa-router';
    return composed;
  }

  /**
   * adds a redirect middleware to redirect requests to fromPath to
   * the toPath or route found by the toName argument with optional status code
   * override
   *
   * @example
   *
   * ```js
   * const router = new Router();
   * router.redirect('/deals/123', '/deals/456');
   * // => redirects requests to /deals/123 to /deals/456 with status 301
   * ```
   *
   * ```js
   * const router = new Router();
   * router.get('new-deal', '/deals/new', () => {});
   * router.redirect('/deals/123', 'new-deal');
   * // => redirects requests to /deals/123 to /deals/new with status 301
   * ```
   *
   * ```js
   * const router = new Router();
   * router.redirect('/vote', '/countdown', 302);
   * // => redirects requests to /vote to /countdown with status 302 (temporary)
   * ```
   *
   * @param  {string} fromPath       path that should be redirected
   * @param  {string} toPathOrName path or name of the route to be redirected to
   * @param  {number} [code=301]         the status code to use for this redirect
   * @return {Router}              the router (self)
   */
  redirect(fromPath, toPathOrName, code) {
    let destination;

    if (toPathOrName[0] === '/') {
      destination = toPathOrName;
    } else {
      destination = this.path(toPathOrName);
    }

    return this.all(fromPath, (ctx) => {
      ctx.redirect(destination);
      ctx.status = code || 301;
    });
  }

  /**
   *
   * Returns separate middleware for responding to `OPTIONS` requests with
   * an `Allow` header containing the allowed methods, as well as responding
   * with `405 Method Not Allowed` and `501 Not Implemented` as appropriate.
   *
   * @param {object} options
   * @param {boolean} [options.throw=] 405 and 501 responses are handled by throwing an error
   * @param {function} [options.methodNotAllowed] a function that returns an error to be thrown
   *                                              when a 405 should be returned to the client
   *                                              note: allowedMethods must be set to 'throw'
   * @param {function} [options.notImplemented] a function that returns an error to be thrown
   *                                            when a 501 should be returned to the client
   *                                            note: allowedMethods must be set to 'throw'
   *
   * @private
   */

  allowedMethods({
    throw: _throw,
    methodNotAllowed,
    notImplemented,
  } = {}) {
    return compose([
      Router.createNotImplementedHandler({
        throw: _throw,
        implementedMethods: this.implementedMethods,
        errorFactory: notImplemented || (() => new NotImplemented()),
      }),
      Router.createAllowedMethodsHandler({
        throw: _throw,
        errorFactory: methodNotAllowed || (() => new MethodNotAllowed()),
      }),
    ]);
  }

  /**
   * nests a router within a surrogate router [optionall with a prefix]
   *
   * @see  Router.nest
   * @private
   * @param {string} prefix prefix for the surrogate router
   * @param {Router} router the router to wrap and nest within the surrogate
   * @return {Router} the surrogate router with provided router nested within
   */
  static wrapNested(prefix, router) {
    const wrapped = new Router({ prefix, name: `${prefix} prefix` });

    wrapped.isWrapper = true;
    wrapped.nest(router);

    return wrapped;
  }

  /**
   * Compile the route stack for the current state of this router and all of its
   * nested routers. The result is an ordered array of all routes this router
   * is capable of handling (recursively for all nestings and own).
   *
   * @private
   * @param {object} options
   * @param {string} [options.prefix] the prefix to compile with
   * @return {Array} flat, ordered array of all routes
   */
  compile({ prefix = '' } = {}) {
    const compiled = this.routeStack.reduce(
      (accumulator, routeOrRouter) => (
        accumulator.concat(routeOrRouter.compile({
          prefix: `${prefix}${this.prefix}`,
        }))
      ),
      [],
    );

    debug(
      'compiling router name=%s prefix=%s numroutes=%i',
      this.name || 'anonymous',
      prefix,
      compiled.length,
    );

    return compiled;
  }

  /**
   * creates a dispatch middleware function that finds a matched routes from the
   * incoming request and sets the match to the context for downstream middleware.
   *
   * @private
   * @return {function} the dispatch function
   */
  createDispatch() {
    const routes = this.compile();
    const dispatch = (ctx, next) => {
      const { method, routerPath } = ctx;
      const path = routerPath || ctx.path;

      ctx.router = this;

      debug('dispatching %s %s', method, path);

      ctx.matched/* by path */ = routes.filter(route => route.testPath(path));
      // path and method matched
      const match = ctx.matched.find(route => route.testMethod(method));

      if (match) {
        ctx.matchedRoute = match;
        // backwards compatibility
        ctx._matchedRoute = match.path;
        ctx._matchedRouteName = match.name;

        debug('matched route name=%s path=%s', match.name, match.path);
      } else {
        debug(`no route matches ${method} ${path}`);
        ctx.status = 404;
      }

      return next();
    };

    return dispatch;
  }

  /**
   * creates a middleware function that captures path params from the path
   * and sets them to the context if a route was matched
   *
   * @private
   * @return {function} middleware function
   */
  static createCaptureParams() {
    const captureParams = (ctx, next) => {
      const { matchedRoute: route } = ctx;

      if (route) {
        debug('capturing params');

        ctx.captures = route.capture(ctx.path);
        ctx.params = {
          ...ctx.params || {},
          ...route.constructParamsFromCaptures(ctx.captures),
        };
      }

      return next();
    };

    return captureParams;
  }

  /**
   * creates a middleware function that invokes the matched route if one
   * was matched
   *
   * @private
   * @return {function} middleware function
   */
  static createInvokeRoute() {
    const invokeRoute = (ctx, next) => {
      const { matchedRoute: route } = ctx;
      let promise;

      if (route) {
        debug('invoking route handler');

        promise = route.call(ctx, next);
      } else {
        promise = next();
      }

      return promise;
    };

    return invokeRoute;
  }

  /**
   * creates a middleware function that responds with 501 Not Implemented
   * when no route was matched and the HTTP method is not one that the router
   * has mapped.
   *
   * @private
   * @return {function} middleware function
   */
  static createNotImplementedHandler({ throw: canThrow, errorFactory, implementedMethods }) {
    const notImplementedHandler = (ctx, next) => {
      const { method } = ctx;
      if (ctx.matchedRoute) return next();
      if (implementedMethods[method] || method === 'OPTIONS') return next();

      debug('method %s is not implemented. implemented methods: %o', implementedMethods);

      if (canThrow) {
        throw errorFactory();
      } else {
        ctx.status = 501;
        ctx.set('Allow', Object.keys(implementedMethods).join(', '));
        return null;
      }
    };
    return notImplementedHandler;
  }

  /**
   * creates a middleware function that
   * 1. sets Allow headers for methods that the router can respond to for the
   * matched path from the request
   * 2. responds to OPTIONS requests that have no match with the available
   * matched route methods (matched path but not method—OPTIONS)
   * 3. responds with 405 Method Not Allowed when no route was matched by HTTP
   * method
   *
   * @private
   * @return {function} middleware function
   */
  static createAllowedMethodsHandler({ throw: canThrow, errorFactory }) {
    const allowedMethodsHandler = (ctx, next) => {
      const { method, matched } = ctx;
      const allowedMethodsString = matched.map(route => route.method).join(', ');

      if (ctx.matchedRoute) return next();

      debug('method %s not allowed. allowed methods: %o', allowedMethodsString);

      ctx.set('Allow', allowedMethodsString);

      if (method === 'OPTIONS') {
        ctx.status = 200;
        ctx.body = '';
        ctx.set('Content-Length', '0');
      } else if (canThrow) {
        throw errorFactory();
      } else {
        ctx.status = 405;
      }
      return next();
    };
    return allowedMethodsHandler;
  }

  /**
   * creates a route object from the provided args, adds it to the routes
   * stack, and registers the method as one that the router implements.
   *
   * @private
   * @param  {string} options.method  the HTTP method this route handles
   * @param  {string} options.path    the path this route matches
   * @param  {function} options.handler the handler function that will be used
   *                                    to handle the request when a request matches
   *                                    this route
   * @param  {string} options.name    a name to give to this route such that a path
   *                                  can be built later and found via this name
   * @return {Route}                 the uncompiled, registered route instance
   */
  register({
    method, path, handler, name,
  }) {
    const METHOD = method.toUpperCase();
    const route = new Route({
      name,
      path,
      handler,
      method: METHOD,
      ...this.routeOptions,
    });

    if (name) this.routesByName[name] = route;
    this.implementedMethods[METHOD] = true;
    this.routeStack.push(route);

    debug('registered method=%s path=%s name=%s', method, path, name);
    return route;
  }

  /**
   * getter that returns this router's middleware and all nested routers'
   * middleware in ordering of declaration / nesting (recursively)
   *
   * @private
   * @readonly
   * @return {function[]} array of middleware functions
   */
  get middleware() {
    return this.nestedRouters.reduce((acc, child) => (
      acc.concat(child.middleware)
    ), this._middleware);
  }
}

methods.concat('*').forEach((method) => {
  /**
   * adds a route to the router for the HTTP method matching this method name
   *
   * @example
   *
   * Add a GET handler for a path like /
   *
   * ```js
   * const router = new Router();
   * router.get('/', (ctx, next) => {
   *   // handle a `GET /` request
   * });
   * ```
   *
   * Add a POST handler for a path like /purchase
   *
   * ```js
   * const router = new Router();
   * router.post('/purchase', (ctx, next) => {
   *   // handle a `POST /purchase` request
   * });
   * ```
   *
   * Add a DELETE handler for a path like /photos/3
   *
   * ```js
   * const router = new Router();
   * router.delete('/photos/:id', (ctx, next) => {
   *   // handle a `DELETE /photos/1` request
   * });
   * ```
   *
   * ```js
   * const router = new Router();
   * router.all('/_health', (ctx, next) => {
   *   // handle a `{any HTTP method} /_health` request
   * });
   * ```
   *
   * etc...
   *
   * Full list of supported methods:
   * acl, bind, checkout, connect, copy, delete, get, head, link, lock,
   * m-search, merge, mkactivity, mkcalendar, mkcol, move, notify, options,
   * patch, post, propfind, proppatch, purge, put, rebind, report, search,
   * subscribe, trace, unbind, unlink, unlock, unsubscribe
   *
   * @memberOf Router
   * @instance
   * @name  Router#get|head|options|patch|post|put|delete|all
   * @param  {string} [name] the name of the route
   * @param {string} path the path that this route will handle
   * @param {...function} functions middleware functions that will be composed
   *                                and invoked when this route is matched in
   *                                a request cycle
   * @return {Router}         self
   */
  Router.prototype[method] = function declareRoute(...args) {
    let name;
    let path;
    let middleware;

    // regex not supported at this time
    if (typeof args[1] === 'string') {
      [name, path, ...middleware] = args;
    } else if (typeof args[0] === 'string' && args.slice(1).every(a => typeof a === 'function')) {
      [path, ...middleware] = args;
    } else if (Array.isArray(args[0])) {
      args.shift().forEach(_path => this[method](_path, ...args));
      return this;
    } else {
      throw new Error(`\
wrong argument signature. Please provide arguments in one of the following signatures:
router.${method}(name, path, () => {...})
or
router.${method}(path, () => {...})
or
router.${method}([path1, path2, path3, ...], () => {...})
`);
    }

    const handler = compose(middleware);

    this.register({
      method, path, handler, name,
    });

    return this;
  };
});

/**
 * @memberOf Router
 * @instance
 */
Router.prototype.all = Router.prototype['*'];
/**
 * @memberOf Router
 * @instance
 */
Router.prototype.del = Router.prototype.delete;

module.exports = Router;
