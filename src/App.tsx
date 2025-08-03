import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { createTRPCClient, httpBatchLink, loggerLink } from '@trpc/client';
import { TRPCProvider } from './utils/trpc';
import { useEffect, useState } from 'react'
import Login from './pages/Login'
import Main from './pages/Main'

import './App.css'
// import type { AppRouter } from '../electron/router';
import SuperJSON from 'superjson';

import type { IpcRequest } from 'electron/api';
import { AppRouter } from 'electron/router';
// Define the IpcRequest type if not already imported
// type IpcRequest = {
//   url: string;
//   method: string;
//   headers?: HeadersInit;
//   body?: BodyInit | null;
// };

function makeQueryClient() {
  return new QueryClient({
    defaultOptions: {
      queries: {
        // With SSR, we usually want to set some default staleTime
        // above 0 to avoid refetching immediately on the client
        staleTime: 60 * 1000,
      },
    },
  });
}

let browserQueryClient: QueryClient | undefined = undefined;

function getQueryClient() {
  if (typeof window === 'undefined') {
    // Server: always make a new query client
    return makeQueryClient();
  } else {
    // Browser: make a new query client if we don't already have one
    // This is very important, so we don't re-make a new client if React
    // suspends during the initial render. This may not be needed if we
    // have a suspense boundary BELOW the creation of the query client
    if (!browserQueryClient) browserQueryClient = makeQueryClient();
    return browserQueryClient;
  }
}
const ProtectedRoute = ({ children }: { children: JSX.Element }) => {
  const isAuthenticated = sessionStorage.getItem('isAuthenticated') === 'true';
  
  if (!isAuthenticated) {
    return <Navigate to="/" replace />;
  }
  
  return children;
};

function App() {
  const queryClient = getQueryClient();
  const [trpcClient] = useState(() =>
    createTRPCClient<AppRouter>({
       links: [
        loggerLink(),
        httpBatchLink({
          url: '/trpc',

          // custom fetch implementation that sends the request over IPC to Main process
          fetch: async (input, init) => {
            const req: IpcRequest = {
              url: input instanceof URL ? input.toString() : typeof input === 'string' ? input : input.url,
              method: input instanceof Request ? input.method : init?.method!,
              headers: input instanceof Request ? input.headers : init?.headers!,
              body: input instanceof Request ? input.body : init?.body!,
            };

            const resp = await window.appApi.trpc(req);
            // Since all tRPC really needs is the JSON, and we already have the JSON deserialized,
            // construct a "fake" fetch Response object
            return {
              json: () => Promise.resolve(resp.body)
            }
          },

          transformer: SuperJSON
        }),
      ],
    }),
  );

  const [isLoaded, setIsLoaded] = useState(false);

  // Check authentication status on app load
  useEffect(() => {
    // This is just to ensure the app is properly initialized
    setIsLoaded(true);
  }, []);

  if (!isLoaded) {
    return <div className="flex justify-center items-center h-screen">Loading...</div>;
  }

  return (
    <QueryClientProvider client={queryClient}>
      <TRPCProvider trpcClient={trpcClient} queryClient={queryClient}>
        <Router>
          <Routes>
            <Route path="/" element={<Login />} />
            <Route 
              path="/main" 
              element={
                <ProtectedRoute>
                  <Main />
                </ProtectedRoute>
              } 
            />
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </Router>
      </TRPCProvider>
    </QueryClientProvider>
  );
}

export default App