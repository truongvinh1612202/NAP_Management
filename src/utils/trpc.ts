import { QueryClient } from '@tanstack/react-query';
import { createTRPCClient, httpBatchLink, loggerLink } from '@trpc/client';
import { createTRPCOptionsProxy } from '@trpc/tanstack-react-query';
import type { AppRouter } from '../../electron/router';
import { IpcRequest } from '../../electron/api';
import { SuperJSON } from 'superjson';
export const queryClient = new QueryClient();
const trpcClient = createTRPCClient<AppRouter>({
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
});
export const trpc = createTRPCOptionsProxy<AppRouter>({
  client: trpcClient,
  queryClient,
});