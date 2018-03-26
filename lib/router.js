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
    this.middleware = [];
    this.children = [];
    this.definedRoutes = [];
    this.paramHandlers = {};
  }

  prefix(path) {
    this._prefix = path;
    return this;
  }

  /**
   * [nest description]
   * @param  {string=} prefix a prefix that will prepend all route paths
   * @param  {Router} child  a router to nest within this router
   * @return {Router}        the router
   */
  nest(prefix, child) {
    if (prefix && !child) {
      child = prefix;
    } else {
      let name = `${child.name || 'anonymous'} (wrapper at ${prefix})`;
      // @TODO make middleware from nested conditional to the prefix
      child = new Router({ prefix, name }).nest(child);
    }
    this.children.push(child);
    this.definedRoutes.push(child);
    return this;
  }
  /**
   * [use description]
   * @param  {string=}   path a path that should be matched in order for this
   *                          middleware to run
   * @param  {Function} fn   a middleware function to invoke
   * @return {Router}        the router
   */
  use(/* prefix, */...fns) {
    if (typeof fns[0] === 'string') {
      this.register({
        method: '*',
        path: fns.shift(),
        handler: compose(fns)
      });
    } else {
      this.middleware = this.middleware.concat(fns);
    }
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

  // how is this any different?
  // I guess it doesn't 404  / not match a route when all is said and done?
  all(...args) {
    return this.use(...args);
  }

  static url() {

  }

  url() {

  }

  /**
   * [compileRoutes description]
   * @param  {Object} accumulator the context to accumulate all ancestors middleware,
   *                              param handlers, and prefixes while constructing
   *                              nested routers
   * @return {Array<CompiledRoute>}             an array of compiled routes (this
   *                                               routers routes and all of those from
   *                                               its nested routers)
   */
  compileRoutes(accumulator = {}) {
    let { parent, middleware = [], paramHandlers = {}, prefix = '' } = accumulator;
    debug('compile %s router prefix=%o', this.name || 'anonymous', prefix);

    paramHandlers = { ...paramHandlers, ...this.paramHandlers };
    middleware = middleware.concat(this.middleware);
    prefix = `${prefix}${this._prefix}`

    return this.definedRoutes.reduce((acc, object) => {
      if (object instanceof Router) {
        acc = acc.concat(
          object.compileRoutes({
            parent: this,
            middleware,
            paramHandlers,
            prefix
          })
        );
      } else {
        // @TODO add param handlers and middleware somehwere to the stack since its not in the route anymore
        // because middleware should always run and have the ability to match a path
        acc.push(object.compileWithPrefix(prefix));
      }
      return acc;
    }, []);
  }

  /**
   * [register description]
   * @param  {string} options.method  the HTTP method this route handles
   * @param  {string} options.path    the path this route matches
   * @param  {function} options.handler the handler function that will be used
   *                                    to handle the request when a request matches
   *                                    this route
   * @param  {string} options.name    a name to give to this route such that a url
   *                                  can be built later and found via this name
   * @return {Route}                 the uncompiled, registered route instance
   */
  register({ method, path, handler, name}) {
    const route = new Route({ name, path, handler, method: method.toUpperCase() });
    debug('register %s %s name=%s', method, path, name);
    this.definedRoutes.push(route);
    return route;
  }

  /**
   * [routes description]
   * @return {Function} dispatch function to mount on your koa application that
   *                             will handle route matching and dispatching
   *                             to the appropriate middleware and route
   */
  routes() {
    // if you have a middleware with a prefix, and that middleware does not yield to next,
    // does that prevent the request from reaching a matching route?
    const middleware = compose(this.middleware);
    const lifoCompiledRoutes = this.compileRoutes();
    const dispatch = async (ctx, next) => {
      const { method } = ctx;
      const path = ctx.routerPath || ctx.path;
      ctx.router = this;
      debug('dispatch %s %s', method, path);
      const matched = lifoCompiledRoutes.find((route) => route.test(method, path));
      ctx.matchedRoute = matched;
      if (matched) {
        // backwards compatibility
        ctx._matchedRoute = matched.path;
        ctx._matchedRouteName = matched.name;
      }

      await middleware(ctx);

      if (matched) {
        return matched.call(ctx);
      } else {
        // throw no route matches?
        return next();
      }
    };
    dispatch.router = this;
    dispatch._name = this.name || 'koa-router';
    return dispatch;
  }

  allowedMethods() {
    return (ctx, next) => {
      return next();
    }
  }

  toString(humanReadable = false) {
    return humanReadable ? inspect(this) : this.toString();
  }
}

methods.forEach((method) => {
  Router.prototype[method] = function (...args) {
    let name;
    let path;
    let handlers;
    const one = args.shift();

    if (typeof one === 'string' && typeof args[0] === 'string') {
      name = one;
      path = args.shift();
    } else if (typeof one === 'string') {
      path = one;
    }

    const handler = compose(args);
    this.register({ name, path, handler, method });

    return this;
  };
});

Router.prototype.del = Router.prototype['delete'];

module.exports = Router;


function safeDecodeURIComponent(text) {
  try {
    return decodeURIComponent(text);
  } catch (e) {
    return text;
  }
}
