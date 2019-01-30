'use strict';

const KoaRouter = require('./lib/router');
const EggRouter = require('./lib/egg_router');

// for compact
module.exports = KoaRouter;
module.exports.KoaRouter = KoaRouter;
module.exports.EggRouter = EggRouter;

