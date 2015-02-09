/**
 * Dependencies
 */

var debug = require('debug')('koa-router')
  , HttpError = require('http-errors')
  , methods = require('methods')
  , Route = require('./route');

/**
 * Expose `Router`
 */

module.exports = Router;

/**
 * Initialize Router.
 *
 * @param {Application=} app Optional. Extends app with methods such
 * as `app.get()`, `app.post()`, etc.
 * @param {Object=} opts Optional. Passed to `path-to-regexp`.
 * @return {Router}
 * @api public
 */

function Router(app, opts) {
  if (!(this instanceof Router)) {
    var router = new Router(app, opts);
    return router.middleware();
  }

  if (app && !app.use) {
    opts = app;
    app = null;
  }

  this.opts = opts || {};
  this.methods = this.opts.methods || [
    'HEAD',
    'OPTIONS',
    'GET',
    'PUT',
    'PATCH',
    'POST',
    'DELETE'
  ];

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
    var pathname = router.opts.routerPath || this.routerPath || this.path;
    var route;

    debug('%s %s', this.method, pathname);

    this.matched = [];

    // Find routes matching requested path
    if (route = router.match(this, pathname)) {
      this.route = route;
      debug('dispatch "%s" %s', this.route.path, this.route.regexp);
      return yield *this.route.middleware.call(this, next);
    }
    else {
      // Could not find any route matching the requested path
      // simply yield to downstream koa middleware
      return yield *next;
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
  var route = new Route(path, methods, middleware, name, this.opts);

  // add parameter middleware
  Object.keys(this.params).forEach(function(param) {
    route.param(param, this.params[param]);
  }, this);

  // register route with router
  this.routes.push(route);

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

router.match = function(ctx, path) {
  var routes = this.routes;

  for (var len = routes.length, i = 0; i < len; i++) {
    debug('test "%s" %s', routes[i].path, routes[i].regexp);

    if (routes[i].match(ctx, path)) {
      debug('match "%s" %s', routes[i].path, routes[i].regexp);
      return routes[i];
    }
  }

  return false;
};

router.param = function(param, fn) {
  this.params[param] = fn;
  this.routes.forEach(function(route) {
    route.param(param, fn);
  });
  return this;
};

/**
 * Returns middleware that populates `Allow` header with allowed methods and
 * responds with 405, 501, or 204.
 *
 * Must be used after all other routes have been mounted. Usable with multiple
 * routers.
 *
 * @example
 *
 * ```javascript
 * app.use(router.middleware());
 * app.use(router.allowedMethods());
 * ```
 *
 * @param {Object=} options
 * @param {Boolean=} throw throw error instead of setting status and header
 * @returns {Function}
 */

router.allowedMethods = function (options) {
  options = options || {};
  var implemented = this.methods;

  return function *allowedMethods(next) {
    yield *next;

    var allowed = {};

    if (!this.status || this.status === 404) {
      this.matched.forEach(function (route) {
        route.methods.forEach(function (method) {
          allowed[method] = method;
        });
      });

      allowed = Object.keys(allowed);

      if (!~implemented.indexOf(this.method)) {
        if (options.throw) {
          throw new HttpError.NotImplemented();
        } else {
          this.status = 501;
          this.set('Allow', allowed);
        }
      } else if (allowed.length) {
        if (this.method === 'OPTIONS') {
          this.status = 204;
        } else {
          if (options.throw) {
            throw new HttpError.MethodNotAllowed();
          } else {
            this.status = 405;
          }
        }
        this.set('Allow', allowed);
      }
    }
  };
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
  app.router = router;

  ['all', 'redirect', 'register', 'del', 'param']
  .concat(methods)
  .forEach(function(method) {
    app[method] = function() {
      router[method].apply(router, arguments);
      return this;
    };
  });

  app.use(router.allowedMethods());

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
