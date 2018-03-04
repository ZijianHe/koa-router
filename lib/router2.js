const compose = require('koa-compose');
const pathToRegexp = require('path-to-regexp');
const methods = require('methods');
const debug = require('debug')('koa-router');

// TODO
// should interpolate params be hoisted up?
// if a path comes in, really long, later param portions interpolated by deeply
// nested router, should the top router interpolate all of them?
//
// keep a cache of named routes? so lookup is easy from a router before its
// been compiled?

class Route {
  constructor({ method, path, handler, name }) {
    this.name = name;
    this.method = method.toUpperCase();
    this.path = path;
    this.handler = handler;
  }
  compile(prefix, middleware) {
    const { method, path, handler } = this;
    return new CompiledRoute({
      prefix,
      method,
      path,
      handler,
      middleware
    });
  }
  debug() {
    const { method, path, handler } = this;
    return `${method}\t${this.name || 'unnamed'}\t${path}\t${handler.name || 'anonymous'}`;
  }
}

class CompiledRoute extends Route {
  constructor({ prefix, path, middleware, ...rest }) {
    super({ path: `${prefix || ''}${path}`, ...rest });
    this.middleware = middleware;
    this.prefix = prefix || '';
    this.regex = pathToRegexp(this.path);
    this.call = compose([...middleware, this.handler]);
  }
  test(method, path) {
    return method.toUpperCase() == this.method && this.regex.test(path);
  }
  debug() {
    const { method, path, handler } = this;
    return `${method}\t${path}\t${handler.name || 'anonymous'}`;
  }
}

class Router {
  constructor(options = {}) {
    this.prefix = options.prefix;
    this.name = options.name;
    this.children = [];
    this.middleware = [this.interpolator()];
    this.routes = [];
    this.interpolators = {};
  }
  interpolator() {
    const interpolateParams = async (ctx, next) => {
      console.log('interpolate values', Object.keys(this.interpolators));
      return next();
    };
    return interpolateParams;
  }
  nest(prefix, child) {
    if (!child) {
      child = prefix;
      this.children.push(child);
    } else {
      let name =  `${child.name || 'anonymous'} (.nest wrapper)`;
      this.children.push(
        new Router({ prefix, name }).nest(child)
      );
    }
    return this;
  }
  use(prefix, fn) {
    if (!fn) fn = prefix;
    this.middleware.push(fn);
    return this;
  }
  param(name, handler) {
    this.interpolators[name] = handler;
  }
  all(...args) {
    methods.forEach((method) => {
      this[method].call(this, ...args);
    });
    return this;
  }
  debug(depth = 0, prefixToken = '  ', prefix) {
    prefix = prefix || prefixToken.repeat(depth);
    let nestedPrefix = `${prefix}│   `;
    const routes = this.routesToString(nestedPrefix);
    return `
${prefix}* ${this.name || 'Router'} ${
  this.prefix ? `\n${prefix}├── prefix: ${this.prefix} ` : ''
}
${prefix}├── param interpolators: ${
  Object.keys(this.interpolators).length ? `\n${this.interpolatorsToString(nestedPrefix)}` : ''
}
${prefix}├── middleware: ${
  this.middleware.length ? `\n${this.middlewareToString(nestedPrefix)}` : ''
}
${prefix}├── routes (including nested) ${
  routes ? `\n${routes}` : ''
}
${prefix}└── nested: ${
  this.children.length ? `${this.childrenToString(depth + 2)}` : ''
}`;
  }
  childrenToString(depth) {
    return this.children.map(child => child.debug(depth)).join('');
  }
  routesToString(prefix) {
    return this.compileRoutes().map((route, i, routes) => {
      let header = '├──';
      if (i === routes.length - 1) {
        header = '└──';
      }
      return `${prefix}${header} ${route.debug()}`
    }).join('\n');
  }
  middlewareToString(prefix) {
    return this.middleware.map((fn, i, middleware) => {
      let header = '├──';
      if (i === middleware.length - 1) {
        header = '└──';
      }
      return `${prefix}${header} ${fn.name || 'anonymous'}`;
    }).join('\n');
  }
  interpolatorsToString(prefix) {
    const paramNames = Object.keys(this.interpolators);
    return paramNames.map((name, i, names) => {
      let header = '├──';
      if (i === names.length - 1) {
        header = '└──';
      }
      return `${prefix}${header} ${name}:\t${this.interpolators[name].name || 'anonymous'}`;
    }).join('\n');
  }
  compileRoutes(accumulator = {}) {
    let { parent, middleware = [], interpolators = {}, prefix = '' } = accumulator;
    debug('compile %s router prefix=%o', this.name || 'anonymous', prefix);

    middleware = middleware.concat(this.middleware);
    interpolators = { ...interpolators, ...this.interpolators };
    prefix = `${prefix}${this.prefix || ''}`

    let routes = this.routes.map((route) => {
      // build param, mw, handler stack for each route, not at runtime
      return route.compile(prefix, middleware);
    });

    this.children.forEach((nestedRouter) => {
      routes = routes.concat(nestedRouter.compileRoutes({
        parent: this,
        middleware,
        interpolators,
        prefix
      }));
    });

    return routes;
  }
  register({ method, path, handler, name}) {
    const route = new Route({ name, path, handler, method: method.toUpperCase() });
    debug('register method=%s,path=%s,name=%s', method, path, name);
    this.routes.push(route);
    return route;
  }
  routes() {
    const lifoCompiledRoutes = this.compileRoutes().reverse();
    const dispatch = async (ctx, next) => {
      ctx.router = this;
      const method = ctx.method;
      const path = ctx.pathOverride || ctx.path;
      debug('dispatch %s %s', method, path);
      const matched = lifoCompiledRoutes.find((route) => route.test(method, path));
      ctx.matchedRoute = matched;
      if (matched) {
        return matched.call();
      } else {
        return next();
      }
    };
    return dispatch;
  }
}

