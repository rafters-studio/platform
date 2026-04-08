import { createRootRouteWithContext, Outlet } from "@tanstack/react-router";
import type { QueryClient } from "@tanstack/react-query";

export interface CtrlRouterContext {
  auth: {
    isAuthenticated: boolean;
    user: {
      id: string;
      name: string;
      email: string;
      image: string | null;
    } | null;
  };
  queryClient: QueryClient;
}

export const Route = createRootRouteWithContext<CtrlRouterContext>()({
  component: () => <Outlet />,
});
