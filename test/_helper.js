const Router = require('../lib/router');

function create(...args) {
  return new Router(...args);
}

function request(middleware) {
  return {
    get: makeHandler('GET', middleware),
    post: makeHandler('POST', middleware),
    patch: makeHandler('PATCH', middleware),
  };
}

function makeHandler(method, middleware) {
  return async (path, upstreamContext = {}) => {
    const ctx = Object.assign({ method, path }, upstreamContext);
    await middleware(ctx);
    return ctx;
  };
}

module.exports = {
  create,
  request,
};
