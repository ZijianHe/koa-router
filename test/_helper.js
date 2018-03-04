const Koa = require('koa');
const supertest = require('supertest');
const Router = require('../lib/router');

function request(app) {
  return supertest.agent(app.listen());
}

module.exports = {
  request,
};
