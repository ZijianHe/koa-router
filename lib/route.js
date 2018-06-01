const pathToRegexp = require('path-to-regexp');
const { URLSearchParams } = require('url');
const { decode } = require('./utils');

/**
 * @class
 */
class Route {
  /**
   * create a route object
   *
   * @param  {object} options={}
   * @param  {string} options.path      the path that this route handles
   *                                    (will be given to path-to-regexp)
   * @param  {function} options.handler   the function that handles this route
   * @param  {string} [options.name]      the name of this route
   * @param  {string} [options.prefix='']    the prefix for this route
   * @param  {boolean} [options.strict=false]    when set to `true`, this route will **not** match
   *                                             paths with a trailing slash `/`
   * @param  {boolean} [options.sensitive=false] whether matching is performed case sensitively
   */
  constructor({
    prefix, path, name, handlers = {}, strict = false, sensitive = false, terminal = true
  }) {
    this.strict = strict;
    this.sensitive = sensitive;
    this.handlers = handlers;
    /** @type {string} the path this route matches */
    this.path = `${prefix || ''}${path === '*' && prefix ? '(/*|/.*)' : path}`;
    /** @type {?string} name of this route */
    this.name = name;
    this.keys = [];
    this.regex = pathToRegexp(this.path, this.keys, {
      strict: this.strict,
      sensitive: this.sensitive,
      end: this.terminal,
    });
    this.toPath = pathToRegexp.compile(this.path);
  }

  addHandler(method, handler) {
    return this.handlers[method.toUpperCase()] = handler;
  }

  /**
   * invoke the route's handler and return its return value
   *
   * @param  {...mixed} args
   * @private
   * @return {mixed}
   */
  call(ctx, next) {
    if (ctx.matchedRoute !== this) return next();
    // test path?
    // capture?
    // allowed methods for OPTIONS
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
    // return this.handler(...args);
  }

  /**
   * exec the route regex on a path and capture any params
   *
   * @private
   * @example
   *
   * ```js
   * const route = new Route({ path: '/users/:id', method: 'GET' });
   * const captures = route.capture('/users/1');
   * // => [ '1' ]
   * ```
   *
   * @param  {string} path the path to match against
   * @return {Array}      array of matched segments
   */
  capture(path) {
    return this.regex.exec(path).slice(1);
  }

  /**
   * test to see if this route matches the provided path
   *
   * @private
   * @param  {string} path the path to test
   * @return {boolean}      whether the provided path matches this route
   */
  test(path) {
    return this.regex.test(path);
  }

  /**
   * test to see if this route's method matches the provided method
   *
   * @private
   * @param  {string} method the http method to test
   * @return {boolean}        whether this route handles the provided method or not
   */
  handles(method) {
    return this.handlers['*'] || this.handlers[method.toUpperCase()];
  }

  /**
   * accepts a prefix and returns a new route compiled with the prefix
   * this allows the route to be prefixed and used within various environments
   * without modifying the route itself
   *
   * @private
   * @param {string} prefix the prefix to compile this route with
   * @return {route} a new route with the given prefix
   */
  compile({ prefix }) {
    const compiled = new Route({ ...this, prefix });
    const middleware = (...args) => compiled.call(...args);

    middleware.route = compiled;

    return middleware;
  }

  toMiddleware() {

  }

  /**
   * given an array of captures from [Route#capture]{@link Route#capture}, this
   * method returns an object of key-value pairs in which the values are
   * URI-decoded
   *
   * @private
   * @example
   *
   * ```js
   * const route = new Route({ path: '/users/:id', method: 'GET' });
   * const captures = route.capture('/users/1');
   * // => [ '1' ]
   * route.constructParamsFromCaptures(captures);
   * // => { id: 1 }
   * ```
   *
   * @param {Array} captures captures from the matched path
   * @return {object} key-value pairs for the captures (param name) and their values
   */
  constructParamsFromCaptures(captures) {
    return captures.reduce((memo, value, i) => ({
      ...memo,
      [this.keys[i].name]: decode(value),
    }), {});
  }

  /**
   * filters the given object for params that do not appear in the path itself by name and
   * returns a querystring of those params (key value pairs)
   *
   * @example
   *
   * For a route such as `/users/:id/photos`, the `id` param should be included in the path itself.
   * Any other params that need to be included in this path must appear in the query string.
   *
   * ```js
   * const route = new Route({ path: '/users/:id/photos', method: 'GET' });
   * route.queryString({ id: 1, page: 2, per_page: 20 });
   * // => 'page=2&per_page=20'
   * ````
   *
   * @see  Route#toPathWithParams
   * @private
   * @param  {object} params an object of key value pairs to be included in the query string
   *                         if they aren't present in the path-interpolated params
   * @return {string}        the query string of params that fall outside of the path
   */
  queryString(params) {
    const routeKeyNames = this.keyNames;
    const query = new URLSearchParams();

    Object.keys(params)
      .filter(key => !routeKeyNames.includes(key))
      .forEach(key => query.append(key, params[key]));

    return query.toString();
  }

  /**
   * the names of all of the path-to-regexp keys from the route's path
   *
   * @private
   * @return {string[]}
   */
  get keyNames() {
    return this.keys.map(key => key.name);
  }

  /**
   * returns a path built with the provided params (if any)
   *
   * @param  {...params} params the positional params to interpolate into the path
   *                            in order of appearance
   */
  toPathWithParams(...args) {
    let params;

    if (args.length === 1 && (isPlainObject(args[0]) || typeof args[0] === 'undefined')) {
      [params] = args;
    } else if (args.length >= this.keys.length) {
      params = this.makeParamsFromPositionalArgs(args);
    } else {
      throw new Error(`wrong number of param arguments for route: ${args.length} for ${this.keys.length}`);
    }

    return [
      this.toPath(params),
      this.queryString(params),
    ].filter(i => i).join('?');
  }

  makeParamsFromPositionalArgs(args) {
    const params = {};
    this.keys.forEach((key, i) => { params[key.name] = args[i]; });
    return params;
  }
}

module.exports = Route;

function isPlainObject(thing) {
  return {}.toString.call(thing) === '[object Object]';
}
