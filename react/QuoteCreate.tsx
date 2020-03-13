/* eslint-disable @typescript-eslint/no-explicit-any */
/* eslint-disable no-console */

import React, { useState, useContext } from 'react'
import { Input, Button, Table, ToastContext, Checkbox } from 'vtex.styleguide'
import { useCssHandles } from 'vtex.css-handles'
import { useQuery, compose, graphql } from 'react-apollo'
import { FormattedCurrency } from 'vtex.format-currency'
import OrderFormQuery from 'vtex.checkout-resources/QueryOrderForm'
import { OrderForm } from 'vtex.checkout-graphql'
import { useRuntime } from 'vtex.render-runtime'
import _ from 'underscore'
import { injectIntl, FormattedMessage, WrappedComponentProps } from 'react-intl'
import PropTypes from 'prop-types'

import saveCartMutation from './graphql/saveCart.graphql'
import clearCartMutation from './graphql/clearCartMutation.graphql'

const QuoteCreate: StorefrontFunctionComponent<WrappedComponentProps & any> = ({
  SaveCartMutation,
  ClearCartMutation,
  intl,
}: any) => {
  const [_state, setState] = useState<any>({
    name: '',
    errorMessage: '',
    savingQuote: false,
    clearCart: false,
  })

  const { history, navigate } = useRuntime()

  const { showToast } = useContext(ToastContext)

  const { name, savingQuote, errorMessage, clearCart } = _state

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
    toastMessage('orderquote.create.loadingError')
  }

  const defaultSchema = {
    properties: {
      productRefId: {
        title: translateMessage({
          id: 'orderquote.cartList.label.sku',
        }),
        width: 100,
      },
      skuName: {
        title: translateMessage({
          id: 'orderquote.cartList.label.itemName',
        }),
        minWidth: 300,
      },
      sellingPrice: {
        title: translateMessage({
          id: 'orderquote.cartList.label.price',
        }),
        headerRight: true,
        // eslint-disable-next-line react/display-name
        cellRenderer: ({ cellData }: any) => {
          return (
            <span className="tr w-100">
              <FormattedCurrency value={cellData} />
            </span>
          )
        },
      },
      quantity: {
        title: translateMessage({
          id: 'orderquote.cartList.label.quantity',
        }),
        width: 100,
      },
      id: {
        title: translateMessage({
          id: 'orderquote.cartList.label.total',
        }),
        headerRight: true,
        // eslint-disable-next-line react/display-name
        cellRenderer: ({ rowData }: any) => {
          return (
            <span className="tr w-100">
              <FormattedCurrency
                value={rowData.sellingPrice * rowData.quantity}
              />
            </span>
          )
        },
      },
    },
  }

  let itemsCopy: any = data?.orderForm?.items ? data.orderForm.items : []

  const activeLoading = (status: boolean) => {
    setState({ savingQuote: status })
  }

  const handleClearCart = (orderFormId: string) => {
    ClearCartMutation({
      variables: {
        orderFormId,
      },
    }).then(() => {
      const url: any = history.location.pathname.split('/')
      url.pop()
      itemsCopy = null
      navigate({
        to: url.join('/'),
      })
    })
  }

  const handleSaveCart = () => {
    activeLoading(true)

    if (
      name &&
      name.length > 0 &&
      data?.orderForm?.items &&
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
      const subtotal = (
        totalizers.find((x: { id: string }) => x.id === 'Items') || { value: 0 }
      ).value

      const discounts = (
        totalizers.find((x: { id: string }) => x.id === 'Discounts') || {
          value: 0,
        }
      ).value

      const shipping = (
        totalizers.find((x: { id: string }) => x.id === 'Shipping') || {
          value: 0,
        }
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
            refId: item.productRefId,
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
        .then((result: any) => {
          if (result.data.orderQuote) {
            cart.id = result.data.orderQuote.substr(5)
            activeLoading(false)
            toastMessage('orderquote.create.success')
            activeLoading(false)
            if (clearCart) {
              handleClearCart(data.orderForm.id)
            }
          } else {
            toastMessage('orderquote.create.error')
            activeLoading(false)
          }
        })
        .catch(() => {
          toastMessage('orderquote.create.error')
          activeLoading(false)
        })
    } else {
      activeLoading(false)
      toastMessage('orderquote.create.error')
    }
  }

  const saveQuote = () => {
    if (!name) {
      setState({
        errorMessage: translateMessage({
          id: 'orderquote.create.required',
        }),
      })
    } else {
      handleSaveCart()
    }
  }

  return (
    <div className={`${handles.containerCreate} pv6 ph4`}>
      <div className={`${handles.titleCreate} t-heading-2 mb6`}>
        <FormattedMessage id="orderquote.create.title" />
      </div>
      <div className="flex flex-row">
        <div className={`${handles.inputCreate} mb5 flex flex-column w-50`}>
          <Input
            placeholder={translateMessage({
              id: 'orderquote.placeholder.quotationName',
            })}
            dataAttributes={{ 'hj-white-list': true, test: 'string' }}
            label="Name"
            value={name}
            errorMessage={errorMessage}
            onChange={(e: any) => {
              setState({ name: e.target.value })
            }}
          />
        </div>
        <div
          className={`${handles.buttonCreate} mb5 flex flex-column w-50 items-end pt6`}
        >
          <div className="flex flex-row">
            <div className="flex flex-column w-70 pt4">
              <Checkbox
                checked={clearCart}
                id="clear"
                label={translateMessage({
                  id: 'orderquote.button.clear',
                })}
                name="clearCheckbox"
                onChange={() => {
                  setState({ ..._state, clearCart: !clearCart })
                }}
                value="option-0"
              />
            </div>
            <div className="flex flex-column w-30">
              <Button
                variation="primary"
                isLoading={savingQuote}
                onClick={() => {
                  saveQuote()
                }}
              >
                <FormattedMessage id="orderquote.button.save" />
              </Button>
            </div>
          </div>
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
    graphql(saveCartMutation, {
      name: 'SaveCartMutation',
      options: { ssr: false },
    }),
    graphql(clearCartMutation, {
      name: 'ClearCartMutation',
      options: { ssr: false },
    })
  )(QuoteCreate)
)
