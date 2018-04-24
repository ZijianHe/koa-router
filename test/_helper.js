const Router = require('../lib/router');

function create(...args) {
  return new Router(...args);
}

function request(middleware) {
  return {
    get: makeHandler('GET', middleware),
    post: makeHandler('POST', middleware),
    put: makeHandler('PUT', middleware),
    patch: makeHandler('PATCH', middleware),
    options: makeHandler('OPTIONS', middleware),
    search: makeHandler('SEARCH', middleware),
  };
}

function createContext() {
  const headers = {};
  return Object.create({
    headers,
    set: (name, value) => headers[name] = value,
    throw: (msg) => { throw new Error(msg) },
    redirect: (path) => headers['Location'] = path,
  });
}

function makeHandler(method, middleware) {
  return async (path, upstreamContext = {}) => {
    const ctx = Object.assign(createContext(), {
      method,
      path,
      ...upstreamContext
    });
    await middleware(ctx);
    return ctx;
  };
}

module.exports = {
  create,
  request,
};
