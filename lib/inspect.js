const headerForIteration = (array, i) => (
  i === array.length - 1 ? '└──' : '├──'
);

const middlewareToString = (router, prefix) => (
  router.middleware
    .map((fn, i, middleware) => {
      const header = headerForIteration(middleware, i);
      return `${prefix}${header} ${fn.name || 'anonymous'}`;
    })
    .join('\n')
);

const paramHandlersToString = (router, prefix) => (
  Object.keys(router.paramHandlers)
    .map((name, i, names) => {
      const header = headerForIteration(names, i);
      return `${prefix}${header} ${name}:\t${router.paramHandlers[name].name || 'anonymous'}`;
    })
    .join('\n')
);

const inspectRoute = (route, padEnd) => {
  const { method, path, handler } = route;
  return `${method.padStart(7, ' ')}  ${path.padEnd(padEnd, ' ')}\t${route.regex.toString().padEnd(50, ' ')}\t${handler.name || ''}`;
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
  const { depth = 0, prefixToken = '  ' } = options;
  const prefix = options.prefix || prefixToken.repeat(depth);
  const nestedPrefix = `${prefix}│   `;
  const routesString = routesToString(router, nestedPrefix);

  return `
${prefix}* ${router.name || 'Router'} ${
  router.prefix ? `\n${prefix}├── prefix: ${router.prefix} ` : ''
}
${prefix}├── params ${
  Object.keys(router.paramHandlers).length ? `\n${paramHandlersToString(router, nestedPrefix)}` : ''
}
${prefix}├── middleware ${
  router.middleware.length ? `\n${middlewareToString(router, nestedPrefix)}` : ''
}
${prefix}├── routes ${
  routesString ? `\n${routesString}` : ''
}
${prefix}└── nested ${
  router.children.length ? `${childrenToString(router, depth + 2)}` : ''
}`;
}

module.exports = inspectRouter;
