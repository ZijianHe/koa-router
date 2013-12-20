/**
 * Dependencies
 */

var compose = require('koa-compose')
  , debug = require('debug')('koa-router')
  , pathToRegexp = require('path-to-regexp');

/**
 * Initialize a new Route with given `method`, `path`, and `middleware`.
 *
 * @param {String|Array} method HTTP verb string or array of verbs.
 * @param {String|RegExp} path Path string or regular expression.
 * @param {Function|Array} middleware Route callback/middleware or series of.
 * @return {Route}
 * @api private
 */

function Route(methods, path, middleware) {
  if (typeof methods == 'string') methods = [methods];
  if (typeof middleware == 'function') {
    middleware = Array.prototype.slice.call(arguments, 2);
  }
  this.methods = [];
  for (var len = methods.length, i=0; i<len; i++) {
    this.methods.push(methods[i].toUpperCase());
  }
  this.paramNames = [];
  this.paramsArray = [];
  this.params = {};
  if (path instanceof RegExp) {
    this.path = path.source;
    this.regexp = path;
  }
  else {
    this.path = path;
    this.regexp = pathToRegexp(path, this.paramNames);
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
 * Check if given request `method` and `path` matches route,
 * and if so populate `route.params`.
 *
 * @param {String} method
 * @param {String} path
 * @return {Boolean}
 * @api private
 */

route.match = function(method, path) {
  if (this.methods.indexOf(method) !== -1 && this.regexp.test(path)) {
    // Populate route params
    var matches = path.match(this.regexp);
    if (matches && matches.length > 0) {
      this.paramsArray = matches.slice(1);
    }
    for (var len = this.paramsArray.length, i=0; i<len; i++) {
      if (this.paramNames[i]) {
        this.params[this.paramNames[i].name] = this.paramsArray[i];
      }
    }
    return true;
  }
  return false;
};
