import { prop } from 'ramda'

const routes = {
  orderForm: (account: string, env = 'stable') =>
    `http://${account}.vtexcommerce${env}.com.br/api/checkout/pub/orderForm`,

  marketingData: (account: string, orderFormId: string) =>
    `${routes.orderForm(
      account
    )}/${orderFormId}/attachments/marketingData?an=${account}`,

  orderFormHooks: (account: string, orderFormId: string) =>
    `${routes.orderForm(account)}/${orderFormId}/hooksData?an=${account}`,

  orderFormId: (account: string, orderFormId: string) =>
    `${routes.orderForm(account)}/${orderFormId}`,
}

/**
 * Exporta as funções que serão utilizadas para atualizar os dados do orderForm
 */
export default ({ clients: { hub } }: Context) => {
  const expectedOrderFormSections = [
    'items',
    'customData',
    'clientProfileData',
    'paymentData',
    'marketingData',
    'storePreferencesData',
  ]

  return {
    /**
     * Inclui os dados de marketing no orderForm
     *
     * @param {string} orderFormId Identificador do orderForm
     * @param {any} marketingData Dados do marketing
     * @param {string} Cookie Cookie da sessão
     */
    saveMarketingData: (orderFormId: string, marketingData: any) => {
      const url = routes.marketingData(hub.account(), orderFormId)

      return hub
        .post(url, { ...marketingData, expectedOrderFormSections })
        .then(prop('data'))
    },
    /**
     * Atualiza o hook da APP
     *
     * @param orderFormId Identificador do orderForm
     * @param hook Valor do hook
     */
    updateOrderHook: (orderFormId: string, hook: any) => {
      const url = routes.orderFormHooks(hub.account(), orderFormId)

      return hub.post(url, hook).then(prop('data'))
    },
    /**
     * Obtém o orderForm pelo identificador
     *
     * @param orderFormId Identificador do orderForm
     */
    getOrderForm: (orderFormId: string): any => {
      const url = routes.orderFormId(hub.account(), orderFormId)
      const payload = { expectedOrderFormSections }

      return hub.post(url, payload).then(prop('data'))
    },
    /**
     * Obtém um orderForm vazio
     */
    getBlankOrderForm: (): any => {
      const url = routes.orderForm(hub.account())
      const payload = { expectedOrderFormSections }

      return hub.post(url, payload).then(prop('data'))
    },
  }
}
