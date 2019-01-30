/**
 * Module tests
 */

const assert = require('assert');
const Router = require('..');

describe('test/index.test.js', () => {
  it('should expose Router', () => {
    assert(typeof Router === 'function');
    assert(typeof Router.KoaRouter === 'function');
    assert(typeof Router.EggRouter === 'function');
  });
});
