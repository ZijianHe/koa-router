const inspectRouter = (router, options = {}) => {
  const { depth = 0, prefixToken = '  ' } = options;
  const prefix = options.prefix || prefixToken.repeat(depth);
  let nestedPrefix = `${prefix}│   `;
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
};

const childrenToString = (router, depth) => {
  return router.children.map(child => inspectRouter(child, { depth })).join('');
};

const routesToString = (router, prefix) => {
  return router.compileRoutes().map((route, i, routes) => {
    let header = '├──';
    if (i === routes.length - 1) {
      header = '└──';
    }
    const padEnd = Math.max(...routes.map(r => r.path.length));
    return `${prefix}${header} ${inspectRoute(route, padEnd)}`;
  }).join('\n');
};

const middlewareToString = (router, prefix) => {
  return router.middleware.map((fn, i, middleware) => {
    let header = '├──';
    if (i === middleware.length - 1) {
      header = '└──';
    }
    return `${prefix}${header} ${fn.name || 'anonymous'}`;
  }).join('\n');
};

const paramHandlersToString = (router, prefix) => {
  return Object.keys(router.paramHandlers).map((name, i, names) => {
    let header = '├──';
    if (i === names.length - 1) {
      header = '└──';
    }
    return `${prefix}${header} ${name}:\t${router.paramHandlers[name].name || 'anonymous'}`;
  }).join('\n');
};

const inspectRoute = (route, padEnd) => {
  const { method, path, handler } = route;
  return `${method.padStart(7, ' ')}  ${path.padEnd(padEnd, ' ')}  ${handler.name || ''}`;
};

module.exports = inspectRouter;
