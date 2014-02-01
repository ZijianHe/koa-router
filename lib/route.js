/**
 * Dependencies
 */

var compose = require('koa-compose')
  , debug = require('debug')('koa-router')
  , pathToRegexp = require('path-to-regexp');

/**
 * Initialize a new Route with given `method`, `path`, and `middleware`.
 *
 * @param {String|Array} method HTTP verb or array of verbs.
 * @param {String|RegExp} path Path string or regular expression.
 * @param {Function|Array} middleware Route callback/middleware or series of.
 * @return {Route}
 * @api private
 */

function Route(methods, path, middleware) {
  if (typeof methods == 'string') {
    methods = [methods];
  }

  if (typeof middleware == 'function') {
    middleware = Array.prototype.slice.call(arguments, 2);
  }

  this.methods = [];
  methods.forEach(function(method) {
    this.methods.push(method.toUpperCase());
  }, this);

  this.params = [];

  if (path instanceof RegExp) {
    this.path = path.source;
    this.regexp = path;
  }
  else {
    this.path = path;
    this.regexp = pathToRegexp(path, this.params);
  }

  this.middleware = compose(middleware);

  debug('defined route %s %s', this.methods, this.path);
};

/**
 * Expose `Route`.
 */

module.exports = Route;

/**
 * Route prototype
 */

var route = Route.prototype;

/**
 * Check if given request `path` matches route,
 * and if so populate `route.params`.
 *
 * @param {String} path
 * @param {Array} params used to store matched params
 * @return {Boolean}
 * @api private
 */

route.match = function(path, params) {
  if (this.regexp.test(path)) {
    var captures = [];

    // save route capture groups
    var matches = path.match(this.regexp);
    if (matches && matches.length > 0) {
      captures = matches.slice(1);
    }

    if (this.params.length) {
      // If route has parameterized capture groups,
      // use parameter names for properties
      for (var len = captures.length, i=0; i<len; i++) {
        if (this.params[i]) {
          params[this.params[i].name] = captures[i];
        }
      }
    }
    else {
      for (var i=0, len=captures.length; i<len; i++) {
        params[i] = captures[i];
      }
    }

    return true;
  }

  return false;
};