methods.forEach((method) => {
  Router.prototype[method] = function (...args) {
    let name;
    let path;
    let handler;

    if (args.length === 3) {
      [ name, path, handler ] = args;
    } else {
      [ path, handler ] = args;
    }

    this.register({ name, path, handler, method });

    return this;
  };
});












const publicRouter = new Router({ prefix: '/:lang?', name: 'public' });

publicRouter.get('/one', () => {});

publicRouter.param('lang', (ctx, next) => {
  console.log('lang lookup');
  return next();
});

const adminRouter = new Router({ prefix: '/:lang/admin', name: 'admin' });

adminRouter.param('lang', (ctx, next) => {
  console.log('admin lang lookup');
  return next();
});

adminRouter.use(function someMiddleware1(ctx, next) {
  console.log('ensure admin mw 1');
  return next();
});
adminRouter.use(function someMiddleware2(ctx, next) {
  console.log('ensure admin mw 2');
  return next();
});
adminRouter.use(function someMiddleware3(ctx, next) {
  console.log('ensure admin mw 3');
  return next();
});

const userRouter = new Router({
  name: 'user',
  prefix: '/users'
});

userRouter.param('id', (ctx, next) => {
  console.log('param id lookup');
  return next();
});

userRouter.get('/:id', () => {
  console.log('get id endpoint');
});

userRouter.post('/:id', () => {
  console.log('post id endpoint');
});

userRouter.get('', () => {
  console.log('get index endpoint');
});

publicRouter.nest(userRouter);
adminRouter.nest(userRouter);
adminRouter.nest(userRouter);

const photosRouter = new Router({name: 'photo'});

photosRouter.get('/:id', function photoIndex(ctx, next) {
  console.log('got photos');
  return next();
});

userRouter.nest('/photos', photosRouter);
adminRouter.nest('/userphotos', photosRouter);

console.log(publicRouter.debug());
console.log();
console.log();
const adminRoutes = adminRouter.compileRoutes();
console.log(adminRouter.debug());
adminRoutes[0].call();
console.log();


// // parent's params
// // parent's middleware
// // child's params
// // child's middleware
// // grandchild's params
// // grandchild's middleware
// // route handler
