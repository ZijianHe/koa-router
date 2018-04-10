/**
 * RESTful resource routing middleware for koa.
 *
 * @author Alex Mingoia <talk@alexmingoia.com>
 * @author Josh Bielick <jbielick@gmail.com>
 * @link https://github.com/alexmingoia/koa-router
 */

const compose = require('koa-compose');
const methods = require('methods');
const debug = require('debug')('koa-router');
const Route = require('./route');
const inspect = require('./inspect');

// TODO
// should interpolate params be hoisted up?
// if a path comes in, really long, later param portions interpolated by deeply
// nested router, should the top router interpolate all of them?
//
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
  constructor(options = {}) {
    this._prefix = options.prefix || '';
    this.name = options.name;
    this._middleware = [];
    this.children = [];
    this.paramHandlers = {};
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
    this._prefix = path;
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
    this._middleware.push(...fns);
    return this;
  }

  /**
   * [nest description]
   * @param  {string=} prefix a prefix that will prepend all route paths
   * @param  {Router} child  a router to nest within this router
   * @return {Router}        the router
   */
  nest(prefixOrChild, childOrNull) {
    let child;
    let prefix;

    if (prefixOrChild && typeof childOrNull === 'undefined') {
      child = prefixOrChild;
    } else {
      prefix = prefixOrChild;
      child = childOrNull;
      // @TODO make middleware from nested conditional to the prefix
      child = new Router({
        prefix,
        name: `${child.name || 'anonymous'} (wrapper at ${prefix})`,
      }).nest(child);
    }
    this.children.push(child);
    this.routingStack.push(child);
    return this;
  }

  /**
   * [param description]
   * @param  {string=} name    the name of the path param to interpolate when found
   * @param  {Function} handler the async function to call when a the path param is found
   * @return {Router}         the router
   */
  param(name, handler) {
    this.paramHandlers[name] = handler;
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
  // static url() {

  // }

  /**
   * [path description]
   * @param  {[type]}    name [description]
   * @param  {...[type]} args [description]
   * @return {[type]}         [description]

  path(name, ...args) {
    const route = this.route(name);

    if (!route) {
      return;
    }

    return route.path(...args);
  }

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
  compile({ prefix = '', paramHandlers = {} } = {}) {
    const compiled = this.routingStack.reduce(
      (accumulator, routeOrRouter) => (
        accumulator.concat(routeOrRouter.compile({
          prefix: `${prefix}${this.prefix}`,
          paramHandlers: {
            // specificity goes to the parent?
            ...this.paramHandlers,
            ...paramHandlers,
          },
        }))
      ),
      [],
    );

    debug(
      'compiling %s router prefix=%o routes=%i',
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
  static createFinder(compiledRoutes) {
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
  createDispatch(find) {
    const dispatch = (ctx, next) => {
      let then;
      const { method, routerPath, path } = ctx;
      ctx.router = this;

      debug('dispatching %s %s', method, path);
      const matched = find(method, routerPath || path);

      if (matched) {
        ctx.matchedRoute = matched;
        // backwards compatibility
        ctx._matchedRoute = matched.path;
        ctx._matchedRouteName = matched.name;

        then = matched.call(ctx, next);
      } else {
        // skip routes, pass to koa to 404
        then = next();
      }
      return then;
    };
    dispatch._name = this.name || 'koa-router';

    return dispatch;
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
  register({
    method,
    path,
    handler,
    name,
  }) {
    const route = new Route({
      name,
      path,
      handler,
      method: method.toUpperCase(),
    });

    if (name) this.stackByName[name] = route;
    this.routingStack.push(route);

    debug('registered %s %s name=%s', method, path, name);
    return route;
  }


  /**
   * [routes description]
   * @return {Function} dispatch function to mount on your koa application that
   *                             will handle route matching and dispatching
   *                             to the appropriate middleware and route
   */
  routes() {
    // if you have a middleware with a regex, and that middleware does not yield to next,
    // does that prevent the request from reaching a matching route?
    const compiledRoutes = this.compile();
    const finder = Router.createFinder(compiledRoutes);
    const dispatch = this.createDispatch(finder);

    return compose([...this.middleware, /* param handlers? */dispatch]);
  }

  // allowedMethods() {
  //   return (ctx, next) => next();
  // }

  toString(humanReadable = false) {
    return humanReadable ? inspect(this) : this.toString();
  }
}

methods.concat('*').forEach((method) => {
  Router.prototype[method] = function routeHandler(...args) {
    let name;
    let path;
    const firstArg = args.shift();

    if (typeof firstArg === 'string' && typeof args[0] === 'string') {
      name = firstArg;
      path = args.shift();
    } else if (typeof firstArg === 'string') {
      path = firstArg;
    }

    this.register({
      name,
      path,
      handler: compose(args),
      method: method.toUpperCase(),
    });

    return this;
  };;
});

Router.prototype.all = Router.prototype['*'];
Router.prototype.del = Router.prototype.delete;

module.exports = Router;
