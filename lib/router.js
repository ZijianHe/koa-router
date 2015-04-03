/**
 * RESTful resource routing middleware for koa.
 *
 * @author Alex Mingoia <talk@alexmingoia.com>
 * @link https://github.com/alexmingoia/koa-router
 */

var debug = require('debug')('koa-router');
var HttpError = require('http-errors');
var methods = require('methods');
var Route = require('./route');

/**
 * @module koa-router
 */

module.exports = Router;

/**
 * Create a new router.
 *
 * @example
 *
 * Basic usage:
 *
 * ```javascript
 * var app = require('koa')();
 * var router = require('koa-router')();
 *
 * router.get('/', function *(next) {...});
 *
 * app
 *   .use(router.routes())
 *   .use(router.allowedMethods());
 * ```
 *
 * Or if you prefer to extend the app with router methods:
 *
 * ```javascript
 * var app = require('koa')();
 * var router = require('koa-router');
 *
 * app
 *   .use(router(app))
 *   .get('/', function *(next) {...});
 * ```
 *
 * @alias module:koa-router
 * @param {koa.Application=} app extend koa app with router methods
 * @param {Object=} opts
 * @param {String=} opts.prefix prefix router paths
 * @constructor
 */

function Router(app, opts) {
  if (app && !app.use) {
    opts = app;
    app = null;
  }

  if (!(this instanceof Router)) {
    if (app) {
      var router = new Router(app, opts);
      app.use(router.allowedMethods());
      return router.routes();
    } else {
      return new Router(app, opts);
    }
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

  this.params = {};
  this.stack = {
    middleware: [],
    routes: []
  };

  // extend application
  if (app) this.extendApp(app);
};

/**
 * Create `router.verb()` methods, where *verb* is one of the HTTP verbes such
 * as `router.get()` or `router.post()`.
 *
 * Match URL patterns to callback functions or controller actions using `router.verb()`,
 * where **verb** is one of the HTTP verbs such as `router.get()` or `router.post()`.
 *
 * ```javascript
 * router
 *   .get('/', function *(next) {
 *     this.body = 'Hello World!';
 *   })
 *   .post('/users', function *(next) {
 *     // ...
 *   })
 *   .put('/users/:id', function *(next) {
 *     // ...
 *   })
 *   .del('/users/:id', function *(next) {
 *     // ...
 *   });
 * ```
 *
 * Route paths will be translated to regular expressions used to match requests.
 *
 * Query strings will not be considered when matching requests.
 *
 * #### Named routes
 *
 * Routes can optionally have names. This allows generation of URLs and easy
 * renaming of URLs during development.
 *
 * ```javascript
 * router.get('user', '/users/:id', function *(next) {
 *  // ...
 * });
 *
 * router.url('user', 3);
 * // => "/users/3"
 * ```
 *
 * #### Multiple middleware
 *
 * Multiple middleware may be given and are composed using
 * [koa-compose](https://github.com/koajs/koa-compose):
 *
 * ```javascript
 * router.get(
 *   '/users/:id',
 *   function *(next) {
 *     this.user = yield User.findOne(this.params.id);
 *     yield next;
 *   },
 *   function *(next) {
 *     console.log(this.user);
 *     // => { id: 17, name: "Alex" }
 *   }
 * );
 * ```
 *
 * #### Router prefixes
 *
 * Route paths can be prefixed at the router level:
 *
 * ```javascript
 * var router = new Router({
 *   prefix: '/users'
 * });
 *
 * router.get('/', ...); // responds to "/users"
 * router.get('/:id', ...); // responds to "/users/:id"
 * ```
 *
 * #### URL parameters
 *
 * Named route parameters are captured and added to `ctx.params`.
 *
 * ##### Named parameters
 *
 * ```javascript
 * router.get('/:category/:title', function *(next) {
 *   console.log(this.params);
 *   // => [ category: 'programming', title: 'how-to-node' ]
 * });
 * ```
 *
 * ##### Parameter middleware
 *
 * Run middleware for named route parameters. Useful for auto-loading or
 * validation.
 *
 * ```javascript
 * router
 *   .param('user', function *(id, next) {
 *     this.user = users[id];
 *     if (!this.user) return this.status = 404;
 *     yield next;
 *   })
 *   .get('/users/:user', function *(next) {
 *     this.body = this.user;
 *   })
 * ```
 *
 * ##### Regular expressions
 *
 * Control route matching exactly by specifying a regular expression instead of
 * a path string when creating the route. For example, it might be useful to match
 * date formats for a blog, such as `/blog/2013-09-04`:
 *
 * ```javascript
 * router.get(/^\/blog\/\d{4}-\d{2}-\d{2}\/?$/i, function *(next) {
 *   // ...
 * });
 * ```
 *
 * Capture groups from regular expression routes are added to
 * `ctx.captures`, which is an array.
 *
 * @name get|put|post|patch|delete
 * @memberof module:koa-router.prototype
 * @param {String|RegExp} path
 * @param {Function=} middleware route middleware(s)
 * @param {Function} callback route callback
 * @returns {Router}
 */

methods.forEach(function (method) {
  Router.prototype[method] = function (name, path, middleware) {
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
Router.prototype.del = Router.prototype['delete'];

/**
 * Use given middleware(s) before route callback. Only runs if any route is
 * matched.
 *
 * @example
 *
 * ```javascript
 * router.use(session(), authorize());
 *
 * // runs session and authorize middleware before routing
 * app.use(router.routes());
 * ```
 *
 * @param {Function} middleware
 * @param {Function=} ...
 * @returns {Router}
 */

Router.prototype.use = function (middleware) {
  this.stack.middleware.push.apply(this.stack.middleware, arguments);
  return this;
};

/**
 * Set the path prefix for a Router instance that was already initialized.
 *
 * @example
 *
 * ```javascript
 * router.prefix('/things/:thing_id')
 * ```
 *
 * @param {String} prefix
 * @returns {Router}
 */

Router.prototype.prefix = function (prefix) {
  this.opts.prefix = prefix;

  this.stack.routes.forEach(function (route) {
    route.setPrefix(prefix);
  });

  return this;
};

/**
 * Returns router middleware which dispatches a route matching the request.
 *
 * @returns {Function}
 */

Router.prototype.routes = Router.prototype.middleware = function () {
  var router = this;

  return function *dispatch(next) {
    debug('%s %s', this.method, this.path || this.regexp.source);

    var method = this.method;
    var path = router.opts.routerPath || this.routerPath || this.path;
    var matched = router.match(path);
    var route = matched.filter(function (route) {
      return ~route.methods.indexOf(method);
    }).shift();

    if (this.matched) {
      this.matched.push.apply(this.matched, matched);
    } else {
      this.matched = matched;
    }

    // Find route matching requested path and method
    if (route) {
      this.captures = route.captures(path);
      this.params = route.params(path, this.captures);
      this.route = route;
      debug('dispatch %s %s', this.route.path, this.route.regexp);

      next = this.route.middleware.call(this, next);

      for (var i = router.stack.middleware.length-1; i >= 0; --i)
        next = router.stack.middleware[i].call(this, next);

      yield* next;
    }
    else {
      // Could not find any route matching the requested path
      // simply yield to downstream koa middleware
      return yield *next;
    }
  };
};

/**
 * Returns separate middleware for responding to `OPTIONS` requests with
 * an `Allow` header containing the allowed methods, as well as responding
 * with `405 Method Not Allowed` and `501 Not Implemented` as appropriate.
 *
 * `router.allowedMethods()` is automatically mounted if the router is created
 * with `app.use(router(app))`. Create the router separately if you do not want
 * to use `.allowedMethods()`, or if you are using multiple routers.
 *
 * @example
 *
 * ```javascript
 * var app = koa();
 * var router = router();
 *
 * app.use(router.routes());
 * app.use(router.allowedMethods());
 * ```
 *
 * @param {Object=} options
 * @param {Boolean=} options.throw throw error instead of setting status and header
 * @returns {Function}
 */

Router.prototype.allowedMethods = function (options) {
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

      var allowedArr = Object.keys(allowed);

      if (!~implemented.indexOf(this.method)) {
        if (options.throw) {
          throw new HttpError.NotImplemented();
        } else {
          this.status = 501;
          this.set('Allow', allowedArr);
        }
      } else if (allowedArr.length) {
        if (this.method === 'OPTIONS') {
          this.status = 204;
        } else if (!allowed[this.method]) {
          if (options.throw) {
            throw new HttpError.MethodNotAllowed();
          } else {
            this.status = 405;
          }
        }
        this.set('Allow', allowedArr);
      }
    }
  };
};

/**
 * Register route with all methods.
 *
 * @param {String} name Optional.
 * @param {String|RegExp} path
 * @param {Function=} middleware You may also pass multiple middleware.
 * @param {Function} callback
 * @returns {Router}
 */

Router.prototype.all = function (name, path, middleware) {
  var args = Array.prototype.slice.call(arguments);
  args.splice(typeof path == 'function' ? 1 : 2, 0, methods);

  this.register.apply(this, args);
  return this;
};

/**
 * Redirect `source` to `destination` URL with optional 30x status `code`.
 *
 * Both `source` and `destination` can be route names.
 *
 * ```javascript
 * router.redirect('/login', 'sign-in');
 * ```
 *
 * This is equivalent to:
 *
 * ```javascript
 * router.all('/login', function *() {
 *   this.redirect('/sign-in');
 *   this.status = 301;
 * });
 * ```
 *
 * @param {String} source URL, RegExp, or route name.
 * @param {String} destination URL or route name.
 * @param {Number} code HTTP status code (default: 301).
 * @returns {Router}
 */

Router.prototype.redirect = function (source, destination, code) {
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
 * @param {Array.<String>} methods Array of HTTP verbs.
 * @param {Function} middleware Multiple middleware also accepted.
 * @returns {Route}
 */

Router.prototype.register = function (name, path, methods, middleware) {
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

  if (this.opts.prefix) {
    route.setPrefix(this.opts.prefix);
  }

  // add parameter middleware
  Object.keys(this.params).forEach(function (param) {
    route.param(param, this.params[param]);
  }, this);

  // register route with router
  this.stack.routes.push(route);

  return route;
};

/**
 * Lookup route with given `name`.
 *
 * @param {String} name
 * @returns {Route|false}
 */

Router.prototype.route = function (name) {
  var routes = this.stack.routes;

  for (var len = routes.length, i=0; i<len; i++) {
    if (routes[i].name == name) {
      return routes[i];
    }
  }

  return false;
};

/**
 * Generate URL for route. Takes either map of named `params` or series of
 * arguments (for regular expression routes).
 *
 * ```javascript
 * router.get('user', '/users/:id', function *(next) {
 *  // ...
 * });
 *
 * router.url('user', 3);
 * // => "/users/3"
 *
 * router.url('user', { id: 3 });
 * // => "/users/3"
 * ```
 *
 * @param {String} name route name
 * @param {Object} params url parameters
 * @returns {String|Error}
 */

Router.prototype.url = function (name, params) {
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
 * @returns {Array.<Route>} Returns matched routes.
 * @private
 */

Router.prototype.match = function (path) {
  var routes = this.stack.routes;
  var matched = [];

  for (var len = routes.length, i = 0; i < len; i++) {
    debug('test %s %s', routes[i].path, routes[i].regexp);

    if (routes[i].match(path)) {
      matched.push(routes[i]);
    }
  }

  return matched;
};

/**
 * Run middleware for named route parameters. Useful for auto-loading or
 * validation.
 *
 * @example
 *
 * ```javascript
 * router
 *   .param('user', function *(id, next) {
 *     this.user = users[id];
 *     if (!this.user) return this.status = 404;
 *     yield next;
 *   })
 *   .get('/users/:user', function *(next) {
 *     this.body = this.user;
 *   })
 * ```
 *
 * @param {String} param
 * @param {Function} middleware
 * @returns {Router}
 */

Router.prototype.param = function (param, middleware) {
  this.params[param] = middleware;
  this.stack.routes.forEach(function (route) {
    route.param(param, middleware);
  });
  return this;
};

/**
 * Extend given `app` with router methods.
 *
 * @param {koa.Application} app
 * @returns {koa.Application}
 * @private
 */

Router.prototype.extendApp = function (app) {
  var router = this;

  app.url = router.url.bind(router);
  app.router = router;

  ['all', 'redirect', 'register', 'del', 'param']
  .concat(methods)
  .forEach(function (method) {
    app[method] = function () {
      router[method].apply(router, arguments);
      return this;
    };
  });

  return app;
};

/**
 * Generate URL from url pattern and given `params`.
 *
 * @example
 *
 * ```javascript
 * var url = Router.url('/users/:id', {id: 1});
 * // => "/users/1"
 * ```
 *
 * @param {String} path url pattern
 * @param {Object} params url parameters
 * @returns {String}
 */
Router.url = function (path, params) {
    return Route.prototype.url.call({path: path}, params);
};
