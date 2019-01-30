'use strict';

const utils = require('../../lib/utils');
const is = require('is-type-of');
const assert = require('assert');

describe('test/lib/utils.test.js', () => {
  describe('callFn', () => {
    it('should not function return same', () => {
      const res = utils.callFn('foo');
      assert(is.promise(res));
      return res.then(result => assert(result === undefined));
    });

    it('should async function return promise', () => {
      const res = utils.callFn(async (foo, bar) => {
        return foo + bar;
      }, [ 1, 2 ]);
      assert(is.promise(res));
      return res.then(result => assert(result === 3));
    });

    it('should generator function return promise', () => {
      const res = utils.callFn(function* (foo, bar) {
        return foo + bar;
      }, [ 1, 2 ]);
      assert(is.promise(res));
      return res.then(result => assert(result === 3));
    });

    it('should common function return promise', () => {
      const res = utils.callFn((foo, bar) => {
        return foo + bar;
      }, [ 1, 2 ]);
      assert(is.promise(res));
      return res.then(result => assert(result === 3));
    });

    it('should work with ctx', () => {
      const res = utils.callFn(async function(bar) {
        return this.foo + bar;
      }, [ 2 ], { foo: 1 });
      assert(is.promise(res));
      return res.then(result => assert(result === 3));
    });
  });

  describe('middleware', () => {
    it('should work with async function', () => {
      const res = utils.middleware(async () => {});
      assert(is.asyncFunction(res));
    });

    it('should work with generator function', () => {
      const res = utils.middleware(function* () { });
      assert(!is.generatorFunction(res));
    });
  });
});
