/**
 * Dependencies
 */

var pathToRegexp = require('path-to-regexp');

/**
 * Initialize a new Route with given `methods`, `pattern`, and `callbacks`.
 *
 * @param {Mixed} method HTTP verb string or array of verbs.
 * @param {Mixed} pattern Path string or regular expression.
 * @param {Mixed} callbacks Route callback function or array of functions.
 * @return {Route}
 * @api public
 */

function Route(methods, pattern, callbacks) {
  if (typeof methods == 'string') methods = [methods];
  if (typeof callbacks == 'function') callbacks = [callbacks];
  this.methods = [];
  for (var len = methods.length, i=0; i<len; i++) {
    this.methods.push(methods[i].toUpperCase());
  }
  this.paramNames = [];
  this.paramsArray = [];
  this.params = {};
  if (pattern instanceof RegExp) {
    this.pattern = pattern.source;
    this.regexp = pattern;
  }
  else {
    this.pattern = pattern;
    this.regexp = pathToRegexp(pattern, this.paramNames);
  }
  this.callbacks = callbacks;
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
 * @api public
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
