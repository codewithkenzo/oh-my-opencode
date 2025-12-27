export const GLARE_DESCRIPTION = `Capture screenshots and interact with browser pages via the glare relay.

Actions:
- start: Start the relay server
- screenshot: Capture full-page screenshot
- navigate: Go to a URL
- snapshot: Get ARIA accessibility tree
- info: Get relay server status
- console: Get browser console logs. Use level param: error, warn, or all (default)
- styles: Get computed styles for an element (requires selector)
- network: Get recent network requests
- eval: Execute JavaScript in browser context (requires script)
- source: Get page HTML source (for copying website designs)
- click: Click an element (requires selector)
- markdown: Convert current page to clean markdown (removes scripts/styles)

Framework-aware debugging:
- detect: Auto-detect framework (Next.js, Nuxt, React, Vue, TanStack)
- state: Extract framework state (__NEXT_DATA__, __NUXT__, Redux/Pinia stores)
- tree: Get React/Vue component tree
- queries: TanStack Query cache inspection
- routes: Router state (Next/Nuxt/TanStack Router)

Requires glare skill installed and relay running.`

export const RELAY_URL = "http://localhost:9222"

export const FRAMEWORK_DETECT_SCRIPT = `(() => {
  const detected = [];
  if (window.__TSS_START_OPTIONS__ || window.__TANSTACK_START__) detected.push('tanstack-start');
  if (window.__NEXT_DATA__ || window.next) detected.push('next');
  if (window.__NUXT__ || window.$nuxt) detected.push('nuxt');
  if (window.__REACT_DEVTOOLS_GLOBAL_HOOK__) detected.push('react');
  if (window.__VUE_DEVTOOLS_GLOBAL_HOOK__ || window.__VUE__) detected.push('vue');
  if (window.__TANSTACK_ROUTER_DEVTOOLS__ || window.__TANSTACK_ROUTER__) detected.push('tanstack-router');
  if (window.__TANSTACK_QUERY_DEVTOOLS__) detected.push('tanstack-query');
  return { frameworks: detected, primary: detected[0] || 'unknown' };
})()`

export const FRAMEWORK_STATE_SCRIPTS: Record<string, string> = {
  next: `(() => {
    const state = {};
    if (window.__NEXT_DATA__) state.nextData = window.__NEXT_DATA__;
    if (window.next?.router) {
      state.router = {
        pathname: window.next.router.pathname,
        query: window.next.router.query,
        asPath: window.next.router.asPath,
      };
    }
    return state;
  })()`,
  nuxt: `(() => {
    const state = {};
    if (window.__NUXT__) state.nuxtPayload = window.__NUXT__;
    if (window.$nuxt) {
      state.route = window.$nuxt.$route;
      if (window.$nuxt.$pinia) state.pinia = Object.fromEntries(
        Object.entries(window.$nuxt.$pinia.state.value).map(([k,v]) => [k, v])
      );
    }
    return state;
  })()`,
  react: `(() => {
    const state = { stores: {} };
    if (window.__REDUX_DEVTOOLS_EXTENSION__) {
      try { state.stores.redux = window.__REDUX_DEVTOOLS_EXTENSION__.getState?.(); } catch {}
    }
    if (window.__ZUSTAND_DEVTOOLS__) state.stores.zustand = 'detected';
    return state;
  })()`,
  vue: `(() => {
    const state = {};
    if (window.__VUE_DEVTOOLS_GLOBAL_HOOK__?.apps?.[0]) {
      const app = window.__VUE_DEVTOOLS_GLOBAL_HOOK__.apps[0];
      state.appId = app.id;
    }
    if (window.$nuxt?.$pinia) {
      state.pinia = Object.fromEntries(
        Object.entries(window.$nuxt.$pinia.state.value).map(([k,v]) => [k, v])
      );
    }
    return state;
  })()`,
  tanstack: `(() => {
    return { detected: true, note: 'Use queries/routes actions for detailed inspection' };
  })()`,
  "tanstack-start": `(() => {
    const state = { framework: 'TanStack Start' };
    if (window.__TSS_START_OPTIONS__) state.startOptions = window.__TSS_START_OPTIONS__;
    if (window.__TSS_DATA__) state.data = window.__TSS_DATA__;
    if (window.__TANSTACK_ROUTER__) state.router = 'detected';
    return state;
  })()`,
  unknown: `(() => ({ error: 'No framework detected' }))()`
}

