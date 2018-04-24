const pathToRegexp = require('path-to-regexp');
const { URLSearchParams } = require('url');

const decode = value => (
  value ? safeDecodeURIComponent(value) : value
);

class Route {
  constructor({
    method, prefix, path, handler, name, strict, sensitive,
  }) {
    this.strict = !!strict;
    this.sensitive = !!sensitive;
    this.method = method.toUpperCase();
    this.path = `${prefix || ''}${path === '*' && prefix ? '(/*|/.*)' : path}`;
    this.name = name;
    this.handler = handler;
    this.keys = [];
    this.regex = pathToRegexp(this.path, this.keys, {
      strict: this.strict,
      sensitive: this.sensitive,
    });
    this.toPath = pathToRegexp.compile(this.path);
  }

  compile({ prefix }) {
    return new Route({
      ...this,
      prefix,
    });
  }

  call(...args) {
    return this.handler(...args);
  }

  capture(path) {
    return this.regex.exec(path).slice(1);
  }

  testPath(path) {
    return this.regex.test(path);
  }

  testMethod(method) {
    return this.method === '*' || method.toUpperCase() === this.method;
  }

  constructParamsFromCaptures(captures) {
    return captures.reduce((memo, value, i) => ({
      ...memo,
      [this.keys[i].name]: decode(value),
    }), {});
  }

  queryString(params) {
    const routeKeyNames = this.keyNames;
    const query = new URLSearchParams();

    Object.keys(params)
      .filter(key => !routeKeyNames.includes(key))
      .forEach(key => query.append(key, params[key]));

    return query.toString();
  }

  get keyNames() {
    return this.keys.map(key => key.name);
  }

  toPathWithParams(...args) {
    let params;

    if (args.length === 1 && (isPlainObject(args[0]) || typeof args[0] === 'undefined')) {
      [params] = args;
    } else if (args.length >= this.keys.length) {
      params = this.makeParamsFromPositionalArgs(args);
    } else {
      throw new Error(`wrong number of param arguments for route: ${args.length} for ${this.keys.length}`);
    }

    return [
      this.toPath(params),
      this.queryString(params),
    ].filter(i => i).join('?');
  }

  makeParamsFromPositionalArgs(args) {
    const params = {};
    this.keys.forEach((key, i) => { params[key.name] = args[i]; });
    return params;
  }
}

module.exports = Route;

function safeDecodeURIComponent(text) {
  try {
    return decodeURIComponent(text);
  } catch (e) {
    return text;
  }
}

function isPlainObject(thing) {
  return {}.toString.call(thing) === '[object Object]';
}
