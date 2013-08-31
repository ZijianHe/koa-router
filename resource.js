/**
 * Dependencies
 */

var lingo = require('lingo');

/**
 * Initialize a new Resource using given `name` and `controller`.
 *
 * Registers appropriate routes for each available controller action.
 *
 * @param {String} name
 * @param {Function} controller
 * @param {Application} app
 * @return {Resource}
 * @api public
 */

function Resource(name, controller, app) {
  if (typeof name === 'function') {
    app = controller, controller = name, name = null;
  }
  this.app = app;
  this.name = name || lingo.en.pluralize(name);
  this.id = name ? lingo.en.singularize(name) : 'id';
  this.base = this.name ? '/' + this.name + '/' : '/';
  this.actions = controller;
  this.routes = [];
  // Map controller actions
  for (var action in this.actions) {
    this.mapControllerAction(action, this.actions[action]);
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
 * @api public
 */

resource.mapControllerAction = function(name, action) {
  var app = this.app, base = this.base, id = this.id;
  switch (name) {
    case 'index':
      this.routes.push(app.get(base, action));
      break;
    case 'new':
      this.routes.push(app.get(base + 'new', action));
      break;
    case 'create':
      this.routes.push(app.post(base, action));
      break;
    case 'show':
      this.routes.push(app.get(base + ':' + id, action));
      break;
    case 'edit':
      this.routes.push(app.get(base + ':' + id + '/edit', action));
      break;
    case 'update':
      this.routes.push(app.put(base + ':' + id, action));
      break;
    case 'destroy':
      this.routes.push(app.delete(base + ':' + id, action));
      break;
  }
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