export const COMPONENT_TREE_SCRIPTS: Record<string, string> = {
  react: `(() => {
    const hook = window.__REACT_DEVTOOLS_GLOBAL_HOOK__;
    if (!hook?.renderers) return { error: 'React DevTools not available' };
    const renderer = hook.renderers.values().next().value;
    if (!renderer) return { error: 'No React renderer found' };
    const roots = [];
    hook.getFiberRoots?.(renderer.rendererPackageName || 1)?.forEach(root => {
      const traverse = (fiber, depth = 0) => {
        if (!fiber || depth > 10) return null;
        const name = fiber.type?.displayName || fiber.type?.name || fiber.type || 'Unknown';
        if (typeof name !== 'string') return null;
        const node = { name, depth };
        if (fiber.memoizedProps) node.props = Object.keys(fiber.memoizedProps);
        const children = [];
        let child = fiber.child;
        while (child) {
          const c = traverse(child, depth + 1);
          if (c) children.push(c);
          child = child.sibling;
        }
        if (children.length) node.children = children;
        return node;
      };
      roots.push(traverse(root.current));
    });
    return { tree: roots[0] || null };
  })()`,
  vue: `(() => {
    const hook = window.__VUE_DEVTOOLS_GLOBAL_HOOK__;
    if (!hook?.apps?.length) return { error: 'Vue DevTools not available' };
    const app = hook.apps[0];
    const traverse = (instance, depth = 0) => {
      if (!instance || depth > 10) return null;
      const name = instance.type?.name || instance.type?.__name || 'Anonymous';
      const node = { name, depth };
      if (instance.props) node.props = Object.keys(instance.props);
      const children = instance.subTree?.children?.map(c => traverse(c.component, depth + 1)).filter(Boolean) || [];
      if (children.length) node.children = children;
      return node;
    };
    return { tree: traverse(app._instance) };
  })()`,
  unknown: `(() => ({ error: 'Use framework param: react or vue' }))()`
}

export const TANSTACK_QUERY_SCRIPT = `(() => {
  const caches = [];
  if (window.__TANSTACK_QUERY_DEVTOOLS__?.client) {
    const client = window.__TANSTACK_QUERY_DEVTOOLS__.client;
    const queries = client.getQueryCache().getAll();
    return {
      queries: queries.map(q => ({
        queryKey: q.queryKey,
        state: q.state.status,
        dataUpdatedAt: q.state.dataUpdatedAt,
        staleTime: q.options.staleTime,
        hasData: q.state.data !== undefined,
      }))
    };
  }
  const tryFindClient = () => {
    const scripts = document.querySelectorAll('script');
    for (const s of scripts) {
      if (s.textContent?.includes('queryClient')) return true;
    }
    return false;
  };
  return { detected: tryFindClient(), queries: [], note: 'TanStack Query DevTools not exposed' };
})()`

export const ROUTER_STATE_SCRIPTS: Record<string, string> = {
  next: `(() => {
    if (!window.next?.router) return { error: 'Next.js router not found' };
    const r = window.next.router;
    return {
      pathname: r.pathname,
      route: r.route,
      query: r.query,
      asPath: r.asPath,
      basePath: r.basePath,
      locale: r.locale,
      isReady: r.isReady,
    };
  })()`,
  nuxt: `(() => {
    if (!window.$nuxt?.$route) return { error: 'Nuxt router not found' };
    const r = window.$nuxt.$route;
    return {
      path: r.path,
      name: r.name,
      params: r.params,
      query: r.query,
      fullPath: r.fullPath,
      hash: r.hash,
      matched: r.matched?.map(m => m.path),
    };
  })()`,
  tanstack: `(() => {
    if (!window.__TANSTACK_ROUTER_DEVTOOLS__?.router) {
      const state = document.querySelector('[data-tanstack-router]');
      if (!state) return { error: 'TanStack Router not found' };
    }
    const router = window.__TANSTACK_ROUTER_DEVTOOLS__?.router;
    if (!router) return { detected: true, note: 'Router detected but state not exposed' };
    return {
      location: router.state.location,
      matches: router.state.matches?.map(m => ({ id: m.id, pathname: m.pathname })),
    };
  })()`,
  unknown: `(() => ({ error: 'Use framework param: next, nuxt, or tanstack' }))()`
}
