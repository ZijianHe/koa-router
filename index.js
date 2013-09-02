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
var Resource = require('./resource');
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
    this.routes[methods[i]] = [];
  }
  // Expose `router.route` as `app.map`
  app.map = router.route;
  // Alias methods for `router.route`
  methods.forEach(function(method) {
    app[method] = function() {
      var args = Array.prototype.slice.call(arguments);
      args.unshift([method]);
      return app.map.apply(app, args);
    };
  });
  // Alias `app.delete` as `app.del`
  app.del = app['delete'];
  // Register route with all methods
  app.all = function() {
    var args = Array.prototype.slice.call(arguments);
    args.unshift(methods);
    return app.map.apply(app, args);
  };
  // `Resource` factory
  app.resource = function() {
    var args = Array.prototype.slice.call(arguments);
    args.push(this);
    var resource = Object.create(Resource.prototype);
    Resource.apply(resource, args);
    return resource;
  };
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
    return function *() {
      // Find matching route
      var route = app.router.match(this.req.method, parse(this.req.url).path);
      // Dispatch route callbacks
      if (route) {
        app.context({ route: route, params: route.params });
        for (var len = route.callbacks.length, i=0; i<len; i++) {
          yield route.callbacks[i].apply(
            this,
            route.paramsArray.concat([next])
          );
        }
      }
      else {
        yield next;
      }
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
  var routes = this.routes[method.toLowerCase()];
  for (var len = routes.length, i=0; i<len; i++) {
    if (routes[i].match(method, path)) return routes[i];
  }
};

/**
 * Route given `callbacks` to request `method` and path `pattern` combination.
 *
 * @param {Array} methods Array of HTTP methods/verbs
 * @param {String} pattern
 * @param {Function} callbacks
 * @return {Route}
 * @api public
 */

router.route = function(methods, pattern, callbacks) {
  if (arguments.length > 3) {
    callbacks = Array.prototype.slice.call(arguments, 2);
  }
  var route = new Route(methods, pattern, callbacks);
  for (var len = methods.length, i=0; i<len; i++) {
    this.routes[methods[i]].push(route);
  }
  return route;
};
