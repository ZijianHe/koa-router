const test = require('ava');
const { create, request } = require('./_helper');

test('redirects from path to path', async t => {
  const router = create();
  const ctx = {
    redirect: (path) => t.is(path, '/newpage')
  };
  router.get('/newpage', () => {});
  router.redirect('/oldpage', '/newpage');

  await request(router.routes()).get('/oldpage', ctx);
});

test('redirects named route to named route', async t => {
  const router = create();
  const ctx = {
    redirect: (path) => t.is(path, '/newpage')
  };
  router.get('new-page', '/newpage', () => {});
  router.redirect('/oldpage', 'new-page');

  await request(router.routes()).get('/oldpage', ctx);
});

test('defaults to 301 status', async t => {
  const router = create();
  const ctx = {
    redirect: () => {}
  };
  router.get('/newpage', () => {});
  router.redirect('/oldpage', '/newpage');

  const { status } = await request(router.routes()).get('/oldpage', ctx);

  t.is(status, 301);
});

test('redirects with provided status code', async t => {
  t.plan(2);
  const router = create();
  const ctx = {
    redirect: (path) => t.is(path, '/newpage')
  };
  router.get('/newpage', () => {});
  router.redirect('/oldpage', '/newpage', 302);

  const { status } = await request(router.routes()).get('/oldpage', ctx);

  t.is(status, 302);
});



// describe('Router#redirect()', function () {
//     it('registers redirect routes', function (done) {
//       var app = new Koa();
//       var router = new Router();
//       router.should.have.property('redirect');
//       router.redirect.should.be.type('function');
//       router.redirect('/source', '/destination', 302);
//       app.use(router.routes());
//       router.stack.should.have.property('length', 1);
//       router.stack[0].should.be.instanceOf(Layer);
//       router.stack[0].should.have.property('path', '/source');
//       done();
//     });

//     it('redirects using route names', function (done) {
//       var app = new Koa();
//       var router = new Router();
//       app.use(router.routes());
//       router.get('home', '/', function () {});
//       router.get('sign-up-form', '/sign-up-form', function () {});
//       router.redirect('home', 'sign-up-form');
//       request(http.createServer(app.callback()))
//         .post('/')
//         .expect(301)
//         .end(function (err, res) {
//           if (err) return done(err);
//           res.header.should.have.property('location', '/sign-up-form');
//           done();
//         });
//     });
//   });
