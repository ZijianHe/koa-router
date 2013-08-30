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
    app[method] = function(pattern, callbacks) {
      app.map([method.toUpperCase()], pattern, callbacks);
    };
  });
};

/**
 * Router middleware. Dispatches route callbacks corresponding to the request.
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
    var context = this;
    return function *() {
      var method = this.req.method;
      var path = parse(this.req.url).path;
      var routes = app.routes[method];
      // Find matching route and dispatch it
      for (var len = routes.length, i=0; i<len; i++) {
        if (routes[i].match(this.req.method, path)) {
          return app.router.dispatch(context, routes[i], 0, next);
        }
      }
      return next();
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
 * Dispatch given `route` callbacks.
 *
 * @param {Context} context
 * @param {Route} route
 * @param {Number} index Route callback index
 * @param {Function} next
 * @api public
 */

router.dispatch = function(context, route, index, next) {
  var self = this;
  var callback = route.callbacks[index];
  if (!callback) return next();
  var gen = callback.apply(context, route.params.concat([function() {
    return self.dispatch(route, index++, next);
  }]));
  return isGenerator(gen) ? co.call(context, gen) : gen;
};

/**
 * Route given `callbacks` to request `method` and path `pattern` combination.
 *
 * @param {Array} methods Array of HTTP methods/verbs
 * @param {String} pattern
 * @param {Array} callbacks Array of route functions
 * @return {Route}
 * @api public
 */

router.route = function(methods, pattern, callbacks) {
  var route = new Route(methods, pattern, callbacks);
  for (var len = methods.length, i=0; i<len; i++) {
    this.routes[methods[i]].push(route);
  }
  return route;
};


/**
 * Check if `obj` is a generator.
 *
 * @param {Mixed} obj
 * @return {Boolean}
 * @api private
 */

function isGenerator(obj) {
  return obj && toString.call(obj) === '[object Generator]';
};
