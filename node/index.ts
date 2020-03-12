import { ClientsConfig, LRUCache, Service, ServiceContext } from '@vtex/api'
import { Clients } from './clients'
import { json } from 'co-body'

import { resolvers } from './graphql'

const setDefaultHeaders = (ctx: any) => {
  ctx.set('Access-Control-Allow-Origin', '*')
  ctx.set('Access-Control-Allow-Methods', 'POST, GET, DELETE, OPTIONS')
  ctx.set(
    'Access-Control-Allow-Headers',
    'Origin, X-Requested-With, Content-Type, Accept, authorization'
  )
  ctx.set('Cache-Control', 'no-cache')
}

const TIMEOUT_MS = 800

// Create a LRU memory cache for the Status client.
// The @vtex/api HttpClient respects Cache-Control headers and uses the provided cache.
const memoryCache = new LRUCache<string, any>({ max: 5000 })
metrics.trackCache('status', memoryCache)

// This is the configuration for clients available in `ctx.clients`.
const clients: ClientsConfig<Clients> = {
  // We pass our custom implementation of the clients bag, containing the Status client.
  implementation: Clients,
  options: {
    // All IO Clients will be initialized with these options, unless otherwise specified.
    default: {
      retries: 2,
      timeout: TIMEOUT_MS,
    },
    // This key will be merged with the default options and add this cache to our Status client.
    status: {
      memoryCache,
    },
  },
}

declare global {
  // We declare a global Context type just to avoid re-writing ServiceContext<Clients, State> in every handler and resolver
  type Context = ServiceContext<Clients, State>

  // The shape of our State object found in `ctx.state`. This is used as state bag to communicate between middlewares.
  interface State {
    code: number
  }
}
// Export a service that defines route handlers and client options.
export default new Service<Clients, State>({
  clients,
  graphql: {
    resolvers,
  },
  routes: {
    orderQuote: async (ctx: any) => {
      setDefaultHeaders(ctx)
      try {
        ctx.body = await resolvers.Mutation.orderQuote(
          {},
          {
            cart: await json(ctx.req),
          },
          ctx
        )
        ctx.status = 200
      } catch (e) {
        ctx.body = e
        ctx.status = 500
      }
    },
    removeCart: async (ctx: any) => {
      setDefaultHeaders(ctx)
      try {
        const { cartName, expired } = await json(ctx.req)
        const { cartId: id } = ctx.vtex.route.params

        ctx.body = await resolvers.Mutation.removeCart(
          {},
          {
            cartName,
            expired,
            id,
          },
          ctx
        )
        ctx.status = 200
      } catch (e) {
        ctx.body = e
        ctx.status = 500
      }
    },
    useCart: async (ctx: any) => {
      setDefaultHeaders(ctx)
      try {
        const { items, userType } = await json(ctx.req)
        const { orderFormId } = ctx.vtex.route.params

        ctx.body = await resolvers.Mutation.useCart(
          {},
          {
            items,
            userType,
            orderFormId,
          },
          ctx
        )
        ctx.status = 200
      } catch (e) {
        ctx.body = e
        ctx.status = 500
      }
    },
  },
})
