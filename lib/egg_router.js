'use strict';

const is = require('is-type-of');
const Router = require('./router');
const utility = require('utility');
const inflection = require('inflection');
const assert = require('assert');
const utils = require('./utils');

const METHODS = [ 'head', 'options', 'get', 'put', 'patch', 'post', 'delete' ];

const REST_MAP = {
  index: {
    suffix: '',
    method: 'GET',
  },
  new: {
    namePrefix: 'new_',
    member: true,
    suffix: 'new',
    method: 'GET',
  },
  create: {
    suffix: '',
    method: 'POST',
  },
  show: {
    member: true,
    suffix: ':id',
    method: 'GET',
  },
  edit: {
    member: true,
    namePrefix: 'edit_',
    suffix: ':id/edit',
    method: 'GET',
  },
  update: {
    member: true,
    namePrefix: '',
    suffix: ':id',
    method: ['PATCH', 'PUT'],
  },
  destroy: {
    member: true,
    namePrefix: 'destroy_',
    suffix: ':id',
    method: 'DELETE',
  },
};

/**
 * FIXME: move these patch into @eggjs/router
 */
class EggRouter extends Router {

  /**
   * @constructor
   * @param {Object} opts - Router options.
   * @param {Application} app - Application object.
   */
  constructor(opts, app) {
    super(opts);
    this.app = app;
    this.patchRouterMethod();
  }

  patchRouterMethod() {
    // patch router methods to support generator function middleware and string controller
    METHODS.concat(['all']).forEach(method => {
      this[method] = (...args) => {
        const splited = spliteAndResolveRouterParams({ args, app: this.app });
        // format and rebuild params
        args = splited.prefix.concat(splited.middlewares);
        return super[method](...args);
      };
    });
  }

  /**
   * Create and register a route.
   * @param {String} path - url path
   * @param {Array} methods - Array of HTTP verbs
   * @param {Array} middlewares -
   * @param {Object} opts -
   * @return {Route} this
   */
  register(path, methods, middlewares, opts) {
    // patch register to support generator function middleware and string controller
    middlewares = Array.isArray(middlewares) ? middlewares : [middlewares];
    middlewares = convertMiddlewares(middlewares, this.app);
    path = Array.isArray(path) ? path : [path];
    path.forEach(p => super.register(p, methods, middlewares, opts));
    return this;
  }

  /**
   * restful router api
   * @param {String} name - Router name
   * @param {String} prefix - url prefix
   * @param {Function} middleware - middleware or controller
   * @example
   * ```js
   * app.resources('/posts', 'posts')
   * app.resources('posts', '/posts', 'posts')
   * app.resources('posts', '/posts', app.role.can('user'), app.controller.posts)
   * ```
   *
   * Examples:
   *
   * ```js
   * app.resources('/posts', 'posts')
   * ```
   *
   * yield router mapping
   *
   * Method | Path            | Route Name     | Controller.Action
   * -------|-----------------|----------------|-----------------------------
   * GET    | /posts          | posts          | app.controller.posts.index
   * GET    | /posts/new      | new_post       | app.controller.posts.new
   * GET    | /posts/:id      | post           | app.controller.posts.show
   * GET    | /posts/:id/edit | edit_post      | app.controller.posts.edit
   * POST   | /posts          | posts          | app.controller.posts.create
   * PATCH  | /posts/:id      | post           | app.controller.posts.update
   * DELETE | /posts/:id      | post           | app.controller.posts.destroy
   *
   * app.router.url can generate url based on arguments
   * ```js
   * app.router.url('posts')
   * => /posts
   * app.router.url('post', { id: 1 })
   * => /posts/1
   * app.router.url('new_post')
   * => /posts/new
   * app.router.url('edit_post', { id: 1 })
   * => /posts/1/edit
   * ```
   * @return {Router} return route object.
   * @since 1.0.0
   */
  resources(...args) {
    const splited = spliteAndResolveRouterParams({ args, app: this.app });
    const middlewares = splited.middlewares;
    // last argument is Controller object
    const controller = splited.middlewares.pop();

    let name = '';
    let prefix = '';
    if (splited.prefix.length === 2) {
      // router.get('users', '/users')
      name = splited.prefix[0];
      prefix = splited.prefix[1];
    } else {
      // router.get('/users')
      prefix = splited.prefix[0];
    }

    for (const key in REST_MAP) {
      const action = controller[key];
      if (!action) continue;

      const opts = REST_MAP[key];
      let formatedName;
      if (opts.member) {
        formatedName = inflection.singularize(name);
      } else {
        formatedName = inflection.pluralize(name);
      }
      if (opts.namePrefix) {
        formatedName = opts.namePrefix + formatedName;
      }
      prefix = prefix.replace(/\/$/, '');
      const path = opts.suffix ? `${prefix}/${opts.suffix}` : prefix;
      const method = Array.isArray(opts.method) ? opts.method : [opts.method];
      this.register(path, method, middlewares.concat(action), { name: formatedName });
    }

    return this;
  }

