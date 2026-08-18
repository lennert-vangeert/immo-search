import { Navigate, RouteObject } from "react-router-dom";

/**
 * immo-search is a private app — there is no public landing page. The locale
 * index just forwards to /app, where RequireAuth bounces signed-out visitors to
 * /login. (Relative "app" resolves under the /:maybeLang? segment.)
 */
export const publicRoutes: RouteObject[] = [
  { index: true, element: <Navigate to="app" replace /> },
];
