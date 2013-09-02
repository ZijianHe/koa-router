/**
 * Dependencies
 */

var Route = require('./route');
var lingo = require('lingo');
var pathToRegexp = require('path-to-regexp');

/**
 * Initialize a new Resource using given `name` and `controller`.
 *
 * Registers appropriate routes for each available controller action.
 *
 * @param {String} name
 * @param {Function} controller
 * @param {Object} opts
 * @param {Application} app
 * @return {Resource}
 * @api public
 */

function Resource(name, controller, opts, app) {
  if (typeof name === 'function') {
    app = opts, opts = controller, controller = name, name = null;
  }
  if (opts.env) {
    app = opts, opts = {};
  }
  this.app = app;
  this.opts = opts;
  this.name = name || lingo.en.pluralize(name);
  this.id = name ? lingo.en.singularize(name) : 'id';
  this.base = this.name ? '/' + this.name + '/' : '/';
  this.actions = controller;
  this.routes = [];
  this.load = controller.load || opts.load;
  // Map controller actions
  for (var action in this.actions) {
    this.mapControllerAction(action, this.actions[action]);
  }
  this.app.resources = this.app.resources || [];
  this.app.resources.push(this);
};

/**
 * Expose `Resource`.
 */

module.exports = Resource;

/**
 * Resource prototype
 */

var resource = Resource.prototype;

/**
 * Map controller action to corresponding HTTP verb and URL combination.
 *
 * @param {String} name Resource name.
 * @param {Function} action Controller action.
 * @return {Resource}
 * @api public
 */

resource.mapControllerAction = function(name, action) {
  var app = this.app, base = this.base, id = this.id;
  var load = this.load;
  if (load) {
    // Auto-load resource and populate route params
    load = function *() {
      var next = Array.prototype.pop.call(arguments);
      var params = [];
      pathToRegexp(base + ':' + id, params);
      for (var len = params.length, i=0; i<len; i++) {
        var param = params[i].name, paramIdx = i;
        for (var len = app.resources.length, i=0; i<len; i++) {
          if (app.resources[i].id === param && app.resources[i].load) {
            this.route.paramsArray[paramIdx] = yield app.resources[i].load.apply(
              this, this.route.paramsArray.concat([next])
            );
            this.route.params[param] = this.route.paramsArray[paramIdx];
          }
        }
      }
    };
  }
  // Create routes for controller actions
  switch (name) {
    case 'index':
      route = app.get(base, action);
      break;
    case 'new':
      route = app.get(base + 'new', action);
      break;
    case 'create':
      route = app.post(base, action);
      break;
    case 'show':
      route = app.get(base + ':' + id, load ? [load, action] : action);
      break;
    case 'edit':
      route = app.get(base + ':' + id + '/edit', load ? [load, action] : action);
      break;
    case 'update':
      route = app.put(base + ':' + id, load ? [load, action] : action);
      break;
    case 'destroy':
      route = app.del(base + ':' + id, load ? [load, action] : action);
      break;
  }
  if (route) this.routes.push(route);
  return this;
};

/**
 * Nest given `resource`.
 *
 * @param {Resource} resource
 * @return {Resource}
 * @api public
 */

resource.add = function(resource) {
  // Re-define base path for nested resource
  resource.base = resource.name ? '/' + resource.name + '/' : '/';
  resource.base = this.base + ':' + this.id + resource.base;
  // Remove previous routes for nested resource
  for (var method in this.app.routes) {
    var appRoutes = this.app.routes[method];
    for (var len = appRoutes.length, i=0; i<len; i++) {
      var resRoutePos = resource.routes.indexOf(appRoutes[i]);
      if (resRoutePos !== -1) {
        resource.routes.splice(resRoutePos, 1);
        this.app.routes[method].splice(i, 1);
      }
    }
  }
  // Re-define routes for nested resource
  for (var action in resource.actions) {
    resource.mapControllerAction(action, resource.actions[action]);
  }
  return this;
};
