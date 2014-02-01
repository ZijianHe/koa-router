/**
 * Dependencies
 */

var debug = require('debug')('koa-router')
  , methods = require('methods')
  , parse = require('url').parse
  , Route = require('./route');

/**
 * Initialize Router.
 *
 * @param {Application} app Optional. Extends app with methods such
 * as `app.get()`, `app.post()`, etc.
 * @return {Router}
 * @api public
 */

function Router(app) {
  if (!(this instanceof Router)) {
    var router = new Router(app);
    return router.middleware();
  }

  this.methods = ['OPTIONS'];
  this.routes = [];

  // extend application
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
 * middleware corresponding to the request.
 *
 * @param {Function} next
 * @return {Function}
 * @api public
 */

router.middleware = function() {
  var router = this;
  return function *dispatch(next) {
    var matchedRoutes;

    // Parameters for this route
    if (!(this.params instanceof Array)) {
      this.params = [];
    }

    debug('%s %s', this.method, this.path);

    // Find routes matching requested path
    if (matchedRoutes = router.match(this.path, this.params)) {
      var methodsAvailable = {};

      // Find matched route for requested method
      for (var len = matchedRoutes.length, i=0; i<len; i++) {
        var route = matchedRoutes[i];

        for (var l = route.methods.length, n=0; n<l; n++) {
          var method = route.methods[n];

          methodsAvailable[method] = true;

          // if method and path match, dispatch route middleware
          if (method === this.method) {
            debug('dispatch "%s" %s', route.path, route.regexp);
            return yield route.middleware.call(this, next);
          }
        }
      }

      // matches path but not method, so return 405 Method Not Allowed
      // unless this is an OPTIONS request.
      this.status = (this.method === 'OPTIONS' ? 204 : 405);
      this.set('Allow', Object.keys(methodsAvailable).join(", "));
    }
    else {
      return yield next;
    }

    // no match for path or method, so return 501 Not Implemented
    if (!~router.methods.indexOf(this.method)) {
      this.status = 501;
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
 * @param {Function} middleware You may also pass multiple middleware.
 * @return {Route}
 * @api public
 */

router.all = function(path, middleware) {
  // add all methods to arguments
  var args = Array.prototype.slice.call(arguments);
  args.unshift(methods);

  // create route
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
 * Create Route with given `methods`, `path`, and `middleware`.
 *
 * @param {Array|String} methods HTTP verb or array of verbs.
 * @param {String|RegExp} path Path string or regular expression.
 * @param {Function} middleware Multiple middleware also accepted.
 * @return {Route}
 * @api public
 */

router.route = function(methods, path, middleware) {
  // create route
  var args = Array.prototype.slice.call(arguments);
  var route = Object.create(Route.prototype);
  Route.apply(route, args);

  // register route with router
  this.routes.push(route);

  // register route methods with router (for 501 responses)
  route.methods.forEach(function(method) {
    if (!~this.methods.indexOf(method)) {
      this.methods.push(method);
    }
  }, this);

  return route;
};

/**
 * Match given `path` and return corresponding routes.
 *
 * @param {String} path
 * @param {Array} params populated with captured url parameters
 * @return {Array|false} Returns matched routes or false.
 * @api private
 */

router.match = function(path, params) {
  var routes = this.routes;
  var matchedRoutes = [];

  for (var len = routes.length, i=0; i<len; i++) {
    debug('test "%s" %s', routes[i].path, routes[i].regexp);

    if (routes[i].match(path, params)) {
      debug('match "%s" %s', routes[i].path, routes[i].regexp);
      matchedRoutes.push(routes[i]);
    }
  }

  return matchedRoutes.length > 0 ? matchedRoutes : false;
};

/**
 * Extend given `app` with router methods.
 *
 * @param {Application} app
 * @return {Application}
 * @api public
 */

router.extendApp = function(app) {
  ['all', 'redirect', 'route'].concat(methods)
  .forEach(function(method) {
    app[method] = Router.prototype[method].bind(this);
  }, this);
  app.map = app.route;
  return app;
};

/**
 * Merge b into a.
 *
 * @param {Object} a
 * @param {Object} b
 * @return {Object} a
 * @api private
 */

function merge(a, b) {
  if (!b) return a;
  for (var k in b) a[k] = b[k];
  return a;
}
