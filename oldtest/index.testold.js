/**
 * Module tests
 */

const Router = require('..');

describe('module', function() {
  it('exposes Router', () => {
    expect(Router).to.be.typeof('function');
  });
});
