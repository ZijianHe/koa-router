/**
 * Dependencies
 */

var debug = require('debug')('koa-router')
  , methods = require('methods')
  , parse = require('url').parse
  , Route = require('./route');

/**
 * Expose `Router`
 */

module.exports = Router;

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
  this.params = {};

  // extend application
  if (app) this.extendApp(app);
};

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
    if (matchedRoutes = router.match(this.path)) {
      var methodsAvailable = {};

      // Find matched route for requested method
      for (var len = matchedRoutes.length, i=0; i<len; i++) {
        var route = matchedRoutes[i].route;
        var params = matchedRoutes[i].params;

        for (var l = route.methods.length, n=0; n<l; n++) {
          var method = route.methods[n];

          methodsAvailable[method] = true;

          // if method and path match, dispatch route middleware
          if (method === this.method) {
            this.route = route;

            // Merge the matching routes params into context params
            merge(this.params, params);

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
      // Could not find any route matching the requested path
      // simply yield to downstream koa middleware
      return yield next;
    }

    // a route matched the path but not method.
    // currently status is prepared as 204 or 405
    // If the method is in fact unknown at the router level,
    // send 501 Not Implemented
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
  router[method] = function(name, path, middleware) {
    var args = Array.prototype.slice.call(arguments);
    if ((typeof path === 'string') || (path instanceof RegExp)) {
      args.splice(2, 0, [method]);
    } else {
      args.splice(1, 0, [method]);
    }
    this.register.apply(this, args);
    return this;
  };
});

// Alias for `router.delete()` because delete is a reserved word
router.del = router['delete'];

/**
 * Register route with all methods.
 *
 * @param {String} name Optional.
 * @param {String|RegExp} path
 * @param {Function} middleware You may also pass multiple middleware.
 * @return {Route}
 * @api public
 */

router.all = function(name, path, middleware) {
  var args = Array.prototype.slice.call(arguments);
  args.splice(typeof path == 'function' ? 1 : 2, 0, methods);

  this.register.apply(this, args);
  return this;
};

/**
 * Redirect `path` to `destination` URL with optional 30x status `code`.
 *
 * @param {String} source URL, RegExp, or route name.
 * @param {String} destination URL or route name.
 * @param {Number} code HTTP status code (default: 301).
 * @return {Route}
 * @api public
 */

router.redirect = function(source, destination, code) {
  // lookup source route by name
  if (source instanceof RegExp || source[0] != '/') {
    source = this.url(source);
  }

  // lookup destination route by name
  if (destination instanceof RegExp || destination[0] != '/') {
    destination = this.url(destination);
  }

  return this.all(source, function *() {
    this.redirect(destination);
    this.status = code || 301;
  });
};

/**
 * Create and register a route.
 *
 * @param {String} name Optional.
 * @param {String|RegExp} path Path string or regular expression.
 * @param {Array} methods Array of HTTP verbs.
 * @param {Function} middleware Multiple middleware also accepted.
 * @return {Route}
 * @api public
 */

router.register = function(name, path, methods, middleware) {
  if (path instanceof Array) {
    middleware = Array.prototype.slice.call(arguments, 2);
    methods = path;
    path = name;
    name = null;
  }
  else {
    middleware = Array.prototype.slice.call(arguments, 3);
  }

  // create route
  var route = new Route(path, methods, middleware, name);

  // add parameter middleware
  Object.keys(this.params).forEach(function(param) {
    route.param(param, this.params[param]);
  }, this);

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
 * Lookup route with given `name`.
 *
 * @param {String} name
 * @return {Route|false}
 * @api public
 */

router.route = function(name) {
  for (var len = this.routes.length, i=0; i<len; i++) {
    if (this.routes[i].name == name) {
      return this.routes[i];
    }
  }

  return false;
};

/**
 * Generate URL for route using given `params`.
 *
 * @param {String} name route name
 * @param {Object} params url parameters
 * @return {String|Error}
 * @api public
 */

router.url = function(name, params) {
  var route = this.route(name);

  if (route) {
    var args = Array.prototype.slice.call(arguments, 1);
    return route.url.apply(route, args);
  }

  return new Error("No route found for name: " + name);
};

/**
 * Match given `path` and return corresponding routes.
 *
 * @param {String} path
 * @param {Array} params populated with captured url parameters
 * @return {Array|false} Returns matched routes or false.
 * @api private
 */

router.match = function(path) {
  var routes = this.routes;
  var matchedRoutes = [];

  for (var len = routes.length, i=0; i<len; i++) {
    debug('test "%s" %s', routes[i].path, routes[i].regexp);

    var params = routes[i].match(path);
    if (params) {
      debug('match "%s" %s', routes[i].path, routes[i].regexp);
      matchedRoutes.push({ route: routes[i], params: params });
    }
  }

  return matchedRoutes.length > 0 ? matchedRoutes : false;
};

router.param = function(param, fn) {
  this.params[param] = fn;
  this.routes.forEach(function(route) {
    route.param(param, fn);
  });
  return this;
};

/**
 * Extend given `app` with router methods.
 *
 * @param {Application} app
 * @return {Application}
 * @api private
 */

router.extendApp = function(app) {
  var router = this;

  app.url = router.url.bind(router);

  ['all', 'redirect', 'register', 'del', 'param']
  .concat(methods)
  .forEach(function(method) {
    app[method] = function() {
      router[method].apply(router, arguments);
      return this;
    };
  });

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
