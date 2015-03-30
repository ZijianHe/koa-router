var compose = require('koa-compose');
var debug = require('debug')('koa-router');
var pathToRegExp = require('path-to-regexp');
var concatRegExp = require('concat-regexp');

module.exports = Route;

/**
 * Initialize a new Route with given `method`, `path`, and `middleware`.
 *
 * @param {String|RegExp} path Path string or regular expression.
 * @param {Array} methods Array of HTTP verbs.
 * @param {Array} middleware Route callback/middleware or series of.
 * @param {String=} name
 * @param {Object=} opts Passed to `path-to-regexp`.
 * @returns {Route}
 * @private
 */

function Route(path, methods, middleware, name, opts) {
  this.name = name || null;
  this.opts = opts;

  this.methods = [];
  methods.forEach(function(method) {
    var l = this.methods.push(method.toUpperCase());
    if (this.methods[l-1] === 'GET') {
      this.methods.unshift('HEAD');
    }
  }, this);

  this.paramNames = [];

  this.fns = {
    params: {},
    middleware: []
  };

  if (path instanceof RegExp) {
    this.regexp = path;
  }
  else {
    this.path = path;
    this.regexp = pathToRegExp(path, this.paramNames, opts);
  }

  // ensure middleware is a function
  middleware.forEach(function(fn) {
    var type = (typeof fn);
    if (type != 'function') {
      throw new Error(
        methods.toString() + " `" + (name || path) +"`: `middleware` "
        + "must be a function, not `" + type + "`"
      );
    }
  });

  if (middleware.length > 1) {
    this.middleware = compose(middleware);
  }
  else {
    this.middleware = middleware[0];
  }

  this.fns.middleware = middleware;

  debug('defined route %s %s', this.methods, this.path || this.regexp.source);
};

/**
 * Returns whether request `path` matches route.
 *
 * @param {String} path
 * @returns {Boolean}
 * @private
 */

Route.prototype.match = function (path) {
  return this.regexp.test(path);
};

/**
 * Returns map of URL parameters for given `path` and `paramNames`.
 *
 * @param {String} path
 * @param {Array.<String>} captures
 * @returns {Object}
 * @private
 */

Route.prototype.params = function (path, captures) {
  var params = {};

  for (var len = captures.length, i=0; i<len; i++) {
    if (this.paramNames[i]) {
      var c = captures[i];
      params[this.paramNames[i].name] = c ? safeDecodeURIComponent(c) : c;
    }
  }

  return params;
};

/**
 * Returns array of regexp url path captures.
 *
 * @param {String} path
 * @returns {Array.<String>}
 * @private
 */

Route.prototype.captures = function (path) {
  return path.match(this.regexp).slice(1);
};

/**
 * Generate URL for route using given `params`.
 *
 * @example
 *
 * ```javascript
 * var route = new Route(['GET'], '/users/:id', fn);
 *
 * route.url({ id: 123 }); // => "/users/123"
 * ```
 *
 * @param {Object} params url parameters
 * @returns {String}
 * @private
 */

Route.prototype.url = function (params) {
  var args = params;
  var url = this.path || this.regexp.source;

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

  url.split('/').forEach(function (component) {
    url = url.replace(component, encodeURIComponent(component));
  });

  return url;
};

/**
 * Run validations on route named parameters.
 *
 * @example
 *
 * ```javascript
 * router
 *   .param('user', function *(id, next) {
 *     this.user = users[id];
 *     if (!user) return this.status = 404;
 *     yield next;
 *   })
 *   .get('/users/:user', function *(next) {
 *     this.body = this.user;
 *   });
 * ```
 *
 * @param {String} param
 * @param {Function} middleware
 * @returns {Route}
 * @private
 */

Route.prototype.param = function (param, fn) {
  var middleware = [];

  this.fns.params[param] = function *(next) {
    yield *fn.call(this, this.params[param], next);
  };

  this.paramNames.forEach(function(param) {
    var fn = this.fns.params[param.name];
    if (fn) {
      middleware.push(fn);
    }
  }, this);

  this.middleware = compose(middleware.concat(this.fns.middleware));

  return this;
};

/**
 * Prefix route path.
 *
 * @param {String} prefix
 * @returns {Route}
 * @private
 */

Route.prototype.setPrefix = function (prefix) {
  if (this.path) {
    this.path = prefix + this.path;
    this.paramNames = [];
    this.regexp = pathToRegExp(this.path, this.paramNames, this.opts);
  } else {
    var source = this.regexp.source;
    var flags = this.regexp.ignoreCase ? 'i' : '';
    var path = new RegExp(source.replace(/^\^/, ''), flags);
    prefix = new RegExp(('^' + prefix).replace(/\//g, '\\/'));
    this.regexp = concatRegExp(prefix, path);
  }

  return this;
};

/**
 * Safe decodeURIComponent, won't throw any error.
 * If `decodeURIComponent` error happen, just return the original value.
 *
 * @param {String} text
 * @returns {String} URL decode original string.
 * @private
 */

function safeDecodeURIComponent(text) {
  try {
    return decodeURIComponent(text);
  } catch (e) {
    return text;
  }
}
