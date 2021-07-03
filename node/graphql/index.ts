import { indexBy, map, prop } from 'ramda'

import GraphQLError from '../utils/GraphQLError'

const getAppId = (): string => {
  return process.env.VTEX_APP_ID ?? ''
}

const SCHEMA_VERSION = 'v1.0'
const QUOTE_DATA_ENTITY = 'quotes'
const QUOTE_FIELDS = [
  'id',
  'referenceName',
  'creatorEmail',
  'creatorRole',
  'creationDate',
  'expirationDate',
  'lastUpdate',
  'updateHistory',
  'items',
  'subtotal',
  'status',
  'organization',
  'costCenter',
  'viewedBySales',
  'viewedByCustomer',
]

const routes = {
  baseUrl: (account: string) =>
    `http://${account}.vtexcommercestable.com.br/api`,
  orderForm: (account: string) =>
    `${routes.baseUrl(account)}/checkout/pub/orderForm`,
  checkoutConfig: (account: string) =>
    `${routes.baseUrl(account)}/checkout/pvt/configuration/orderForm`,
  quoteEntity: (account: string) =>
    `${routes.baseUrl(account)}/dataentities/quote`,
  listQuotes: (account: string, email: string) =>
    `${routes.quoteEntity(
      account
    )}/search?email=${email}&_schema=${SCHEMA_VERSION}&_fields=id,email,cartName,status,description,items,creationDate,subtotal,discounts,taxes,shipping,total,customData,address&_sort=creationDate DESC`,
  getQuote: (account: string, id: string) =>
    `${routes.quoteEntity(
      account
    )}/documents/${id}?_fields=id,email,cartName,status,description,items,creationDate,subtotal,discounts,shipping,taxes,total,customData,address`,

  saveSchema: (account: string) =>
    `${routes.quoteEntity(account)}/schemas/${SCHEMA_VERSION}`,
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
    referenceName: {
      type: 'string',
      title: 'Reference Name',
    },
    creatorEmail: {
      type: 'string',
      title: 'Creator Email',
    },
    creatorRole: {
      type: 'string',
      title: 'Creator Role',
    },
    creationDate: {
      type: 'string',
      title: 'Creation Date',
    },
    expirationDate: {
      type: 'string',
      title: 'Expiration Date',
    },
    lastUpdate: {
      type: 'string',
      title: 'Last Update',
    },
    updateHistory: {
      type: 'array',
      title: 'Update History',
    },
    items: {
      type: 'array',
      title: 'Cart',
    },
    subtotal: {
      type: 'number',
      title: 'Subtotal',
    },
    status: {
      type: 'string',
      title: 'Status',
    },
    organization: {
      type: ['null', 'string'],
      title: 'Organization',
    },
    costCenter: {
      type: ['null', 'string'],
      title: 'Cost Center',
    },
    viewedBySales: {
      type: 'boolean',
      title: 'Viewed by Sales',
    },
    viewedByCustomer: {
      type: 'boolean',
      title: 'Viewed by Customer',
    },
  },
  'v-indexed': [
    'creatorEmail',
    'creationDate',
    'expirationDate',
    'lastUpdate',
    'referenceName',
    'status',
    'organization',
    'costCenter',
  ],
  'v-default-fields': [
    'referenceName',
    'creatorEmail',
    'creationDate',
    'expirationDate',
    'lastUpdate',
    'items',
    'subtotal',
    'status',
  ],
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