  /**
   * @param {String} name - Router name
   * @param {Object} params - more parameters
   * @example
   * ```js
   * router.url('edit_post', { id: 1, name: 'foo', page: 2 })
   * => /posts/1/edit?name=foo&page=2
   * router.url('posts', { name: 'foo&1', page: 2 })
   * => /posts?name=foo%261&page=2
   * ```
   * @return {String} url by path name and query params.
   * @since 1.0.0
   */
  url(name, params) {
    const route = this.route(name);
    if (!route) return '';

    const args = params;
    let url = route.path;

    assert(!is.regExp(url), `Can't get the url for regExp ${url} for by name '${name}'`);

    const queries = [];
    if (typeof args === 'object' && args !== null) {
      const replacedParams = [];
      url = url.replace(/:([a-zA-Z_]\w*)/g, function ($0, key) {
        if (utility.has(args, key)) {
          const values = args[key];
          replacedParams.push(key);
          return utility.encodeURIComponent(Array.isArray(values) ? values[0] : values);
        }
        return $0;
      });

      for (const key in args) {
        if (replacedParams.includes(key)) {
          continue;
        }

        const values = args[key];
        const encodedKey = utility.encodeURIComponent(key);
        if (Array.isArray(values)) {
          for (const val of values) {
            queries.push(`${encodedKey}=${utility.encodeURIComponent(val)}`);
          }
        } else {
          queries.push(`${encodedKey}=${utility.encodeURIComponent(values)}`);
        }
      }
    }

    if (queries.length > 0) {
      const queryStr = queries.join('&');
      if (!url.includes('?')) {
        url = `${url}?${queryStr}`;
      } else {
        url = `${url}&${queryStr}`;
      }
    }

    return url;
  }

  pathFor(name, params) {
    return this.url(name, params);
  }
}

/**
 * 1. split (name, url, ...middleware, controller) to
 * {
 *   prefix: [name, url]
 *   middlewares [...middleware, controller]
 * }
 *
 * 2. resolve controller from string to function
 *
 * @param  {Object} options inputs
 * @param {Object} options.args router params
 * @param {Object} options.app egg application instance
 * @return {Object} prefix and middlewares
 */
function spliteAndResolveRouterParams({ args, app }) {
  let prefix;
  let middlewares;
  if (args.length >= 3 && (is.string(args[1]) || is.regExp(args[1]))) {
    // app.get(name, url, [...middleware], controller)
    prefix = args.slice(0, 2);
    middlewares = args.slice(2);
  } else {
    // app.get(url, [...middleware], controller)
    prefix = args.slice(0, 1);
    middlewares = args.slice(1);
  }
  // resolve controller
  const controller = middlewares.pop();
  middlewares.push(resolveController(controller, app));
  return { prefix, middlewares };
}

/**
 * resolve controller from string to function
 * @param  {String|Function} controller input controller
 * @param  {Application} app egg application instance
 * @return {Function} controller function
 */
function resolveController(controller, app) {
  if (is.string(controller)) {
    const actions = controller.split('.');
    let obj = app.controller;
    actions.forEach(key => {
      obj = obj[key];
      if (!obj) throw new Error(`controller '${controller}' not exists`);
    });
    controller = obj;
  }
  // ensure controller is exists
  if (!controller) throw new Error('controller not exists');
  return controller;
}

/**
 * 1. ensure controller(last argument) support string
 * - [url, controller]: app.get('/home', 'home');
 * - [name, url, controller(string)]: app.get('posts', '/posts', 'posts.list');
 * - [name, url, controller]: app.get('posts', '/posts', app.controller.posts.list);
 * - [name, url(regexp), controller]: app.get('regRouter', /\/home\/index/, 'home.index');
 * - [name, url, middleware, [...], controller]: `app.get(/user/:id', hasLogin, canGetUser, 'user.show');`
 *
 * 2. make middleware support generator function
 *
 * @param  {Array} middlewares middlewares and controller(last middleware)
 * @param  {Application} app  egg application instance
 * @return {Array} middlewares
 */
function convertMiddlewares(middlewares, app) {
  // ensure controller is resolved
  const controller = resolveController(middlewares.pop(), app);
  // make middleware support generator function
  middlewares = middlewares.map(utils.middleware);
  const wrappedController = (ctx, next) => {
    return utils.callFn(controller, [ctx, next], ctx);
  };
  return middlewares.concat([wrappedController]);
}

module.exports = EggRouter;
