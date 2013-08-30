/**
 * Create new Route with given `method`, `pattern`, and `callbacks`.
 *
 * @param {String} method
 * @param {String} pattern
 * @param {Array} callbacks
 * @return {Route}
 * @api public
 */

function Route(methods, pattern, callbacks) {
  if (typeof methods === 'string') methods = [methods];
  if (typeof callbacks === 'function') callbacks = [callbacks];
  this.methods = methods;
  this.pattern = pattern;
  this.regexp = patternToRegExp(pattern);
  this.params = [];
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
    if (matches && matches.length > 1) {
      this.params = matches.slice(1);
    }
    return true;
  }
  return false;
};

/**
 * Convert given `pattern` to regular expression.
 *
 * @param {String} pattern
 * @return {RegExp}
 * @api private
 */

function patternToRegExp(pattern) {
  pattern = pattern
    .replace(/\//g, '\\/')
    .replace(/:\w+/g, '([^\/]+)');
  return new RegExp('^' + pattern + '$', 'i');
};