const checkConfig = async (ctx: Context) => {
  const {
    vtex: { account, authToken },
    clients: { hub, apps, masterdata },
  } = ctx

  const app: string = getAppId()
  let settings = await apps.getAppSettings(app)
  let changed = false

  if (!settings.adminSetup) {
    settings = defaultSettings
    changed = true
  }

  if (
    !settings.adminSetup.hasSchema ||
    settings.adminSetup.schemaVersion !== SCHEMA_VERSION
  ) {
    changed = true
    try {
      await masterdata.createOrUpdateSchema({
        dataEntity: QUOTE_DATA_ENTITY,
        schemaName: SCHEMA_VERSION,
        schemaBody: schema,
      })

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
    changed = true
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

  if (changed) await apps.saveAppSettings(app, settings)

  return settings
}

export const resolvers = {
  Query: {
    getSetupConfig: async (_: any, __: any, ctx: Context) => {
      const settings = await checkConfig(ctx)

      return settings
    },
    getQuote: async (_: any, { id }: { id: string }, ctx: Context) => {
      const {
        clients: { masterdata },
      } = ctx

      await checkConfig(ctx)

      try {
        const quote = await masterdata.getDocument({
          dataEntity: QUOTE_DATA_ENTITY,
          id,
          fields: QUOTE_FIELDS,
        })

        return quote
      } catch (e) {
        if (e.message) {
          throw new GraphQLError(e.message)
        } else if (e.response?.data?.message) {
          throw new GraphQLError(e.response.data.message)
        }
      }
    },
    getQuotes: async (
      _: any,
      {
        organization,
        costCenter,
        status,
        search,
        page,
        pageSize,
        sortOrder,
        sortedBy,
      }: {
        organization: string[]
        costCenter: string[]
        status: string[]
        search: string
        page: number
        pageSize: number
        sortOrder: string
        sortedBy: string
      },
      ctx: Context
    ) => {
      const {
        clients: { masterdata },
      } = ctx

      await checkConfig(ctx)

      const whereArray = []

      if (organization?.length) {
        const orgArray = [] as string[]

        organization.forEach((org) => {
          orgArray.push(`organization=${org}`)
        })
        const organizations = `(${orgArray.join(' OR ')}`

        whereArray.push(organizations)
      }

      if (costCenter?.length) {
        const ccArray = [] as string[]

        costCenter.forEach((cc) => {
          ccArray.push(`costCenter=${cc}`)
        })
        const costCenters = `(${ccArray.join(' OR ')}`

        whereArray.push(costCenters)
      }

      if (status?.length) {
        const statusArray = [] as string[]

        status.forEach((stat) => {
          statusArray.push(`status=${stat}`)
        })
        const statuses = `(${statusArray.join(' OR ')}`

        whereArray.push(statuses)
      }

      const where = whereArray.join(' AND ')

      try {
        const quotes = await masterdata.searchDocuments({
          dataEntity: QUOTE_DATA_ENTITY,
          fields: QUOTE_FIELDS,
          schema: SCHEMA_VERSION,
          pagination: { page, pageSize },
          sort: `${sortedBy} ${sortOrder}`,
          ...(where ? { where } : {}),
          ...(search ? { keyword: search } : {}),
        })

        return quotes
      } catch (e) {
        if (e.message) {
          throw new GraphQLError(e.message)
        } else if (e.response?.data?.message) {
          throw new GraphQLError(e.response.data.message)
        } else {
          throw new GraphQLError(e)
        }
      }
    },
  },
  Mutation: {
    clearCart: async (_: any, params: any, ctx: Context) => {
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
        } else if (e.response?.data?.message) {
          throw new GraphQLError(e.response.data.message)
        } else {
          throw new GraphQLError(e)
        }
      }
    },
    createQuote: async (
      _: any,
      {
        referenceName,
        items,
        subtotal,
        note,
        sendToSalesRep,
      }: {
        referenceName: string
        items: QuoteItem[]
        subtotal: number
        note: string
        sendToSalesRep: boolean
      },
      ctx: Context
    ) => {
      const {
        clients: { masterdata },
      } = ctx

      const settings = await checkConfig(ctx)

      // TODO: get these
      const email = ''
      const role = ''
      const organization = ''
      const costCenter = ''

      const now = new Date()
      const nowISO = now.toISOString()
      const expirationDate = new Date()

      expirationDate.setDate(
        expirationDate.getDate() + ((settings?.cartLifeSpan as number) ?? 30)
      )
      const expirationDateISO = expirationDate.toISOString()

      const status = sendToSalesRep ? 'pending' : 'ready'
      const lastUpdate = nowISO
      const updateHistory = [
        {
          date: nowISO,
          email,
          role,
          status,
          note,
        },
      ]

      const quote = {
        referenceName,
        creatorEmail: email,
        creationDate: nowISO,
        creatorRole: role,
        expirationDate: expirationDateISO,
        items,
        subtotal,
        status,
        organization,
        costCenter,
        lastUpdate,
        updateHistory,
        viewedByCustomer: false,
        viewedBySales: false,
      }

      try {
        const data = await masterdata
          .createDocument({
            dataEntity: 'quote',
            fields: quote,
            schema: SCHEMA_VERSION,
          })
          .then((res: any) => res)

        return data.id
      } catch (e) {
        if (e.message) {
          throw new GraphQLError(e.message)
        } else if (e.response?.data?.message) {
          throw new GraphQLError(e.response.data.message)
        } else {
          throw new GraphQLError(e)
        }
      }
    },
    updateQuote: async (
      _: any,
      {
        id,
        items,
        subtotal,
        note,
        decline,
      }: {
        id: string
        items: QuoteItem[]
        subtotal: number
        note: string
        decline: boolean
      },
      ctx: Context
    ) => {
      const {
        clients: { masterdata },
      } = ctx

      const now = new Date()
      const nowISO = now.toISOString()

      try {
        const existingQuote = (await masterdata.getDocument({
          dataEntity: QUOTE_DATA_ENTITY,
          id,
          fields: QUOTE_FIELDS,
        })) as Quote

        if (!existingQuote) throw new GraphQLError('No quote found to update')

        const status = decline ? 'declined' : items.length ? 'ready' : 'revised'

        // TODO: get these
        const email = ''
        const role = ''

        const lastUpdate = nowISO
        const update = {
          date: nowISO,
          email,
          role,
          status,
          note,
        }

        const { updateHistory } = existingQuote

        updateHistory.push(update)

        const updatedQuote = {
          ...existingQuote,
          items: items.length ? items : existingQuote.items,
          subtotal: subtotal ?? existingQuote.subtotal,
          lastUpdate,
          updateHistory,
          status,
        } as Quote

        const data = await masterdata
          .updateEntireDocument({
            dataEntity: QUOTE_DATA_ENTITY,
            id,
            fields: updatedQuote,
          })
          .then((res: any) => res)

        return data.id
      } catch (e) {
        if (e.message) {
          throw new GraphQLError(e.message)
        } else if (e.response?.data?.message) {
          throw new GraphQLError(e.response.data.message)
        } else {
          throw new GraphQLError(e)
        }
      }
    },
    useQuote: async (
      _: any,
      { id, orderFormId }: { id: string; orderFormId: string },
      ctx: Context
    ) => {
      const {
        vtex: ioContext,
        clients: { masterdata, hub },
      } = ctx

      const { account, logger } = ioContext

      try {
        // GET QUOTE DATA
        const quote = (await masterdata.getDocument({
          dataEntity: QUOTE_DATA_ENTITY,
          id,
          fields: QUOTE_FIELDS,
        })) as Quote

        const { items } = quote

        // CLEAR CURRENT CART
        await hub.post(routes.clearCart(account, orderFormId), {
          expectedOrderFormSections: ['items'],
        })

        // ADD ITEMS TO CART
        const data = await hub
          .post(routes.addToCart(account, orderFormId), {
            expectedOrderFormSections: ['items'],
            orderItems: items.map((item) => {
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
            items
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
            routes.addPriceToItems(account, orderFormId),
            {
              orderItems,
            },
            useHeaders
          )
        } catch (err) {
          logger.error(err)
        }
      } catch (e) {
        if (e.message) {
          throw new GraphQLError(e.message)
        } else if (e.response?.data?.message) {
          throw new GraphQLError(e.response.data.message)
        }
      }
    },
  },
}

interface Quote {
  id: string
  referenceName: string
  creatorEmail: string
  creatorRole: string
  creationDate: string
  expirationDate: string
  lastUpdate: string
  updateHistory: QuoteUpdate[]
  items: QuoteItem[]
  subtotal: number
  status: string
  organization: string
  costCenter: string
  viewedBySales: boolean
  viewedByCustomer: boolean
}

interface QuoteUpdate {
  email: string
  role: string
  date: string
  status: string
  note: string
}

interface QuoteItem {
  name: string
  skuName: string
  refId: string
  id: string
  productId: string
  imageUrl: string
  listPrice: number
  price: number
  quantity: number
  sellingPrice: number
  seller: string
}
