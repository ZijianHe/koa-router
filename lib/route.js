const pathToRegexp = require('path-to-regexp');

class Route {
  constructor({ method, prefix, path, handler, name }) {
    this.method = method.toUpperCase();
    this.path = `${prefix || ''}${path === '*' && prefix ? '(/*|/.*)' : path}`;
    this.name = name;
    this.handler = handler;
    this.keys = [];
    this.regex = pathToRegexp(this.path, this.keys);
    this.toPath = pathToRegexp.compile(this.path);
    // this.build = pathToRegexp.compile(this.path);
  }

  compile({ prefix }) {
    const { method, path, name, handler } = this;
    return new Route({ method, path, name, handler, prefix });
  }

  call(...args) {
    return this.handler(...args);
  }

  capture(path) {
    return this.regex.exec(path).slice(1);
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

  constructParamsFromCaptures(captures) {
    return captures.reduce((memo, value, i) => {
      memo[this.keys[i].name] = this.decode(value);
      return memo;
    }, {});
  }

  decode(value) {
    return value ? safeDecodeURIComponent(value) : value;
  }

  toPath(...args) {
    var replaced;

    if (typeof params != 'object') {
      args = Array.prototype.slice.call(arguments);
      if (typeof args[args.length - 1] == 'object') {
        options = args[args.length - 1];
        args = args.slice(0, args.length - 1);
      }
    }

    var tokens = pathToRegexp.parse(url);
    var replace = {};

    if (args instanceof Array) {
      for (var len = tokens.length, i=0, j=0; i<len; i++) {
        if (tokens[i].name) replace[tokens[i].name] = args[j++];
      }
    } else if (tokens.some(token => token.name)) {
      replace = params;
    } else {
      options = params;
    }

    replaced = toPath(replace);

    if (options && options.query) {
      var replaced = new uri(replaced)
      replaced.search(options.query);
      return replaced.toString();
    }

    return replaced;
  }

  url(...args) {
    return this.path(...args);
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
