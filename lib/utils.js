'use strict';

const convert = require('koa-convert');
const is = require('is-type-of');
const co = require('co');

module.exports = {
  async callFn(fn, args, ctx) {
    args = args || [];
    if (!is.function(fn)) return;
    if (is.generatorFunction(fn)) fn = co.wrap(fn);
    return ctx ? fn.call(ctx, ...args) : fn(...args);
  },

  middleware(fn) {
    return is.generatorFunction(fn) ? convert(fn) : fn;
  },
};
