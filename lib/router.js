/**
 * RESTful resource routing middleware for koa.
 *
 * @author Alex Mingoia <talk@alexmingoia.com>
 * @author Josh Bielick <jbielick@gmail.com>
 * @link https://github.com/alexmingoia/koa-router
 */

const compose = require('koa-compose');
const pathToRegexp = require('path-to-regexp');
const methods = require('methods');
const debug = require('debug')('koa-router');

// TODO
// should interpolate params be hoisted up?
// if a path comes in, really long, later param portions interpolated by deeply
// nested router, should the top router interpolate all of them?
//
// keep a cache of named routes? so lookup is easy from a router before its
// been compiled?

class Route {
  constructor({ method, path, handler, name }) {
    this.name = name;
    this.method = method.toUpperCase();
    this.path = path;
    this.handler = handler;
  }
  compile(prefix, middleware, paramHandlers) {
    const { method, path, handler } = this;
    return new CompiledRoute({
      prefix,
      method,
      path,
      handler,
      middleware,
      paramHandlers
    });
  }
}

class CompiledRoute extends Route {
  constructor({ prefix, path, middleware, paramHandlers, ...rest }) {
    super({ path: `${prefix || ''}${path}`, ...rest });
    this.paramHandlers = paramHandlers;
    this.middleware = middleware;
    this.prefix = prefix || '';
    this.regex = pathToRegexp(this.path);
    this.call = compose([
      this.paramsMiddleware(),
      ...middleware,
      this.handler
    ]);
  }
  test(method, path) {
    return method.toUpperCase() == this.method && this.regex.test(path);
  }
  paramsMiddleware() {
    const paramsMiddleware = async (ctx, next) => {
      const { path } = ctx;
      ctx.captures = this.regex.exec(path).slice(1);
      ctx.params = {
        ...ctx.params,
        ...this.params(path, ctx.captures)
      };
      return compose(
        this.regex.keys.map((key) => {
          console.log(key.name, this.paramHandlers);
          return this.paramHandlers[key.name];
        })
      )(ctx, next);
    };
    return paramsMiddleware;
  }
  params(path, captures) {
    return captures.reduce((memo, value, i) => {
      let key = this.regex.keys[i];
      if (key) memo[key.name] = value ? safeDecodeURIComponent(value) : value;
      return memo;
    }, {});
  }
}

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
    this.prefix = options.prefix;
    this.name = options.name;
    this.children = [];
    this.middleware = [];
    this.definedRoutes = [];
    this.paramHandlers = {};
  }

  /**
   * [nest description]
   * @param  {string=} prefix a prefix that will prepend all route paths
   * @param  {Router} child  a router to nest within this router
   * @return {Router}        the router
   */
  nest(prefix, child) {
    if (prefix && !child) {
      this.children.push(prefix);
    } else {
      let name =  `${child.name || 'anonymous'} (nested at ${prefix})`;
      this.children.push(new Router({ prefix, name }).nest(child));
    }
    return this;
  }
  /**
   * [use description]
   * @param  {string=}   path a path that should be matched in order for this
   *                          middleware to run
   * @param  {Function} fn   a middleware function to invoke
   * @return {Router}        the router
   */
  use(/* path, */fn) {
    this.middleware.push(fn);
    return this;
  }

  prefix(path) {
    this.prefix = prefix;
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

  all(...args) {
    methods.forEach(method => this[method].call(this, ...args));
    return this;
  }

  static url() {

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

    // @TODO add stack of param interpolators to middleware here

    paramHandlers = { ...paramHandlers, ...this.paramHandlers };
    middleware = middleware.concat(this.middleware);
    prefix = `${prefix}${this.prefix || ''}`

    let routes = this.definedRoutes.map((route) => {
      // build param, mw, handler stack for each route, not at runtime
      return route.compile(prefix, middleware, paramHandlers);
    });

    this.children.forEach((nestedRouter) => {
      routes = routes.concat(nestedRouter.compileRoutes({
        parent: this,
        middleware,
        paramHandlers,
        prefix
      }));
    });

    return routes;
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
    const lifoCompiledRoutes = this.compileRoutes().reverse();
    const dispatch = async (ctx, next) => {
      const { method, path } = ctx;
      ctx.router = this;
      debug('dispatch %s %s', method, path);
      const matched = lifoCompiledRoutes.find((route) => route.test(method, path));
      if (matched) {
        ctx.matchedRoute = matched;
        // backwards compatibility
        ctx._matchedRoute = matched.path;
        ctx._matchedRouteName = matched.name;
        return matched.call(ctx);
      } else {
        // throw no route matches?
        return next();
      }
    };
    return dispatch;
  }
}

methods.forEach((method) => {
  Router.prototype[method] = function (...args) {
    let name;
    let path;
    let handler;

    if (args.length === 3) {
      [ name, path, handler ] = args;
    } else {
      [ path, handler ] = args;
    }

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
