import { indexBy, map, prop } from 'ramda'

import GraphQLError from '../utils/GraphQLError'

const getAppId = (): string => {
  return process.env.VTEX_APP_ID ?? ''
}

const SCHEMA_VERSION = 'v6.9'

const routes = {
  baseUrl: (account: string) =>
    `http://${account}.vtexcommercestable.com.br/api`,
  orderForm: (account: string) =>
    `${routes.baseUrl(account)}/checkout/pub/orderForm`,
  checkoutConfig: (account: string) =>
    `${routes.baseUrl(account)}/checkout/pvt/configuration/orderForm`,
  cartEntity: (account: string) =>
    `${routes.baseUrl(account)}/dataentities/cart`,
  listCarts: (account: string, email: string) =>
    `${routes.cartEntity(
      account
    )}/search?email=${email}&_schema=${SCHEMA_VERSION}&_fields=id,email,cartName,status,description,items,creationDate,subtotal,discounts,taxes,shipping,total,customData,address&_sort=creationDate DESC`,
  getCart: (account: string, id: string) =>
    `${routes.cartEntity(
      account
    )}/documents/${id}?_fields=id,email,cartName,status,description,items,creationDate,subtotal,discounts,shipping,taxes,total,customData,address`,

  saveSchema: (account: string) =>
    `${routes.cartEntity(account)}/schemas/${SCHEMA_VERSION}`,
  clearCart: (account: string, id: string) =>
    `${routes.orderForm(account)}/${id}/items/removeAll`,
  addToCart: (account: string, orderFormId: string) =>
    `${routes.orderForm(account)}/${orderFormId}/items/`,
  addCustomData: (account: string, orderFormId: string, appId: string) =>
    `${routes.orderForm(account)}/${orderFormId}/customData/${appId}`,
  addPriceToItems: (account: string, orderFormId: string) =>
    `${routes.orderForm(account)}/${orderFormId}/items/update`,
}

const schema = {
  properties: {
    email: {
      type: 'string',
      title: 'Email',
    },
    cartName: {
      type: 'string',
      title: 'Cart Name',
    },
    status: {
      type: ['null', 'string'],
      title: 'Status',
    },
    description: {
      type: ['null', 'string'],
      title: 'Description',
    },
    items: {
      type: 'array',
      title: 'Cart',
    },
    creationDate: {
      type: 'string',
      title: 'Creation Date',
    },
    cartLifeSpan: {
      type: 'string',
      title: 'Cart Life Span',
    },
    subtotal: {
      type: 'number',
      title: 'Subtotal',
    },
    discounts: {
      type: 'integer',
      title: 'Discounts',
    },
    shipping: {
      type: 'integer',
      title: 'Shipping',
    },
    taxes: {
      type: ['null', 'integer'],
      title: 'Taxes',
    },
    customData: {
      type: ['null', 'object'],
      title: 'Custom Data',
    },
    total: {
      type: 'number',
      title: 'Total',
    },
  },
  'v-indexed': ['email', 'creationDate', 'cartLifeSpan', 'cartName', 'status'],
  'v-default-fields': ['email', 'cart', 'creationDate', 'cartLifeSpan'],
  'v-cache': false,
}

const defaultSettings = {
  adminSetup: {
    cartLifeSpan: 30,
    storeLogoUrl: '',
    hasSchema: false,
    allowManualPrice: false,
    schemaVersion: null,
  },
}

const defaultHeaders = (authToken: string) => ({
  'Content-Type': 'application/json',
  Accept: 'application/vnd.vtex.ds.v10+json',
  VtexIdclientAutCookie: authToken,
  'Proxy-Authorization': authToken,
})

