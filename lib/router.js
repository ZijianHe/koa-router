/**
 * RESTful resource routing middleware for koa.
 *
 * @author Alex Mingoia <talk@alexmingoia.com>
 * @link https://github.com/alexmingoia/koa-router
 */

var debug = require('debug')('koa-router');
var HttpError = require('http-errors');
var methods = require('methods');
var Layer = require('./layer');

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
 * @alias module:koa-router
 * @param {Object=} opts
 * @param {String=} opts.prefix prefix router paths
 * @constructor
 */

function Router(opts) {
  if (!(this instanceof Router)) {
    return new Router(opts);
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
  this.stack = [];
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
 * Multiple middleware may be given:
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
 * ### Nested routers
 *
 * Nesting routers is supported:
 *
 * ```javascript
 * var forums = new Router();
 * var posts = new Router();
 *
 * posts.get('/', function *(next) {...});
 * posts.get('/:pid', function *(next) {...});
 * forums.use('/forums/:fid/posts', posts.routes(), posts.allowedMethods());
 *
 * // responds to "/forums/123/posts" and "/forums/123/posts/123"
 * app.use(forums.routes());
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
 * ```javascript
 * router.get('/:category/:title', function *(next) {
 *   console.log(this.params);
 *   // => { category: 'programming', title: 'how-to-node' }
 * });
 * ```
 *
 * @name get|put|post|patch|delete
 * @memberof module:koa-router.prototype
 * @param {String} path
 * @param {Function=} middleware route middleware(s)
 * @param {Function} callback route callback
 * @returns {Router}
 */

methods.forEach(function (method) {
  Router.prototype[method] = function (name, path, middleware) {
    var middleware;

    if (typeof path === 'string') {
      middleware = Array.prototype.slice.call(arguments, 2);
    } else {
      middleware = Array.prototype.slice.call(arguments, 1);
      path = name;
      name = null;
    }

    this.register(path, [method], middleware, {
      name: name
    });

    return this;
  };
});

// Alias for `router.delete()` because delete is a reserved word
Router.prototype.del = Router.prototype['delete'];

/**
 * Use given middleware(s) before route callback.
 *
 * Only runs if any route is matched. If a path is given, the middleware will
 * run for any routes that include that path.
 *
 * @example
 *
 * ```javascript
 * router.use(session(), authorize());
 *
 * // use middleware only with given path
 * router.use('/users', userAuth());
 *
 * app.use(router.routes());
 * ```
 *
 * @param {String=} path
 * @param {Function} middleware
 * @param {Function=} ...
 * @returns {Router}
 */

Router.prototype.use = function () {
  var router = this;
  var middleware = Array.prototype.slice.call(arguments);
  var path;

  // support array of paths
  if (Array.isArray(middleware[0]) && typeof middleware[0][0] === 'string') {
    middleware[0].forEach(function (p) {
      router.use.apply(router, [p].concat(middleware.slice(1)));
    });

    return this;
  }

  if (typeof middleware[0] === 'string') {
    path = middleware.shift();
  }

  // filter out nested routers from filter
  middleware = middleware.filter(function (fn) {
    if (fn.router) {
      fn.router.stack.forEach(function (layer) {
        if (path) layer.setPrefix(path);
        if (router.opts.prefix) layer.setPrefix(router.opts.prefix);
        router.stack.push(layer);
      });

      if (router.params) {
        Object.keys(router.params).forEach(function (key) {
          fn.router.param(key, router.params[key]);
        });
      }

      return false;
    }

    return true;
  });

  if (middleware.length) {
    router.register(path || '(.*)', [], middleware, {
      end: false
    });
  }

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
  prefix = prefix.replace(/\/$/, '');

  this.opts.prefix = prefix;

  this.stack.forEach(function (route) {
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

  var dispatch = function *dispatch(next) {
    debug('%s %s', this.method, this.path);

    var path = router.opts.routerPath || this.routerPath || this.path;
    var matched = router.match(path, this.method);
    var layer, i, ii;

    if (this.matched) {
      this.matched.push.apply(this.matched, matched.path);
    } else {
      this.matched = matched.path;
    }

    if (matched.pathAndMethod.length) {
      i = matched.pathAndMethod.length;
      while (matched.route && i--) {
        layer = matched.pathAndMethod[i];
        ii = layer.stack.length;
        this.captures = layer.captures(path, this.captures);
        this.params = layer.params(path, this.captures, this.params);
        debug('dispatch %s %s', layer.path, layer.regexp);

        while (ii--) {
          if (layer.stack[ii].constructor.name === 'GeneratorFunction') {
            next = layer.stack[ii].call(this, next);
          } else {
            next = Promise.resolve(layer.stack[ii].call(this, next));
          }
        }
      }
    }

    if (typeof next.next === 'function') {
      yield *next;
    } else {
      yield next;
    }
  };

  dispatch.router = this;

  return dispatch;
};

/**
 * Returns separate middleware for responding to `OPTIONS` requests with
 * an `Allow` header containing the allowed methods, as well as responding
 * with `405 Method Not Allowed` and `501 Not Implemented` as appropriate.
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
 * @param {String} path
 * @param {Function=} middleware You may also pass multiple middleware.
 * @param {Function} callback
 * @returns {Router}
 * @private
 */

Router.prototype.all = function (name, path, middleware) {
  var middleware;

  if (typeof path === 'string') {
    middleware = Array.prototype.slice.call(arguments, 2);
  } else {
    middleware = Array.prototype.slice.call(arguments, 1);
    path = name;
    name = null;
  }

  this.register(path, methods, middleware, {
    name: name
  });

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
 * @param {String} source URL or route name.
 * @param {String} destination URL or route name.
 * @param {Number} code HTTP status code (default: 301).
 * @returns {Router}
 */

Router.prototype.redirect = function (source, destination, code) {
  // lookup source route by name
  if (source[0] !== '/') {
    source = this.url(source);
  }

  // lookup destination route by name
  if (destination[0] !== '/') {
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
 * @param {String} path Path string or regular expression.
 * @param {Array.<String>} methods Array of HTTP verbs.
 * @param {Function} middleware Multiple middleware also accepted.
 * @returns {Layer}
 * @private
 */

Router.prototype.register = function (path, methods, middleware, opts) {
  opts = opts || {};

  var stack = this.stack;

  // create route
  var route = new Layer(path, methods, middleware, {
    end: opts.end === false ? opts.end : true,
    name: opts.name,
    sensitive: opts.sensitive || this.opts.sensitive || false,
    strict: opts.strict || this.opts.strict || false,
    prefix: opts.prefix || this.opts.prefix || "",
  });

  if (this.opts.prefix) {
    route.setPrefix(this.opts.prefix);
  }

  // add parameter middleware
  Object.keys(this.params).forEach(function (param) {
    route.param(param, this.params[param]);
  }, this);

  // register route with router
  if (methods.length || !stack.length) {
    // if we don't have parameters, put before any with same route
    // nesting level but with parameters
    var added = false;

    if (!route.paramNames.length) {
      var routeNestingLevel = route.path.split('/').length;

      added = stack.some(function (m, i) {
        var mNestingLevel = m.path.split('/').length;
        var isParamRoute = !!m.paramNames.length;
        if (routeNestingLevel === mNestingLevel && isParamRoute) {
          return stack.splice(i, 0, route);
        }
      });
    }

    if (!added) stack.push(route);
  } else {
    stack.some(function (m, i) {
      if (!m.methods.length && i === stack.length - 1) {
        return stack.push(route);
      } else if (m.methods.length) {
        if (stack[i - 1]) {
          return stack.splice(i, 0, route);
        } else {
          return stack.unshift(route);
        }
      }
    });
  }

  return route;
};

/**
 * Lookup route with given `name`.
 *
 * @param {String} name
 * @returns {Layer|false}
 */

Router.prototype.route = function (name) {
  var routes = this.stack;

  for (var len = routes.length, i=0; i<len; i++) {
    if (routes[i].name && routes[i].name === name) {
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
 * @param {String} method
 * @returns {Object.<path, pathAndMethod>} returns layers that matched path and
 * path and method.
 * @private
 */

Router.prototype.match = function (path, method) {
  var layers = this.stack;
  var layer;
  var matched = {
    path: [],
    pathAndMethod: [],
    route: false
  };

  for (var len = layers.length, i = 0; i < len; i++) {
    layer = layers[i];

    debug('test %s %s', layer.path, layer.regexp);

    if (layer.match(path)) {
      matched.path.push(layer);

      if (layer.methods.length === 0 || ~layer.methods.indexOf(method)) {
        matched.pathAndMethod.push(layer);
        if (layer.methods.length) matched.route = true;
      }
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
 *   .get('/users/:user/friends', function *(next) {
 *     this.body = yield this.user.getFriends();
 *   })
 *   // /users/3 => {"id": 3, "name": "Alex"}
 *   // /users/3/friends => [{"id": 4, "name": "TJ"}]
 * ```
 *
 * @param {String} param
 * @param {Function} middleware
 * @returns {Router}
 */

Router.prototype.param = function (param, middleware) {
  this.params[param] = middleware;
  this.stack.forEach(function (route) {
    route.param(param, middleware);
  });
  return this;
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
    return Layer.prototype.url.call({path: path}, params);
};
