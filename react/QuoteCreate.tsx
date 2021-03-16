/* eslint-disable @typescript-eslint/no-explicit-any */

import React, { useState, useContext } from 'react'
import {
  Input,
  Textarea,
  Button,
  Table,
  Totalizer,
  ToastContext,
  Checkbox,
  PageHeader,
} from 'vtex.styleguide'
import { useCssHandles } from 'vtex.css-handles'
import { compose, graphql } from 'react-apollo'
import { FormattedCurrency } from 'vtex.format-currency'
import { useRuntime } from 'vtex.render-runtime'
import { injectIntl, FormattedMessage, WrappedComponentProps } from 'react-intl'
import PropTypes from 'prop-types'

import saveCartMutation from './graphql/saveCart.graphql'
import clearCartMutation from './graphql/clearCartMutation.graphql'
import getOrderForm from './queries/orderForm.gql'
import getSetupConfig from './graphql/getSetupConfig.graphql'

const QuoteCreate: StorefrontFunctionComponent<WrappedComponentProps & any> = ({
  SaveCartMutation,
  ClearCartMutation,
  intl,
  data: { orderForm },
}: any) => {
  const [_state, setState] = useState<any>({
    name: '',
    description: '',
    errorMessage: '',
    savingQuote: false,
    clearCart: false,
  })

  const { navigate } = useRuntime()

  const { showToast } = useContext(ToastContext)

  const { name, description, savingQuote, errorMessage, clearCart } = _state

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

  const defaultSchema = {
    properties: {
      refId: {
        title: translateMessage({
          id: 'store/orderquote.cartList.label.sku',
        }),
        width: 200,
      },
      skuName: {
        title: translateMessage({
          id: 'store/orderquote.cartList.label.itemName',
        }),
        // eslint-disable-next-line react/display-name
        cellRenderer: ({ rowData }: any) => {
          return rowData.skuName !== rowData.name ? (
            <div>
              <span>{rowData.name}</span>
            </div>
          ) : (
            rowData.skuName
          )
        },
        minWidth: 300,
      },
      sellingPrice: {
        title: translateMessage({
          id: 'store/orderquote.cartList.label.price',
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
        width: 200,
      },
      quantity: {
        title: translateMessage({
          id: 'store/orderquote.cartList.label.quantity',
        }),
        width: 100,
      },
      id: {
        title: translateMessage({
          id: 'store/orderquote.cartList.label.total',
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
        width: 300,
      },
    },
  }

  let itemsCopy: any = orderForm?.items ? orderForm.items : []
  const { totalizers, value, customData, shippingData } = orderForm ?? {}

  const subtotal = (
    totalizers?.find((x: { id: string }) => x.id === 'Items') || {
      value: 0,
    }
  ).value

  const discounts = (
    totalizers?.find((x: { id: string }) => x.id === 'Discounts') || {
      value: 0,
    }
  ).value

  const shippingCost = (
    totalizers?.find((x: { id: string }) => x.id === 'Shipping') || {
      value: 0,
    }
  ).value

  const nonTaxes = ['Shipping', 'Items', 'Discounts']
  let taxes: any = 0

  totalizers?.forEach((item: { id: string; value: any }) => {
    if (nonTaxes.indexOf(item.id) === -1) {
      // eslint-disable-next-line @typescript-eslint/restrict-plus-operands
      taxes += item.value
    }
  })

  const summary = [
    {
      label: translateMessage({
        id: 'store/orderquote.summary.subtotal',
      }),
      value: (
        <FormattedCurrency value={subtotal === 0 ? subtotal : subtotal / 100} />
      ),
      isLoading: false,
    },
    {
      label: translateMessage({
        id: 'store/orderquote.summary.shipping',
      }),
      value: (
        <FormattedCurrency
          value={shippingCost === 0 ? shippingCost : shippingCost / 100}
        />
      ),
      isLoading: false,
    },
    {
      label: translateMessage({
        id: 'store/orderquote.summary.discounts',
      }),
      value: (
        <FormattedCurrency
          value={discounts === 0 ? discounts : discounts / 100}
        />
      ),
      isLoading: false,
    },
    {
      label: translateMessage({
        id: 'store/orderquote.summary.taxes',
      }),
      value: <FormattedCurrency value={taxes === 0 ? 0 : taxes / 100} />,
      isLoading: false,
    },
    {
      label: translateMessage({
        id: 'store/orderquote.summary.total',
      }),
      value: <FormattedCurrency value={value === 0 ? 0 : value} />,
      isLoading: false,
    },
  ]

  const activeLoading = (status: boolean) => {
    setState({ ..._state, savingQuote: status })
  }

  const handleClearCart = (orderFormId: string) => {
    ClearCartMutation({
      variables: {
        orderFormId,
      },
    }).then(() => {
      itemsCopy = null
      navigate({
        page: 'store.orderquote',
        fallbackToWindowLocation: true,
        fetchPage: true,
      })
    })
  }

  const handleSaveCart = () => {
    if (!orderForm?.clientProfileData?.email) {
      toastMessage('store/orderquote.error.notAuthenticated')
    } else {
      activeLoading(true)
      if (
        name &&
        name.length > 0 &&
        orderForm?.items &&
        orderForm.items.length
      ) {
        let address = null

        if (shippingData?.address) {
          const {
            city,
            complement,
            country,
            neighborhood,
            number,
            postalCode,
            state,
            street,
          } = shippingData.address
          address = {
            city,
            complement,
            country,
            neighborhood,
            number,
            postalCode,
            state,
            street,
          }
        }

        const encodeCustomData = (data: any) => {
          if (data?.customApps?.length) {
            return {
              customApps: data.customApps.map((item: any) => {
                return {
                  fields: JSON.stringify(item.fields),
                  id: item.id,
                  major: item.major,
                }
              }),
            }
          }
          return null
        }

        const cart = {
          id: null,
          email: orderForm.clientProfileData.email,
          cartName: name,
          description,
          items: orderForm.items.map((item: any) => {
            return {
              name: item.name,
              skuName: item.skuName,
              refId: item.refId,
              id: item.id,
              productId: item.productId,
              imageUrl: item.imageUrl,
              listPrice: parseInt(String(item.listPrice * 100), 0),
              price: parseInt(String(item.price * 100), 0),
              quantity: item.quantity,
              sellingPrice: parseInt(String(item.sellingPrice * 100), 0),
            }
          }),
          creationDate: new Date().toISOString(),
          subtotal: parseInt(String(subtotal * 100), 0),
          discounts: parseInt(String(discounts), 0),
          shipping: parseInt(String(shippingCost * 100), 0),
          taxes: parseInt(String(taxes * 100), 0),
          total: parseInt(String(value * 100), 0),
          customData: encodeCustomData(customData),
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
              toastMessage('store/orderquote.create.success')
              activeLoading(false)
              if (clearCart) {
                handleClearCart(orderForm.orderFormId)
              } else {
                navigate({
                  page: 'store.orderquote',
                  fetchPage: true,
                })
              }
            } else {
              toastMessage('store/orderquote.create.error')
              activeLoading(false)
            }
          })
          .catch(() => {
            toastMessage('store/orderquote.create.error')
            activeLoading(false)
          })
      }
      activeLoading(false)
    }
  }

  const saveQuote = () => {
    if (!name) {
      setState({
        ..._state,
        errorMessage: translateMessage({
          id: 'store/orderquote.create.required',
        }),
      })
    } else {
      handleSaveCart()
    }
  }

  const CSS_HANDLES = [
    'containerCreate',
    'inputCreate',
    'buttonsContainer',
    'checkboxClear',
    'buttonSave',
    'listContainer',
    'descriptionContainer',
    'notAuthenticatedMessage',
  ] as const

  const handles = useCssHandles(CSS_HANDLES)

  return (
    <div className={`${handles.containerCreate} pv6 ph4 mw9 center`}>
      <PageHeader
        title={translateMessage({
          id: 'store/orderquote.create.title',
        })}
        linkLabel={translateMessage({
          id: 'store/orderquote.button.back',
        })}
        onLinkClick={() => {
          navigate({
            to: '/orderquote',
          })
        }}
      />

      {orderForm && !orderForm?.clientProfileData?.email && (
        <div className="flex flex-row ph5 ph7-ns">
          <div className="flex flex-column w-100">
            <div className={`mb5 ${handles.notAuthenticatedMessage}`}>
              <FormattedMessage id="store/orderquote.error.notAuthenticated" />
            </div>
          </div>
        </div>
      )}

      {orderForm?.clientProfileData?.email && (
        <div>
          <div className="flex flex-column ph5 ph7-ns">
            <div className={`${handles.inputCreate} mb5 flex flex-column`}>
              <Input
                placeholder={translateMessage({
                  id: 'store/orderquote.placeholder.quotationName',
                })}
                dataAttributes={{ 'hj-white-list': true, test: 'string' }}
                label={translateMessage({
                  id: 'store/orderquote.create.nameLabel',
                })}
                value={name}
                errorMessage={errorMessage}
                onChange={(e: any) => {
                  setState({ ..._state, name: e.target.value })
                }}
              />
            </div>
          </div>
          <div className="flex flex-row ph5 ph7-ns">
            <div
              className={`flex flex-column w-100 mb5 ${handles.descriptionContainer}`}
            >
              <Textarea
                label={translateMessage({
                  id: 'store/orderquote.create.descriptionLabel',
                })}
                onChange={(e: any) =>
                  setState({ ..._state, description: e.target.value })
                }
                value={description}
                characterCountdownText={
                  <FormattedMessage
                    id="store/orderquote.create.characterLeft"
                    values={{ count: _state.description.length }}
                  />
                }
                maxLength="100"
                rows="2"
              />
            </div>
          </div>
          <div className="flex flex-row ph5 ph7-ns">
            <div
              className={`flex flex-column w-100 mb5 ${handles.listContainer}`}
            >
              <Table
                fullWidth
                schema={defaultSchema}
                items={itemsCopy}
                density="medium"
              />
            </div>
          </div>
          <div className="flex flex-row ph5 ph7-ns">
            <div
              className={`flex flex-column w-100 mb5  ${handles.totalizerContainer}`}
            >
              <Totalizer items={summary} />
            </div>
          </div>
          <div
            className={`${handles.buttonsContainer} mb5 flex flex-column items-end pt6`}
          >
            <div className="flex flex-row">
              <div
                className={`flex flex-column w-70 pt4 ${handles.checkboxClear}`}
              >
                <Checkbox
                  checked={clearCart}
                  id="clear"
                  label={translateMessage({
                    id: 'store/orderquote.button.clear',
                  })}
                  name="clearCheckbox"
                  onChange={() => {
                    setState({ ..._state, clearCart: !clearCart })
                  }}
                  value="option-0"
                />
              </div>
              <div className={`flex flex-column w-30 ${handles.buttonSave}`}>
                <Button
                  variation="primary"
                  isLoading={savingQuote}
                  onClick={() => {
                    saveQuote()
                  }}
                >
                  <FormattedMessage id="store/orderquote.button.save" />
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

QuoteCreate.propTypes = {
  SaveCartMutation: PropTypes.func,
  GetSetupConfig: PropTypes.object,
  data: PropTypes.object,
}

interface MessageDescriptor {
  id: string
  description?: string | object
  defaultMessage?: string
  values?: object
}

export default injectIntl(
  compose(
    graphql(getOrderForm, {
      options: {
        ssr: false,
      },
    }),
    graphql(saveCartMutation, {
      name: 'SaveCartMutation',
      options: { ssr: false },
    }),
    graphql(clearCartMutation, {
      name: 'ClearCartMutation',
      options: { ssr: false },
    }),
    graphql(getSetupConfig, {
      name: 'GetSetupConfig',
      options: { ssr: false },
    })
  )(QuoteCreate)
)
