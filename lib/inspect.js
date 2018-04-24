const headerForIteration = (array, i) => (
  i === array.length - 1 ? '└──' : '├──'
);

const middlewareToString = (router, prefix) => (
  router.middleware
    .map((fn, i, middleware) => {
      const header = headerForIteration(middleware, i);
      return `${prefix}${header} ${fn._name || fn.name || 'anonymous'}`;
    })
    .join('\n')
);

const inspectRoute = (route, padEnd) => {
  const { method, path, handler } = route;
  return `${method.padStart(7, ' ')}\
  ${path.padEnd(padEnd, ' ')}\
  ${(route.name || '').padEnd(padEnd, '  ')}\
  ${route.regex.toString().padEnd(50, ' ')}\t${handler.name || ''}`;
};

const routesToString = (router, prefix) => (
  router
    .compile()
    .map((route, i, routes) => {
      const header = headerForIteration(routes, i);
      const padEnd = Math.max(...routes.map(r => r.path.length));
      return `${prefix}${header} ${inspectRoute(route, padEnd)}`;
    })
    .join('\n')
);

const childrenToString = (router, depth) => (
  router.children
    .map(child => inspectRouter(child, { depth }))
    .join('')
);

function inspectRouter(router, options = {}) {
  const { depth = 0, padToken = '  ' } = options;
  const padding = options.padding || padToken.repeat(depth);
  const nestedPadding = `${padding}│   `;
  const routesString = routesToString(router, nestedPadding);
  const { isWrapper } = router;

  let tree = `
${padding}* ${router.name || 'Router'}`;

  if (!isWrapper) {
    tree += `
${router.prefix ? `\n${padding}├── prefix: ${router.prefix} ` : ''}${padding}├── middleware ${
  router.middleware.length ? `\n${middlewareToString(router, nestedPadding)}` : ''
}
${padding}├── routes ${
  routesString ? `\n${routesString}` : ''
}`;
  }

  tree += `
${padding}└── nested ${
  router.children.length ? `${childrenToString(router, depth + 2)}` : ''
}`;

  return tree;
}

module.exports = inspectRouter;
