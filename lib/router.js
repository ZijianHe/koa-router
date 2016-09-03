/**
 * RESTful resource routing middleware for koa.
 *
 * @author Alex Mingoia <talk@alexmingoia.com>
 * @link https://github.com/alexmingoia/koa-router
 */

var debug = require('debug')('koa-router');
var compose = require('koa-compose');
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
 * router.get('/', function (ctx, next) {...});
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
 * Create `router.verb()` methods, where *verb* is one of the HTTP verbs such
 * as `router.get()` or `router.post()`.
 *
 * Match URL patterns to callback functions or controller actions using `router.verb()`,
 * where **verb** is one of the HTTP verbs such as `router.get()` or `router.post()`.
 *
 * ```javascript
 * router
 *   .get('/', function (ctx, next) {
 *     ctx.body = 'Hello World!';
 *   })
 *   .post('/users', function (ctx, next) {
 *     // ...
 *   })
 *   .put('/users/:id', function (ctx, next) {
 *     // ...
 *   })
 *   .del('/users/:id', function (ctx, next) {
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
 * router.get('user', '/users/:id', function (ctx, next) {
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
 *   function (ctx, next) {
 *     return User.findOne(ctx.params.id).then(function(user) {
 *       ctx.user = user;
 *       next();
 *     });
 *   },
 *   function (ctx) {
 *     console.log(ctx.user);
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
 * posts.get('/', function (ctx, next) {...});
 * posts.get('/:pid', function (ctx, next) {...});
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
 * router.get('/:category/:title', function (ctx, next) {
 *   console.log(ctx.params);
 *   // => { category: 'programming', title: 'how-to-node' }
 * });
 * ```
 *
 * The [path-to-regexp](https://github.com/pillarjs/path-to-regexp) module is
 * used to convert paths to regular expressions.
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

    if (typeof path === 'string' || path instanceof RegExp) {
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
 * Use given middleware.
 *
 * Middleware run in the order they are defined by `.use()`. They are invoked
 * sequentially, requests start at the first middleware and work their way
 * "down" the middleware stack.
 *
 * @example
 *
 * ```javascript
 * // session middleware will run before authorize
 * router
 *   .use(session())
 *   .use(authorize());
 *
 * // use middleware only with given path
 * router.use('/users', userAuth());
 *
 * // or with an array of paths
 * router.use(['/users', '/admin'], userAuth());
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
  var path = '(.*)';

  // support array of paths
  if (Array.isArray(middleware[0]) && typeof middleware[0][0] === 'string') {
    middleware[0].forEach(function (p) {
      router.use.apply(router, [p].concat(middleware.slice(1)));
    });

    return this;
  }

  var hasPath = typeof middleware[0] === 'string';
  if (hasPath) {
    path = middleware.shift();
  }

  middleware.forEach(function (m) {
    if (m.router) {
      m.router.stack.forEach(function (nestedLayer) {
        if (path) nestedLayer.setPrefix(path);
        if (router.opts.prefix) nestedLayer.setPrefix(router.opts.prefix);
        router.stack.push(nestedLayer);
      });

      if (router.params) {
        Object.keys(router.params).forEach(function (key) {
          m.router.param(key, router.params[key]);
        });
      }
    } else {
      router.register(path, [], m, { end: false, ignoreCaptures: !hasPath });
    }
  });

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

  var dispatch = function dispatch(ctx, next) {
    debug('%s %s', ctx.method, ctx.path);

    var path = router.opts.routerPath || ctx.routerPath || ctx.path;
    var matched = router.match(path, ctx.method);
    var layerChain, layer, i;

    if (ctx.matched) {
      ctx.matched.push.apply(ctx.matched, matched.path);
    } else {
      ctx.matched = matched.path;
    }

    if (!matched.route) return next();

    layerChain = matched.pathAndMethod.reduce(function(memo, layer) {
      memo.push(function(ctx, next) {
        ctx.captures = layer.captures(path, ctx.captures);
        ctx.params = layer.params(path, ctx.captures, ctx.params);
        return next();
      });
      return memo.concat(layer.stack);
    }, []);

    return compose(layerChain)(ctx, next);
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
 * @param {Function=} options.notImplemented throw the returned value in place of the default NotImplemented error
 * @param {Function=} options.methodNotAllowed throw the returned value in place of the default MethodNotAllowed error
 * @returns {Function}
 */

Router.prototype.allowedMethods = function (options) {
  options = options || {};
  var implemented = this.methods;

  return function allowedMethods(ctx, next) {
    return next().then(function() {
      var allowed = {};

      if (!ctx.status || ctx.status === 404) {
        ctx.matched.forEach(function (route) {
          route.methods.forEach(function (method) {
            allowed[method] = method;
          });
        });

        var allowedArr = Object.keys(allowed);

        if (!~implemented.indexOf(ctx.method)) {
          if (options.throw) {
            var notImplementedThrowable;
            if (typeof options.notImplemented === 'function') {
              notImplementedThrowable = options.notImplemented(); // set whatever the user returns from their function
            } else {
              notImplementedThrowable = new HttpError.NotImplemented();
            }
            throw notImplementedThrowable;
          } else {
            ctx.status = 501;
            ctx.set('Allow', allowedArr);
          }
        } else if (allowedArr.length) {
          if (ctx.method === 'OPTIONS') {
            ctx.status = 204;
            ctx.set('Allow', allowedArr);
          } else if (!allowed[ctx.method]) {
            if (options.throw) {
              var notAllowedThrowable;
              if (typeof options.methodNotAllowed === 'function') {
                notAllowedThrowable = options.methodNotAllowed(); // set whatever the user returns from their function
              } else {
                notAllowedThrowable = new HttpError.MethodNotAllowed();
              }
              throw notAllowedThrowable;
            } else {
              ctx.status = 405;
              ctx.set('Allow', allowedArr);
            }
          }
        }
      }
    });
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
 * router.all('/login', function (ctx) {
 *   ctx.redirect('/sign-in');
 *   ctx.status = 301;
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

  return this.all(source, function (ctx) {
    ctx.redirect(destination);
    ctx.status = code || 301;
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

  var router = this;
  var stack = this.stack;

  // support array of paths
  if (Array.isArray(path)) {
    path.forEach(function (p) {
      router.register.call(router, p, methods, middleware, opts);
    });

    return this;
  }

  // create route
  var route = new Layer(path, methods, middleware, {
    end: opts.end === false ? opts.end : true,
    name: opts.name,
    sensitive: opts.sensitive || this.opts.sensitive || false,
    strict: opts.strict || this.opts.strict || false,
    prefix: opts.prefix || this.opts.prefix || "",
    ignoreCaptures: opts.ignoreCaptures
  });

  if (this.opts.prefix) {
    route.setPrefix(this.opts.prefix);
  }

  // add parameter middleware
  Object.keys(this.params).forEach(function (param) {
    route.param(param, this.params[param]);
  }, this);

  stack.push(route);

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
 * router.get('user', '/users/:id', function (ctx, next) {
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
 *   .param('user', function (id, ctx, next) {
 *     ctx.user = users[id];
 *     if (!ctx.user) return ctx.status = 404;
 *     return next();
 *   })
 *   .get('/users/:user', function (ctx) {
 *     ctx.body = ctx.user;
 *   })
 *   .get('/users/:user/friends', function (ctx) {
 *     return ctx.user.getFriends().then(function(friends) {
 *       ctx.body = friends;
 *     });
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
