import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/_ctrl/")({
  component: Dashboard,
});

function Dashboard() {
  const { auth } = Route.useRouteContext();

  return (
    <main>
      <h1>ctrl</h1>
      <p>Signed in as {auth.user?.name ?? auth.user?.email ?? "unknown"}</p>
    </main>
  );
}
