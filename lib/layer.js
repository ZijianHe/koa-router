var compose = require('koa-compose');
var debug = require('debug')('koa-router');
var pathToRegExp = require('path-to-regexp');

module.exports = Layer;

/**
 * Initialize a new routing Layer with given `method`, `path`, and `middleware`.
 *
 * @param {String|RegExp} path Path string or regular expression.
 * @param {Array} methods Array of HTTP verbs.
 * @param {Array} middleware Layer callback/middleware or series of.
 * @param {Object=} opts
 * @param {String=} opts.name route name
 * @param {String=} opts.sensitive case sensitive (default: false)
 * @param {String=} opts.strict require the trailing slash (default: false)
 * @returns {Layer}
 * @private
 */

function Layer(path, methods, middleware, opts) {
  this.opts = opts || {};
  this.name = this.opts.name || null;
  this.methods = [];
  this.paramNames = [];
  this.fns = {
    params: {},
    middleware: []
  };

  methods.forEach(function(method) {
    var l = this.methods.push(method.toUpperCase());
    if (this.methods[l-1] === 'GET') {
      this.methods.unshift('HEAD');
    }
  }, this);

  if (!Array.isArray(middleware)) {
    middleware = [middleware];
  }

  // ensure middleware is a function
  middleware.forEach(function(fn) {
    var type = (typeof fn);
    if (type !== 'function') {
      throw new Error(
        methods.toString() + " `" + (this.opts.name || path) +"`: `middleware` "
        + "must be a function, not `" + type + "`"
      );
    }
  }, this);

  this.fns.middleware = middleware;

  if (middleware.length > 1) {
    this.middleware = compose(middleware);
  }
  else {
    this.middleware = middleware[0];
  }

  this.path = path;
  this.regexp = pathToRegExp(path, this.paramNames, this.opts);

  debug('defined route %s %s', this.methods, this.path);
};

/**
 * Returns whether request `path` matches route.
 *
 * @param {String} path
 * @returns {Boolean}
 * @private
 */

Layer.prototype.match = function (path) {
  return this.regexp.test(path);
};

/**
 * Returns map of URL parameters for given `path` and `paramNames`.
 *
 * @param {String} path
 * @param {Array.<String>} captures
 * @param {Object=} existingParams
 * @returns {Object}
 * @private
 */

Layer.prototype.params = function (path, captures, existingParams) {
  var params = existingParams || {};

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

Layer.prototype.captures = function (path) {
  return path.match(this.regexp).slice(1);
};

/**
 * Generate URL for route using given `params`.
 *
 * @example
 *
 * ```javascript
 * var route = new Layer(['GET'], '/users/:id', fn);
 *
 * route.url({ id: 123 }); // => "/users/123"
 * ```
 *
 * @param {Object} params url parameters
 * @returns {String}
 * @private
 */

Layer.prototype.url = function (params) {
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
 * @returns {Layer}
 * @private
 */

Layer.prototype.param = function (param, fn) {
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
 * @returns {Layer}
 * @private
 */

Layer.prototype.setPrefix = function (prefix) {
  if (this.path) {
    this.path = prefix + this.path;
    this.paramNames = [];
    this.regexp = pathToRegExp(this.path, this.paramNames, this.opts);
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
