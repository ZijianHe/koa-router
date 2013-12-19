/**
 * Dependencies
 */

var lingo = require('lingo')
  , Route = require('./route')
  , pathToRegexp = require('path-to-regexp');

/**
 * Initialize a new Resource using given `name` and `controller`.
 *
 * @param {String} name
 * @param {Function} controller
 * @return {Resource}
 * @api private
 */

function Resource(name, controller) {
  if (typeof name === 'function') {
    router = controller, controller = name, name = null;
  }
  this.name = name || lingo.en.pluralize(name);
  this.id = name ? lingo.en.singularize(name) : 'id';
  this.base = this.name ? '/' + this.name : '/';
  this.actions = controller;
  this.resources = [];
  this.routes = [];
  this.load = controller.load;
  // Map controller actions
  for (var action in this.actions) {
    this.routeAction(action, this.actions[action]);
  }
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
 * @api private
 */

resource.routeAction = function(name, action) {
  if (name == 'load') return this;
  var base = this.base, id = this.id, load = this.load, args;
  var baseTrailing = base[base.length-1] == '/' ? base : base + '/';
  if (load) {
    // Auto-load resource and populate route params
    var resources = this.resources.concat([this]);
    load = function *() {
      var next = Array.prototype.pop.call(arguments);
      var params = [];
      pathToRegexp(baseTrailing + ':' + id, params);
      // For every parameter in the action's path, find a relevant load method
      // and load the resource.
      for (var len = params.length, i=0; i<len; i++) {
        var param = params[i].name, paramIdx = i;
        for (var len = resources.length, i=0; i<len; i++) {
          var resource = resources[i];
          if (resource.id === param && resource.load) {
            this.route.paramsArray[paramIdx] = yield resource.load.apply(
              this, this.route.paramsArray.concat([next])
            );
            this.route.params[param] = this.route.paramsArray[paramIdx];
          }
        }
      }
    };
  }
  // Determine the arguments to create the route for this action
  switch (name) {
    case 'index':
      args = ['GET', base, action];
      break;
    case 'new':
      args = ['GET', baseTrailing + 'new', action];
      break;
    case 'create':
      args = ['POST', base, action];
      break;
    case 'show':
      args = ['GET', baseTrailing + ':' + id, load ? [load, action] : action];
      break;
    case 'edit':
      args = [
        'GET', baseTrailing + ':' + id + '/edit', load ? [load, action] : action
      ];
      break;
    case 'update':
      args = [
        'PUT', baseTrailing + ':' + id, load ? [load, action] : action
      ];
      break;
    case 'destroy':
      args = [
        'DELETE', baseTrailing + ':' + id, load ? [load, action] : action
      ];
      break;
  }
  // Create the route for this action
  var route = Object.create(Route.prototype);
  Route.apply(route, args);
  this.routes.push(route);
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
  var base = this.base[this.base.length-1] == '/' ? this.base : this.base + '/';
  this.resources.push(resource);
  // Re-define base path for nested resource
  resource.base = resource.name ? '/' + resource.name : '/';
  resource.base = base + ':' + this.id + resource.base;
  // Re-define route paths for nested resource
  for (var len = resource.routes.length, i=0; i<len; i++) {
    var route = resource.routes[i];
    route.path = base + ':' + this.id + route.path;
    route.paramNames = [];
    route.regexp = pathToRegexp(route.path, route.paramNames);
  }
  return this;
};
