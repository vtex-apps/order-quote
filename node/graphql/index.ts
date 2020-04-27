import { Apps } from '@vtex/api'
import http from 'axios'
import { decode } from 'jsonwebtoken'
import { indexBy, map, prop } from 'ramda'
import { errorResponse } from '../utils/error'
import GraphQLError from '../utils/GraphQLError'

const getAppId = (): string => {
  return process.env.VTEX_APP_ID || ''
}

const SCHEMA_VERSION = 'v6.1'

const routes = {
  baseUrl: (account: string) =>
    `http://${account}.vtexcommercestable.com.br/api`,
  orderForm: (account: string) =>
    `${routes.baseUrl(account)}/checkout/pub/orderForm`,
  checkoutConfig: (account: string) =>
    `${routes.baseUrl(account)}/checkout/pvt/configuration/orderForm`,
  cartEntity: (account: string) =>
    `${routes.baseUrl(account)}/dataentities/cart`,
  cartDocuments: (account: string) => `${routes.cartEntity(account)}/documents`,
  orderQuote: (account: string) => routes.cartDocuments(account),
  listCarts: (account: string, email: string) =>
    `${routes.cartEntity(
      account
    )}/search?email=${email}&_schema=${SCHEMA_VERSION}&_fields=id,email,cartName,items,creationDate,subtotal,discounts,shipping,total,customData,address`,
  getCart: (account: string, id: string) =>
    `${routes.cartEntity(
      account
    )}/search?id=${id}&_schema=${SCHEMA_VERSION}&_fields=id,email,cartName,items,creationDate,subtotal,discounts,shipping,total,customData,address`,
  removeCart: (account: string, id: string) =>
    `${routes.cartDocuments(account)}/${id}`,
  saveSchema: (account: string) =>
    `${routes.cartEntity(account)}/schemas/${SCHEMA_VERSION}`,
  clearCart: (account: string, id: string) =>
    `${routes.orderForm(account)}/${id}/items/removeAll`,
  addToCart: (account: string, orderFormId: string) =>
    `${routes.orderForm(account)}/${orderFormId}/items/`,
  addPriceToItems: (account: string, orderFormId: string) =>
    `${routes.orderForm(account)}/${orderFormId}/items/update`,
  vtexid: (token: string) =>
    `http://vtexid.vtex.com.br/api/vtexid/pub/authenticated/user?authToken=${token}`,
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
      type: 'integer',
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
    customData: {
      type: ['null', 'object'],
      title: 'Custom Data',
    },
    total: {
      type: ['number','integer'],
      title: 'Total',
    },
  },
  'v-indexed': ['email', 'creationDate', 'cartLifeSpan', 'cartName'],
  'v-default-fields': ['email', 'cart', 'creationDate', 'cartLifeSpan'],
  'v-cache': false,
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
      console.log('Inside getSetupConfig')
      const {
        vtex: { account, authToken },
      } = ctx

      // console.log('VTEX APP CONTEXT =>', ctx)
      const apps = new Apps(ctx.vtex)
      const app: string = getAppId()
      const settings = await apps.getAppSettings(app)
      if (settings.adminSetup) {
        console.log('conditional => ', !settings.adminSetup.hasSchema, settings.adminSetup.schemaVersion !== SCHEMA_VERSION, !settings.adminSetup.hasSchema ||
        settings.adminSetup.schemaVersion !== SCHEMA_VERSION)
        console.log('adminSetup => ', settings.adminSetup)
        if (
          !settings.adminSetup.hasSchema ||
          settings.adminSetup.schemaVersion !== SCHEMA_VERSION
        ) {
          console.log('Starting to put schema in MD')
          try {
            const url = routes.saveSchema(account)
            const headers = defaultHeaders(authToken)
            await http({
              method: 'PUT',
              url,
              data: schema,
              headers,
              validateStatus: status =>
                (status >= 200 && status < 300) || status === 304,
            })
            console.log('Schema saved successfully. Updating app settings')
            settings.adminSetup.hasSchema = true
            settings.adminSetup.schemaVersion = SCHEMA_VERSION
          } catch (e) {
            console.log('PutSchemaResponseError: ', e)
            settings.adminSetup.hasSchema = false
          }
        }
        if (!settings.adminSetup.allowManualPrice) {
          try {
            settings.adminSetup.allowManualPrice = true
            const url = routes.checkoutConfig(account)
            const headers = defaultHeaders(authToken)
            const { data: checkoutConfig } = await http({
              method: 'GET',
              url,
              data: schema,
              headers,
              validateStatus: status =>
                (status >= 200 && status < 300) || status === 304,
            })
            if (checkoutConfig.allowManualPrice !== true) {
              console.log('Start saving config', {
                ...checkoutConfig,
                allowManualPrice: true,
              })
              await http({
                method: 'post',
                url,
                data: JSON.stringify({
                  ...checkoutConfig,
                  allowManualPrice: true,
                }),
                headers,
              })
              console.log('Ended saving config')
            }
            console.log(
              'Checkout config saved successfully. Updating app settings'
            )
          } catch (e) {
            console.log('Error saving checkout config', e)
            settings.adminSetup.allowManualPrice = false
          }
        }
        await apps.saveAppSettings(app, settings)
      }
      console.log('Settings', settings)
      return settings
    },

    currentTime: async (_: any, __: any, ___: any) => {
      return new Date().toISOString()
    },
  },
  Mutation: {
    clearCart: async (_: any, params: any, ctx: any) => {
      const { vtex: ioContext } = ctx
      const { account, authToken } = ioContext
      const token =
        ctx.cookies.get(`VtexIdclientAutCookie_${account}`) ||
        ctx.cookies.get(`VtexIdclientAutCookie`)
      const useHeaders = {
        'Content-Type': 'application/json',
        Accept: 'application/json',
        VtexIdclientAutCookie: token,
        'Proxy-Authorization': authToken,
      }
      try {
        // CLEAR CURRENT CART
        await http({
          method: 'post',
          url: routes.clearCart(account, params.orderFormId),
          data: { expectedOrderFormSections: ['items'] },
          headers: useHeaders,
        })
      } catch (e) {
        const { status, body, details } = errorResponse(e)
        console.log('CartUseError', 'error', {
          orderFormId: params.orderFormId,
          status,
          body,
          details,
        })
        if (e.message) {
          throw new GraphQLError(e.message)
        } else if (e.response && e.response.data && e.response.data.message) {
          throw new GraphQLError(e.response.data.message)
        }
        throw e as GraphQLError
      }
    },
    useCart: async (_: any, params: any, ctx: any) => {
      const { vtex: ioContext } = ctx
      const { account, authToken } = ioContext
      const token =
        ctx.cookies.get(`VtexIdclientAutCookie_${account}`) ||
        ctx.cookies.get(`VtexIdclientAutCookie`)
      const useHeaders = {
        'Content-Type': 'application/json',
        Accept: 'application/json',
        VtexIdclientAutCookie: token,
        'Proxy-Authorization': authToken,
      }
      try {
        // CLEAR CURRENT CART
        await http({
          method: 'post',
          url: routes.clearCart(account, params.orderFormId),
          data: { expectedOrderFormSections: ['items'] },
          headers: useHeaders,
        })

        // ADD ITEMS TO CART
        const {
          data: { items: itemsAdded },
        } = await http({
          url: routes.addToCart(account, params.orderFormId),
          method: 'post',
          data: {
            expectedOrderFormSections: ['items'],
            orderItems: params.items.map((item: any) => {
              return {
                id: item.id,
                quantity: item.quantity,
                seller: '1',
              }
            }),
          },
          headers: useHeaders,
        })

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

        // if (params.userType === 'callCenterOperator' || params.userType === 'CALL_CENTER_OPERATOR') {
        const orderItems: any[] = []
        itemsAdded.forEach((item: any, key: number) => {
          orderItems.push({
            index: key,
            quantity: null,
            price: prop(item.id, sellingPriceMap).price,
          })
        })

        await http({
          url: routes.addPriceToItems(account, params.orderFormId),
          method: 'post',
          data: {
            orderItems,
          },
          headers: useHeaders,
        })
        // }
      } catch (e) {
        const { status, body, details } = errorResponse(e)
        console.log('CartUseError', 'error', {
          orderFormId: params.orderFormId,
          status,
          body,
          details,
        })
        if (e.message) {
          throw new GraphQLError(e.message)
        } else if (e.response && e.response.data && e.response.data.message) {
          throw new GraphQLError(e.response.data.message)
        }
        throw e as GraphQLError
      }
    },
    orderQuote: async (_: any, params: any, ctx: any) => {
      const { vtex: ioContext } = ctx
      const { account, authToken } = ioContext
      const token =
        ctx.cookies.get(`VtexIdclientAutCookie_${account}`) ||
        ctx.cookies.get(`VtexIdclientAutCookie`)
      const userDecode = decode(token)
      const user: string = userDecode ? userDecode.sub : null
      const headers = defaultHeaders(authToken)
      const url = routes.orderQuote(account)
      try {
        const { data } = await http({
          method: 'post',
          url,
          data: params.cart,
          headers,
        })
        console.log('CartSaveSuccess', 'info', {
          cart: params.cart,
          cartId: data.Id,
        })
        return data.Id
      } catch (e) {
        const { status, body, details } = errorResponse(e)
        console.log('CartSaveError', 'error', {
          cart: params.cart,
          user,
          status,
          body,
          details,
        })
        if (e.message) {
          throw new GraphQLError(e.message)
        } else if (e.response && e.response.data && e.response.data.message) {
          throw new GraphQLError(e.response.data.message)
        }
        throw e as GraphQLError
      }
    },

    getCarts: async (_: any, params: any, ctx: any) => {
      const { vtex: ioContext } = ctx
      const { account, authToken } = ioContext
      const headers = {
        ...defaultHeaders(authToken),
        'REST-Range': `resources=0-100`,
      }
      const url = routes.listCarts(account, encodeURIComponent(params.email))
      try {
        const { data } = await http({
          method: 'get',
          url,
          headers,
        })
        return data
      } catch (e) {
        console.log(e)
        const { status, body, details } = errorResponse(e)
        console.log('CartListError', 'error', {
          user: params.email,
          status,
          body,
          details,
        })
        if (e.message) {
          throw new GraphQLError(e.message)
        } else if (e.response && e.response.data && e.response.data.message) {
          throw new GraphQLError(e.response.data.message)
        }
        throw e as GraphQLError
      }
    },

    getCart: async (_: any, params: any, ctx: any) => {
      const { vtex: ioContext } = ctx
      const { account, authToken } = ioContext
      const headers = {
        ...defaultHeaders(authToken),
        'REST-Range': `resources=0-100`,
      }
      const url = routes.getCart(account, encodeURIComponent(params.id))
      try {
        const { data } = await http({
          method: 'get',
          url,
          headers,
        })
        console.log('getCart', data)
        return data
      } catch (e) {
        console.log(e)
        const { status, body, details } = errorResponse(e)
        console.log('CartListError', 'error', {
          user: params.email,
          status,
          body,
          details,
        })
        if (e.message) {
          throw new GraphQLError(e.message)
        } else if (e.response && e.response.data && e.response.data.message) {
          throw new GraphQLError(e.response.data.message)
        }
        throw e as GraphQLError
      }
    },

    removeCart: async (_: any, params: any, ctx: any) => {
      const { vtex: ioContext } = ctx
      const { account, authToken } = ioContext
      const token =
        ctx.cookies.get(`VtexIdclientAutCookie_${account}`) ||
        ctx.cookies.get(`VtexIdclientAutCookie`) ||
        ''
      const {
        data: { user },
      } = await http({
        // Check if cookie was issued by VTEX ID and is still valid
        method: 'get',
        url: routes.vtexid(token),
        headers: { 'Proxy-Authorization': `${authToken}` },
      })
      const headers = defaultHeaders(authToken)
      const url = routes.removeCart(account, params.id)
      try {
        const result = await http({
          method: 'delete',
          url,
          headers,
        })
        if (result.status === 204) {
          console.log('CartRemoveSuccess', 'info', {
            cartId: params.id,
            user,
            expired: params.expired,
          })
          return true
        }
      } catch (e) {
        console.log(e)
        const { status, body, details } = errorResponse(e)
        console.log('CartRemoveError', 'error', {
          cartId: params.id,
          user,
          expired: params.expired,
          status,
          body,
          details,
        })
        if (e.message) {
          throw new GraphQLError(e.message)
        } else if (e.response && e.response.data && e.response.data.message) {
          throw new GraphQLError(e.response.data.message)
        }
        throw e as GraphQLError
      }
      return false
    },
  },
}
