import { createFileRoute, redirect, Outlet } from "@tanstack/react-router";

export const Route = createFileRoute("/_ctrl")({
  beforeLoad: ({ context, location }) => {
    if (!context.auth.isAuthenticated) {
      throw redirect({
        to: "/login",
        search: {
          returnUrl: location.href,
        },
      });
    }
  },
  component: CtrlLayout,
});

function CtrlLayout() {
  return (
    <div>
      <Outlet />
    </div>
  );
}
