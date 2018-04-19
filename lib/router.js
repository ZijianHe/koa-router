/**
 * RESTful resource routing middleware for koa.
 *
 * @author Josh Bielick <jbielick@gmail.com>
 * @author Alex Mingoia <talk@alexmingoia.com>
 * @link https://github.com/alexmingoia/koa-router
 */

const compose = require('koa-compose');
const methods = require('methods');
const debug = require('debug')('koa-router');
const Route = require('./route');

// keep a cache of named routes? so lookup is easy from a router before its
// been compiled?

class Router {
  /**
   * Create a new router.
   *
   * @example
   *
   * Basic usage:
   *
   * ```javascript
   * var Koa = require('koa');
   * var Router = require('koa-router');
   *
   * var app = new Koa();
   * var router = new Router();
   *
   * router.get('/', (ctx, next) => {
   *   // ctx.router available
   * });
   *
   * app
   *   .use(router.routes())
   *   .use(router.allowedMethods());
   * ```
   *
   * @alias module:koa-router
   * @param {Object=} options
   * @param {String=} options.prefix prefix router paths
   */
  constructor({ name, prefix } = {}) {
    this._prefix = prefix || '';
    this.name = name;
    this._middleware = [];
    this.children = [];
    this.routingStack = [];
    this.stackByName = {};
  }

  get middleware() {
    return this.children.reduce((acc, child) => (
      acc.concat(child.middleware)
    ), this._middleware);
  }

  get prefix() {
    return this._prefix;
  }

  setPrefix(path) {
    this._prefix = path || '';
    return this;
  }

  /**
   * [use description]
   * @param  {string=}   path a path that should be matched in order for this
   *                          middleware to run
   * @param  {Function} fn   a middleware function to invoke
   * @return {Router}        the router
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
   * [nest description]
   * @param  {string=} prefix a prefix that will prepend all route paths
   * @param  {Router} child  a router to nest within this router
   * @return {Router}        the router
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

    this.children.push(child);
    this.routingStack.push(child);

    return this;
  }

  static wrapNested(prefix, router) {
    const wrapped = new Router({ prefix, name: `${prefix} prefix` });

    wrapped.isWrapper = true;
    wrapped.nest(router);

    return wrapped;
  }

  /**
   * [param description]
   * @param  {string=} name    the name of the path param to interpolate when found
   * @param  {Function} handler the async function to call when a the path param is found
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

  /**
   * [route description]
   * @param  {[type]} name [description]
   * @return {[type]}      [description]
   */
  route(name) {
    return this.stackByName[name];
  }

  /**
   * [url description]
   * @return {[type]} [description]
   */
  static url(path, params) {
    return new Route({ path, method: '' }).toPath(params);
  }

  path(name, ...args) {
    const route = this.route(name);
    if (!route) throw new Error(`Failed to generate path: route ${name} not found`);

    return route.path(...args);
  }

  /**
   * [url description]
   * @param  {...[type]} args [description]
   * @deprecated
   * @return {[type]}         [description]
   */
  url(...args) {
    // @TODO dep warning
    return this.path(...args);
  }

  /**
   * Compile the route stack for the current state of this router and its
   * nested routers. Snapshots the middleware, param handlers, and routes into
   * an array
   *
   * @private
   */
  compile({ prefix = '' } = {}) {
    const compiled = this.routingStack.reduce(
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
   * [createFinder description]
   * @private
   * @param  {[type]} compiledRoutes [description]
   * @return {[type]}                [description]
   */
  createFinder() {
    const compiledRoutes = this.compile();

    const find = (method, path) => (
      compiledRoutes.find(route => route.test(method, path))
    );

    find.routes = compiledRoutes;

    return find;
  }

  /**
   * [createDispatch description]
   * @private
   * @param  {[type]} find [description]
   * @return {[type]}      [description]
   */
  static createDispatch(router) {
    const findMatchedRoute = router.createFinder();
    const dispatch = (ctx, next) => {
      const { method, routerPath, path } = ctx;

      ctx.router = router;

      debug('dispatching %s %s', method, path);
      const matched = findMatchedRoute(method, routerPath || path);

      if (matched) {
        ctx.matchedRoute = matched;

        // backwards compatibility
        ctx._matchedRoute = matched.path;
        ctx._matchedRouteName = matched.name;

        debug('matched route name=%s path=%s', matched.name, matched.path);
      } else {
        debug('no route matched');
      }

      return next();
    };

    return dispatch;
  }

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
   * [register description]
   * @private
   * @param  {string} options.method  the HTTP method this route handles
   * @param  {string} options.path    the path this route matches
   * @param  {function} options.handler the handler function that will be used
   *                                    to handle the request when a request matches
   *                                    this route
   * @param  {string} options.name    a name to give to this route such that a url
   *                                  can be built later and found via this name
   * @return {Route}                 the uncompiled, registered route instance
   */
  register(method, path, handler, { name } = {}) {
    const route = new Route({
      name,
      path,
      handler,
      method: method.toUpperCase(),
    });

    if (name) this.stackByName[name] = route;
    this.routingStack.push(route);

    debug('registered method=%s path=%s name=%s', method, path, name);
    return route;
  }


  /**
   * [routes description]
   * @return {Function} dispatch function to mount on your koa application that
   *                             will handle route matching and dispatching
   *                             to the appropriate middleware and route
   */
  routes() {
    const composed = compose([
      Router.createDispatch(this),
      Router.createCaptureParams(),
      ...this.middleware,
      Router.createInvokeRoute(),
    ]);

    composed._name = this.name || 'koa-router';

    return composed;
  }

  // allowedMethods() {
  //   return (ctx, next) => next();
  // }
}

methods.concat('*').forEach((method) => {
  Router.prototype[method] = function routeHandler(...args) {
    let name;
    let path;
    let middleware;

    if (typeof args[0] === 'string' && typeof args[1] === 'string') {
      [name, path, ...middleware] = args;
    // no name provided, regex not supported at this time
    } else if (typeof args[0] === 'string') {
      [path, ...middleware] = args;
    }

    const handler = compose(middleware);

    this.register(method.toUpperCase(), path, handler, { name });

    return this;
  };
});

Router.prototype.all = Router.prototype['*'];
Router.prototype.del = Router.prototype.delete;

module.exports = Router;
