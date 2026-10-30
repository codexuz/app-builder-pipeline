// Pages reachable without being inside a workspace; both apps' menus hide on these.
export const AUTH_ROUTES = new Set(['/login', '/forgot-password', '/reset-password', '/setup', '/app/onboarding'])

export const inWorkspaceArea = (path: string) => path === '/app' || path.startsWith('/app/')
