/**
 * RESTful resource routing middleware for koa.
 *
 * @author Alex Mingoia <talk@alexmingoia.com>
 * @link https://github.com/alexmingoia/koa-router
 */

/**
 * Dependencies
 */

var co = require('co');
var methods = require('methods');
var Route = require('./route');
var parse = require('url').parse;

/**
 * Initialize Router with given `app`.
 *
 * @param {Application} app
 * @return {Router}
 * @api public
 */

function Router(app) {
  app.router = this;
  this.app = app;
  // Create container for routes
  this.routes = app.routes = {};
  for (var len = methods.length, i=0; i<len; i++) {
    this.routes[methods[i].toUpperCase()] = [];
  }
  // Expose `router.route` as `app.map`
  app.map = router.route;
  // Alias methods for `router.route`
  methods.forEach(function(method) {
    app[method] = function(pattern, callback) {
      app.map([method.toUpperCase()], pattern, callback);
    };
  });
};

/**
 * Router middleware. Dispatches route callback corresponding to the request.
 *
 * @param {Application} app
 * @return {Function}
 * @api public
 */

Router.middleware = function(app) {
  // Initialize Router
  new Router(app);
  // Return middleware
  return function(next) {
    return function *() {
      // Find matching route and dispatch it
      var routes = app.routes[this.req.method];
      for (var len = routes.length, i=0; i<len; i++) {
        var route = routes[i];
        if (route.match(this.req.method, parse(this.req.url).path)) {
          app.context({params: route.params});
          return yield route.callback.apply(this, route.paramsArray.concat([next]));
        }
      }
      yield next;
    };
  };
};

/**
 * Expose `Router.middleware`
 */

module.exports = Router.middleware;

/**
 * Router prototype
 */

var router = Router.prototype;

/**
 * Match given `method` and `path` and return corresponding route.
 *
 * @param {String} method
 * @param {String} path
 * @return {Route}
 * @api public
 */

router.match = function(method, path) {
  var routes = this.routes[method];
  for (var len = routes.length, i=0; i<len; i++) {
    if (routes[i].match(method, path)) return routes[i];
  }
};


/**
 * Route given `callbacks` to request `method` and path `pattern` combination.
 *
 * @param {Array} methods Array of HTTP methods/verbs
 * @param {String} pattern
 * @param {Function} callback
 * @return {Route}
 * @api public
 */

router.route = function(methods, pattern, callback) {
  var route = new Route(methods, pattern, callback);
  for (var len = methods.length, i=0; i<len; i++) {
    this.routes[methods[i]].push(route);
  }
  return route;
};
