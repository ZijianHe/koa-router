/**
 * Module tests
 */

var koa = require('koa')
  , should = require('should');

describe('module', function() {
  it('should expose Router', function(done) {
    var Router = require('..');
    should.exist(Router);
    Router.should.be.a('function');
    done();
  });
});
