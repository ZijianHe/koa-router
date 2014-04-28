/**
 * Dependencies
 */

var compose = require('koa-compose')
  , debug = require('debug')('koa-router')
  , pathToRegexp = require('path-to-regexp');

/**
 * Expose `Route`.
 */

module.exports = Route;

/**
 * Initialize a new Route with given `method`, `path`, and `middleware`.
 *
 * @param {String|RegExp} path Path string or regular expression.
 * @param {Array} methods Array of HTTP verbs.
 * @param {Array} middleware Route callback/middleware or series of.
 * @param {String} name Optional.
 * @return {Route}
 * @api private
 */

function Route(path, methods, middleware, name) {
  this.name = name || null;

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

  if (middleware.length > 1) {
    this.middleware = compose(middleware);
  }
  else {
    this.middleware = middleware[0];
  }

  debug('defined route %s %s', this.methods, this.path);
};

/**
 * Route prototype
 */

var route = Route.prototype;

/**
 * Check if given request `path` matches route,
 * and if so populate `route.params`.
 *
 * @param {String} path
 * @return {Array} of matched params or null if not matched
 * @api private
 */

route.match = function(path) {
  if (this.regexp.test(path)) {
    var params = [];
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
          var c = captures[i];
          params[this.params[i].name] = c ? safeDecodeURIComponent(c) : c;
        }
      }
    }
    else {
      for (var i=0, len=captures.length; i<len; i++) {
        var c = captures[i];
        params[i] = c ? safeDecodeURIComponent(c) : c;
      }
    }

    return params;
  }

  return null;
};

/**
 * Generate URL for route using given `params`.
 *
 * @example
 *
 *   var route = new Route(['GET'], '/users/:id', fn);
 *
 *   route.url({ id: 123 });
 *   // => "/users/123"
 *
 * @param {Object} params url parameters
 * @return {String}
 * @api private
 */

route.url = function(params) {
  var args = params;
  var url = this.path;

  // argument is of form { key: val }
  if (typeof params != 'object') {
    args = Array.prototype.slice.call(arguments);
  }

  if (args instanceof Array) {
    for (var len = args.length, i=0; i<len; i++) {
      url = url.replace(/:[^\/]+/, args[i]);
    }
  }
  else {
    for (var key in args) {
      url = url.replace(':' + key, args[key]);
    }
  }

  url.split('/').forEach(function(component) {
    url = url.replace(component, encodeURIComponent(component));
  });

  return url;
};

/**
 * Safe decodeURIComponent, won't throw any error.
 * If `decodeURIComponent` error happen, just return the original value.
 *
 * @param {String} text
 * @return {String} URL decode original string.
 */

function safeDecodeURIComponent(text) {
  try {
    return decodeURIComponent(text);
  } catch (e) {
    return text;
  }
}
