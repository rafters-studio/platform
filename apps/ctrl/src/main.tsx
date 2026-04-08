import { StrictMode, useEffect, useState } from "react";
import { createRoot } from "react-dom/client";
import { createRouter, RouterProvider } from "@tanstack/react-router";
import { QueryClientProvider } from "@tanstack/react-query";
import { routeTree } from "./routeTree.gen";
import { queryClient } from "./lib/query-client";
import "./global.css";

const router = createRouter({
  routeTree,
  basepath: "/ctrl",
  context: {
    auth: undefined!,
    queryClient,
  },
  defaultPreloadStaleTime: 0,
});

declare module "@tanstack/react-router" {
  interface Register {
    router: typeof router;
  }
}

interface SessionUser {
  id: string;
  name: string;
  email: string;
  image: string | null;
}

interface SessionResponse {
  user: SessionUser;
  session: { id: string };
}

function App() {
  const [auth, setAuth] = useState<{
    isAuthenticated: boolean;
    user: SessionUser | null;
  }>({ isAuthenticated: false, user: null });
  const [pending, setPending] = useState(true);

  useEffect(() => {
    fetch("/api/auth/get-session", { credentials: "include" })
      .then(async (res) => {
        if (res.ok) {
          const data = (await res.json()) as SessionResponse;
          setAuth({ isAuthenticated: true, user: data.user });
        } else {
          setAuth({ isAuthenticated: false, user: null });
        }
      })
      .catch(() => {
        setAuth({ isAuthenticated: false, user: null });
      })
      .finally(() => setPending(false));
  }, []);

  if (pending) return null;

  return (
    <QueryClientProvider client={queryClient}>
      <RouterProvider router={router} context={{ auth, queryClient }} />
    </QueryClientProvider>
  );
}

const root = document.getElementById("root");
if (root) {
  createRoot(root).render(
    <StrictMode>
      <App />
    </StrictMode>,
  );
}
