import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { render } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import App from "../../App";
import { useAuth } from "../../store/auth";

export function makeQueryClient() {
  return new QueryClient({
    defaultOptions: {
      queries: { retry: false },
      mutations: { retry: false },
    },
  });
}

export function renderApp({ route = "/", user = null, pendingEmail = null, status } = {}) {
  useAuth.setState({
    user,
    status: status ?? (user ? "authenticated" : "anonymous"),
    pendingEmail,
  });

  const queryClient = makeQueryClient();

  return {
    queryClient,
    ...render(
      <QueryClientProvider client={queryClient}>
        <MemoryRouter
          future={{ v7_relativeSplatPath: true, v7_startTransition: true }}
          initialEntries={[route]}
        >
          <App />
        </MemoryRouter>
      </QueryClientProvider>
    ),
  };
}