export const resolvers = {
  Query: {
    getSetupConfig: async (_: any, __: any, ctx: any) => {
      const {
        vtex: { account, authToken },
        clients: { hub, apps },
      } = ctx

      const app: string = getAppId()
      let settings = await apps.getAppSettings(app)

      if (!settings.adminSetup) {
        settings = defaultSettings
      }

      if (
        !settings.adminSetup.hasSchema ||
        settings.adminSetup.schemaVersion !== SCHEMA_VERSION
      ) {
        try {
          const url = routes.saveSchema(account)
          const headers = defaultHeaders(authToken)

          await hub.put(url, schema, headers)

          settings.adminSetup.hasSchema = true
          settings.adminSetup.schemaVersion = SCHEMA_VERSION
        } catch (e) {
          if (e.response.status >= 400) {
            settings.adminSetup.hasSchema = false
          } else {
            settings.adminSetup.hasSchema = true
            settings.adminSetup.schemaVersion = SCHEMA_VERSION
          }
        }
      }

      if (!settings.adminSetup.allowManualPrice) {
        try {
          settings.adminSetup.allowManualPrice = true
          const url = routes.checkoutConfig(account)
          const headers = defaultHeaders(authToken)

          const { data: checkoutConfig } = await hub.get(url, headers, schema)

          if (checkoutConfig.allowManualPrice !== true) {
            await hub.post(
              url,
              JSON.stringify({
                ...checkoutConfig,
                allowManualPrice: true,
              }),
              headers
            )
          }
        } catch (e) {
          settings.adminSetup.allowManualPrice = false
        }
      }

      await apps.saveAppSettings(app, settings)

      return settings
    },
    getCarts: async (_: any, params: any, ctx: any) => {
      const {
        vtex: ioContext,
        clients: { hub },
      } = ctx

      const { account, authToken } = ioContext
      const headers = {
        ...defaultHeaders(authToken),
        'REST-Range': `resources=0-100`,
        Pragma: 'no-cache',
        'Cache-Control': 'no-cache',
      }

      const url = routes.listCarts(account, encodeURIComponent(params.email))

      try {
        const { data } = await hub.get(url, headers)

        return data
      } catch (e) {
        if (e.message) {
          throw new GraphQLError(e.message)
        } else if (e.response && e.response.data && e.response.data.message) {
          throw new GraphQLError(e.response.data.message)
        }
      }
    },
    currentTime: async (_: any, __: any, ___: any) => {
      return new Date().toISOString()
    },
  },
  Mutation: {
    clearCart: async (_: any, params: any, ctx: any) => {
      const {
        vtex: ioContext,
        clients: { hub },
      } = ctx

      const { account } = ioContext

      try {
        // CLEAR CURRENT CART
        await hub.post(routes.clearCart(account, params.orderFormId), {
          expectedOrderFormSections: ['items'],
        })
      } catch (e) {
        if (e.message) {
          throw new GraphQLError(e.message)
        } else if (e.response && e.response.data && e.response.data.message) {
          throw new GraphQLError(e.response.data.message)
        }
      }
    },
    useCart: async (_: any, params: any, ctx: any) => {
      const {
        vtex: ioContext,
        clients: { hub },
      } = ctx

      const { account, logger } = ioContext

      try {
        // CLEAR CURRENT CART
        await hub.post(routes.clearCart(account, params.orderFormId), {
          expectedOrderFormSections: ['items'],
        })

        // ADD ITEMS TO CART
        // const {
        //   data: { items: itemsAdded },
        // }
        const data = await hub
          .post(routes.addToCart(account, params.orderFormId), {
            expectedOrderFormSections: ['items'],
            orderItems: params.items.map((item: any) => {
              return {
                id: item.id,
                quantity: item.quantity,
                seller: item.seller || '1',
              }
            }),
          })
          .then((res: any) => {
            return res.data
          })

        const { items: itemsAdded } = data

        const sellingPriceMap = indexBy(
          prop('id'),
          map(
            (item: any) => ({
              id: item.id,
              price: item.sellingPrice,
            }),
            params.items
          )
        )

        const orderItems: any[] = []

        itemsAdded.forEach((item: any, key: number) => {
          orderItems.push({
            index: key,
            quantity: null,
            price: prop(item.id, sellingPriceMap).price,
          })
        })

        const token = ctx.cookies.get(`VtexIdclientAutCookie`)

        const useHeaders = {
          'Content-Type': 'application/json',
          Cookie: `VtexIdclientAutCookie=${token};`,
        }

        try {
          await hub.post(
            routes.addPriceToItems(account, params.orderFormId),
            {
              orderItems,
            },
            useHeaders
          )
        } catch (err) {
          logger.error(err)
        }

        if (params.customData && params.customData.customApps.length) {
          await Promise.all(
            params.customData.customApps.map(
              (app: { id: string; fields: any }) =>
                hub.put(
                  routes.addCustomData(account, params.orderFormId, app.id),
                  app.fields,
                  useHeaders
                )
            )
          )
        }
      } catch (e) {
        if (e.message) {
          throw new GraphQLError(e.message)
        } else if (e.response && e.response.data && e.response.data.message) {
          throw new GraphQLError(e.response.data.message)
        }
      }
    },
    orderQuote: async (_: any, params: any, ctx: any) => {
      const {
        vtex: { authToken },
        clients: { masterdata },
      } = ctx

      const headers = defaultHeaders(authToken)

      try {
        const data = await masterdata
          .createDocument(
            {
              dataEntity: 'cart',
              fields: params.cart,
            },
            {
              options: { headers },
            }
          )
          .then((res: any) => res)

        return data.Id
      } catch (e) {
        if (e.message) {
          throw new GraphQLError(e.message)
        } else if (e.response && e.response.data && e.response.data.message) {
          throw new GraphQLError(e.response.data.message)
        }
      }
    },

    getCarts: async (_: any, params: any, ctx: any) => {
      const {
        vtex: ioContext,
        clients: { hub },
      } = ctx

      const { account, authToken } = ioContext
      const headers = {
        ...defaultHeaders(authToken),
        'REST-Range': `resources=0-100`,
        Pragma: 'no-cache',
        'Cache-Control': 'no-cache',
      }

      const url = routes.listCarts(account, encodeURIComponent(params.email))

      try {
        const { data } = await hub.get(url, headers)

        return data
      } catch (e) {
        if (e.message) {
          throw new GraphQLError(e.message)
        } else if (e.response && e.response.data && e.response.data.message) {
          throw new GraphQLError(e.response.data.message)
        }
      }
    },

    getCart: async (_: any, params: any, ctx: any) => {
      const {
        vtex: ioContext,
        clients: { hub },
      } = ctx

      const { account, authToken } = ioContext

      const headers = {
        ...defaultHeaders(authToken),
        'REST-Range': `resources=0-100`,
      }

      const url = routes.getCart(account, encodeURIComponent(params.id))

      try {
        const { data } = await hub.get(url, headers)

        return data
      } catch (e) {
        if (e.message) {
          throw new GraphQLError(e.message)
        } else if (e.response && e.response.data && e.response.data.message) {
          throw new GraphQLError(e.response.data.message)
        }
      }
    },

    removeCart: async (_: any, params: any, ctx: any) => {
      const {
        clients: { masterdata },
      } = ctx

      try {
        const result = await masterdata
          .deleteDocument({
            dataEntity: 'cart',
            id: params.id,
          })
          .then((res: any) => res)

        if (result.status === 204) {
          return true
        }
      } catch (e) {
        if (e.message) {
          throw new GraphQLError(e.message)
        } else if (e.response && e.response.data && e.response.data.message) {
          throw new GraphQLError(e.response.data.message)
        }
      }

      return false
    },
  },
}
