/**
 * Dependencies
 */

var extend = require('extend')
  , methods = require('methods')
  , parse = require('url').parse
  , Resource = require('./resource')
  , Route = require('./route');

/**
 * Initialize Router.
 *
 * @param {Application} app Optional. Adds router methods such as `app.get`.
 * @return {Router}
 * @api public
 */

function Router(app) {
  if (!(this instanceof Router)) {
    var router = new Router(app);
    return router.middleware();
  }
  // Create container for routes
  this.routes = {};
  for (var len = methods.length, i=0; i<len; i++) {
    this.routes[methods[i]] = [];
  }
  // Extend application
  if (app) this.extendApp(app);
};

/**
 * Expose `Router`
 */

module.exports = Router;

/**
 * Router prototype
 */

var router = Router.prototype;

/**
 * Router middleware factory. Returns router middleware which dispatches route
 * callbacks corresponding to the request.
 *
 * @param {Function} next
 * @return {Function}
 * @api public
 */

router.middleware = function() {
  var router = this;
  return function *dispatch(next) {
    // Find matching route
    var route = router.match(this.req.method, parse(this.req.url).path);
    if (!route) return yield next;
    // Dispatch route callbacks
    var args;
    this.route = route;
    this.params = extend(this.params, route.params);
    for (var len = route.callbacks.length, i=0; i<len; i++) {
      args = yield route.callbacks[i].apply(
        this,
        // Route callbacks may return an array of arguments to be
        // applied to the next callback, otherwise default to the captured
        // route parameters.
        (args ? args : route.paramsArray).concat([next])
      );
    }
  };
};

/**
 * Create `router.verb()` methods, where *verb* is one of the HTTP verbes such
 * as `router.get()` or `router.post()`.
 */

methods.forEach(function(method) {
  router[method] = function() {
    var args = Array.prototype.slice.call(arguments);
    args.unshift(method);
    return this.route.apply(this, args);
  };
});

// Alias for `router.delete()` because delete is a reserved word
router.del = router['delete'];

/**
 * Register route with all methods.
 *
 * @param {String} path
 * @param {Function} callback You may also pass multiple callbacks.
 * @return {Route}
 * @api public
 */

router.all = function(path, callback) {
  var args = Array.prototype.slice.call(arguments);
  args.unshift(methods);
  return this.route.apply(this, args);
};

/**
 * Redirect `path` to `destination` URL with optional 30x status `code`.
 *
 * @param {String} path
 * @param {String} destination
 * @param {Number} code Optional.
 * @return {Route}
 * @api public
 */

router.redirect = function(path, destination, code) {
  return this.all(path, function *() {
    this.redirect(destination);
    this.status = code || 301;
  });
};

/**
 * Create Resource with given `name` and controller `actions`.
 *
 * @param {String} name
 * @param {Object} actions
 * @return {Resource}
 * @api public
 */

router.resource = function(name, actions) {
  var resource = new Resource(name, actions);
  this.addResource(resource);
  return resource;
};

/**
 * Create Route with given `method`, `path`, and `callback`.
 *
 * @param {String|Array} method An array of methods is also accepted.
 * @param {String|RegExp} path Path string or regular expression.
 * @param {Function} callback Multiple callbacks also accepted.
 * @return {Route}
 * @api public
 */

router.route = function(method, path, callback) {
  var args = Array.prototype.slice.call(arguments);
  var route = Object.create(Route.prototype);
  Route.apply(route, args);
  this.addRoute(route);
  return route;
};

/**
 * Add a `route` to the router.
 *
 * @param {Route} route
 * @return {Router}
 * @api private
 */

router.addRoute = function(route) {
  for (var len = route.methods.length, i=0; i<len; i++) {
    this.routes[route.methods[i].toLowerCase()].push(route);
  }
  return this;
};

/**
 * Add `resource` routes to the router.
 *
 * @param {Resource} resource
 * @return {Router}
 * @api private
 */

router.addResource = function(resource) {
  resource.routes.forEach((function(route) {
    this.addRoute(route);
  }).bind(this));
  return this;
};

/**
 * Match given `method` and `path` and return corresponding route.
 *
 * @param {String} method
 * @param {String} path
 * @return {Route|false} Returns matched route or false.
 * @api private
 */

router.match = function(method, path) {
  var routes = this.routes[method.toLowerCase()];
  for (var len = routes.length, i=0; i<len; i++) {
    if (routes[i].match(method, path)) return routes[i];
  }
  return false;
};

/**
 * Extend given `app` with router methods.
 *
 * @param {Application} app
 * @return {Application}
 * @api public
 */

router.extendApp = function(app) {
  ['all', 'resource', 'redirect', 'route'].concat(methods)
  .forEach((function(method) {
    app[method] = Router.prototype[method].bind(this);
  }).bind(this));
  app.map = app.route;
  return app;
};
