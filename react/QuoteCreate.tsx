/* eslint-disable @typescript-eslint/no-explicit-any */
/* eslint-disable no-console */

import React, { useState, useContext } from 'react'
import { Input, Button, Table, ToastContext } from 'vtex.styleguide'
import { useCssHandles } from 'vtex.css-handles'
import { useQuery, compose, graphql } from 'react-apollo'
import { FormattedCurrency } from 'vtex.format-currency'
import OrderFormQuery from 'vtex.checkout-resources/QueryOrderForm'
import { OrderForm } from 'vtex.checkout-graphql'
import _ from 'underscore'
import { injectIntl, WrappedComponentProps } from 'react-intl'
import PropTypes from 'prop-types'
import saveCartMutation from './graphql/saveCart.graphql'
import getSetupConfig from './graphql/getSetupConfig.graphql'

const DEFAULT_ADMIN_SETUP = {
  cartName: 'Save Cart',
  cartLifeSpan: 7,
  storeLogoUrl: '',
}

const QuoteCreate: StorefrontFunctionComponent<WrappedComponentProps & any> = ({
  SaveCartMutation,
  GetSetupConfig,
  intl,
}: any) => {
  const [_state, setState] = useState<any>({
    name: '',
    errorMessage: '',
    savingQuote: false,
  })

  const { showToast } = useContext(ToastContext)

  const { name, savingQuote, errorMessage } = _state

  const translateMessage = (message: MessageDescriptor) => {
    return intl.formatMessage(message)
  }

  const toastMessage = (messsageKey: string) => {
    const message = translateMessage({
      id: messsageKey,
    })

    const action = undefined

    showToast({ message, action })
  }

  const CSS_HANDLES = [
    'containerCreate',
    'titleCreate',
    'inputCreate',
    'buttonCreate',
  ] as const
  const handles = useCssHandles(CSS_HANDLES)

  const { loading, data, error } = useQuery<{
    orderForm: OrderForm
  }>(OrderFormQuery, {
    ssr: false,
  })

  if (error) {
    console.log('Error loading OrderForm', error)
  }

  const defaultSchema = {
    properties: {
      productRefId: {
        title: 'SKU',
        width: 50,
      },
      skuName: {
        title: 'Name',
        width: 500,
      },
      sellingPrice: {
        title: 'Price',
        minWidth: 50,
        headerRight: true,
        // eslint-disable-next-line react/display-name
        cellRenderer: ({ cellData }: any) => {
          return (
            <span>
              <FormattedCurrency value={cellData} />
            </span>
          )
        },
      },
      quantity: {
        title: 'Qty',
        minWidth: 10,
      },
      id: {
        title: 'Total',
        minWidth: 50,
        headerRight: true,
        // eslint-disable-next-line react/display-name
        cellRenderer: ({ rowData }: any) => {
          return (
            <span>
              <FormattedCurrency
                value={rowData.sellingPrice * rowData.quantity}
              />
            </span>
          )
        },
      },
    },
  }

  const itemsCopy = data?.orderForm?.items ? data.orderForm.items : []

  const activeLoading = (status: boolean) => {
    setState({ savingQuote: status })
  }

  const handleSaveCart = () => {
    activeLoading(true)

    if (
      name &&
      name.length > 0 &&
      data.orderForm.items &&
      data.orderForm.items.length
    ) {
      const { totalizers, value, customData, shippingData } = data.orderForm

      let customApps = null

      let address = null

      if (shippingData) {
        address = shippingData.address
      }

      if (customData) {
        customApps = customData.customApps
      }
      const subtotal = (totalizers.find(x => x.id === 'Items') || { value: 0 })
        .value
      const discounts = (
        totalizers.find(x => x.id === 'Discounts') || { value: 0 }
      ).value
      const shipping = (
        totalizers.find(x => x.id === 'Shipping') || { value: 0 }
      ).value
      const paymentTerm = customApps
        ? customApps[0].fields.PaymentTermDescription
        : ''

      const cart = {
        id: null,
        email: data.orderForm.clientProfileData.email,
        cartName: name,
        items: _.map(data.orderForm.items, (item: any) => {
          return {
            name: item.name,
            skuName: item.skuName,
            id: item.id,
            productId: item.productId,
            imageUrl: item.imageUrl,
            listPrice: item.listPrice,
            price: item.price,
            quantity: item.quantity,
            sellingPrice: item.sellingPrice,
          }
        }),
        creationDate: new Date().toISOString(),
        subtotal,
        discounts,
        shipping,
        total: value,
        paymentTerm,
        address,
      }

      SaveCartMutation({
        variables: {
          cart,
        },
      })
        .then(result => {
          console.log('Result =>>>>', result, GetSetupConfig)
          if (result.data.orderQuote) {
            cart.id = result.data.orderQuote.substr(5)
            activeLoading(false)
            const {
              getSetupConfig: { adminSetup },
            } = GetSetupConfig
            const { cartLifeSpan } = adminSetup || DEFAULT_ADMIN_SETUP
            const isPlural = cartLifeSpan < 2 ? '' : 's'
            setState({
              messageSuccess: `Quotation saved, it expires in ${cartLifeSpan} day${isPlural}`,
            })
            toastMessage('orderquote.create.success')
            activeLoading(false)
          } else {
            console.log('Erro 01')
            toastMessage('orderquote.create.error')
            activeLoading(false)
          }
        })
        .catch(err => {
          console.log(err)
          console.log('Erro 02')
          toastMessage('orderquote.create.error')
          activeLoading(false)
        })
    } else {
      activeLoading(false)
      console.log('Erro 03')
      toastMessage('orderquote.create.error')
    }
  }

  const saveQuote = () => {
    console.log('saveQuote')
    if (!name) {
      setState({ errorMessage: 'Type a name for your quotation' })
    } else {
      handleSaveCart()
    }
  }

  return (
    <div className={`${handles.containerCreate} pv6 ph4 w-60`}>
      <div className={`${handles.titleCreate} t-heading-2 mb6`}>
        Save Quotation
      </div>
      <div className="flex flex-row">
        <div className={`${handles.inputCreate} mb5 flex flex-column w-50`}>
          <Input
            placeholder="Quotation name"
            dataAttributes={{ 'hj-white-list': true, test: 'string' }}
            label="Name"
            value={name}
            errorMessage={errorMessage}
            onChange={e => {
              console.log('onChange', e.target.value)
              setState({ name: e.target.value })
            }}
          />
        </div>
        <div
          className={`${handles.buttonCreate} mb5 flex flex-column w-50 items-end pt6`}
        >
          <Button
            variation="primary"
            isLoading={savingQuote}
            onClick={() => {
              saveQuote()
            }}
          >
            Save
          </Button>
        </div>
      </div>
      <div className="flex flex-row">
        <div className="flex flex-column w-100 mb5">
          <Table
            fullWidth
            schema={defaultSchema}
            items={itemsCopy}
            loading={loading}
            density="high"
            onRowClick={({ rowData }) => {
              console.log(
                `you just clicked ${rowData.name}, number is ${rowData.number} and email ${rowData.email}`
              )
            }}
          />
        </div>
      </div>
    </div>
  )
}

QuoteCreate.propTypes = {
  SaveCartMutation: PropTypes.func,
  GetSetupConfig: PropTypes.object,
}

interface MessageDescriptor {
  id: string
  description?: string | object
  defaultMessage?: string
}

export default injectIntl(
  compose(
    graphql(getSetupConfig, {
      name: 'GetSetupConfig',
      options: { ssr: false },
    }),
    graphql(saveCartMutation, {
      name: 'SaveCartMutation',
      options: { ssr: false },
    })
  )(QuoteCreate)
)
