const pathToRegexp = require('path-to-regexp');
const compose = require('koa-compose');

class Route {
  constructor({ method, prefix, path, handler, name }) {
    if (prefix) {
      path = prefix && path === '*' ? `${prefix || ''}($|/)*` : `${prefix || ''}${path}`;
    }
    this.method = method.toUpperCase();
    this.path = path;
    this.name = name;
    this.handler = handler;
    this.keys = [];
    this.regex = pathToRegexp(this.path, this.keys);
  }
  compileWithPrefix(prefix) {
    const { method, path, handler, name } = this;
    return new Route({
      method,
      path,
      name,
      handler,
      prefix
    });
  }
  call(...args) {
    return this.handler(...args);
  }
  test(method, path) {
    return this.pathMatches(path) && this.methodMatches(method);
  }
  pathMatches(path) {
    return this.regex.test(path);
  }
  methodMatches(method) {
    return this.method === '*' || method.toUpperCase() == this.method;
  }
  params(path, captures) {
    return captures.reduce((memo, value, i) => {
      let key = this.keys[i];
      if (key) memo[key.name] = value ? safeDecodeURIComponent(value) : value;
      return memo;
    }, {});
  }
}

class CompiledRoute extends Route {
  paramsMiddleware() {
    const paramsMiddleware = async (ctx, next) => {
      const { path } = ctx;
      ctx.captures = this.regex.exec(path).slice(1);
      ctx.params = {
        ...ctx.params,
        ...this.params(path, ctx.captures)
      };
      return compose(
        this.keys
          .map(key => this.paramHandlers[key.name])
          .filter(fn => fn)
      )(ctx, next);
    };
    return paramsMiddleware;
  }

}

module.exports = Route;


