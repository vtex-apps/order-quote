/* eslint-disable @typescript-eslint/no-explicit-any */

import React, { useState, useContext } from 'react'
import {
  Button,
  Table,
  ToastContext,
  Totalizer,
  ModalDialog,
  PageHeader,
} from 'vtex.styleguide'
import { useCssHandles } from 'vtex.css-handles'
import { useQuery, compose, graphql } from 'react-apollo'
import { FormattedCurrency } from 'vtex.format-currency'
import { useRuntime } from 'vtex.render-runtime'
import OrderFormQuery from 'vtex.checkout-resources/QueryOrderForm'
import { OrderForm } from 'vtex.checkout-graphql'
import _ from 'underscore'
import { injectIntl, FormattedMessage, WrappedComponentProps } from 'react-intl'
import PropTypes from 'prop-types'

import PrintButton from './PrintButton'

import getCart from './graphql/getCart.graphql'
import getSetupConfig from './graphql/getSetupConfig.graphql'
import removeCart from './graphql/removeCart.graphql'
import useCart from './graphql/useCartMutation.graphql'

import './print.css'

let initialLoad = true

const DEFAULT_ADMIN_SETUP = {
  cartLifeSpan: 7,
  storeLogoUrl: '',
}

const QuoteCreate: StorefrontFunctionComponent<WrappedComponentProps & any> = ({
  GetCart,
  GetSetupConfig,
  UseCart,
  RemoveCart,
  intl,
}: any) => {
  const { navigate } = useRuntime()

  const translateMessage = (message: MessageDescriptor) => {
    return intl.formatMessage(message)
  }

  const {
    loading: loadingOrderForm,
    data: orderFormData,
    error: orderFormError,
  } = useQuery<{
    orderForm: OrderForm
  }>(OrderFormQuery, {
    ssr: false,
  })

  const [_state, setState] = useState<any>({
    savingQuote: false,
    removing: false,
    usingQuote: false,
    isModalOpen: false,
    expires: null,
    logo: null,
    quoteList: [],
    summary: [
      {
        label: translateMessage({
          id: 'orderquote.summary.subtotal',
        }),
        value: 0,
        isLoading: true,
      },
      {
        label: translateMessage({
          id: 'orderquote.summary.shipping',
        }),
        value: 0,
        isLoading: true,
      },

      {
        label: translateMessage({
          id: 'orderquote.summary.discounts',
        }),
        value: 0,
        isLoading: true,
      },
      {
        label: translateMessage({
          id: 'orderquote.summary.total',
        }),
        value: 0,
        isLoading: true,
      },
    ],
    loading: true,
  })

  const {
    route: { params },
  } = useRuntime()

  const {
    savingQuote,
    usingQuote,
    isModalOpen,
    removing,
    quoteList,
    loading,
    summary,
    expires,
    logo,
  } = _state

  const handleModalToggle = () => {
    setState({ ..._state, isModalOpen: !isModalOpen })
  }

  const { showToast } = useContext(ToastContext)

  const toastMessage = (messsageKey: string) => {
    const message = translateMessage({
      id: messsageKey,
    })

    const action = undefined

    showToast({ message, action })
  }

  if (orderFormError) {
    toastMessage('orderquote.view.error.orderForm')
  }

  const handleRemoveCart = () => {
    setState({
      ..._state,
      removing: true,
      isModalOpen: false,
    })
    RemoveCart({
      variables: {
        id: params.id,
      },
    }).then(() => {
      navigate({
        to: '/orderquote',
      })
    })
  }

  const handleUseCart = () => {
    setState({
      ..._state,
      usingQuote: true,
    })

    const variables = {
      orderFormId: orderFormData?.orderForm.id,
      userType: orderFormData?.orderForm.userType,
      items: quoteList.items.map(({ id, quantity, sellingPrice }: any) => {
        return {
          id,
          quantity,
          sellingPrice,
        }
      }),
    }

    UseCart({
      variables,
    }).then(() => {
      toastMessage('orderquote.view.success')
      window.location.replace('/checkout/#/cart')
    })
  }

  if (initialLoad || quoteList.length === 0) {
    initialLoad = false
    GetCart({
      variables: {
        id: params.id,
      },
    }).then((res: any) => {
      if (res?.data?.getCart) {
        // eslint-disable-next-line no-console
        console.log('GetSetupConfig', GetSetupConfig)

        const {
          getSetupConfig: { adminSetup },
        } = GetSetupConfig

        // eslint-disable-next-line prefer-destructuring
        const {
          subtotal,
          discounts,
          total,
          shipping,
          creationDate,
        } = res.data.getCart[0]
        const exp = new Date(creationDate)
        const { cartLifeSpan, storeLogoUrl } = adminSetup || DEFAULT_ADMIN_SETUP
        // eslint-disable-next-line radix
        exp.setDate(exp.getDate() + parseInt(cartLifeSpan))

        setState({
          ..._state,
          expires: exp,
          logo: storeLogoUrl,
          quoteList: res.data.getCart[0],
          summary: [
            {
              label: translateMessage({
                id: 'orderquote.summary.subtotal',
              }),
              value: <FormattedCurrency value={subtotal} />,
              isLoading: false,
            },
            {
              label: translateMessage({
                id: 'orderquote.summary.shipping',
              }),
              value: <FormattedCurrency value={shipping} />,
              isLoading: false,
            },
            {
              label: translateMessage({
                id: 'orderquote.summary.discounts',
              }),
              value: <FormattedCurrency value={discounts} />,
              isLoading: false,
            },
            {
              label: translateMessage({
                id: 'orderquote.summary.total',
              }),
              value: <FormattedCurrency value={total} />,
              isLoading: false,
            },
          ],
          loading: false,
        })
      } else {
        toastMessage('orderquote.list.loadingError')
      }
    })
  }

  const defaultSchema = {
    properties: {
      refId: {
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

  const formatDate = (date: string) => {
    const tempDate = new Date(date)
    return intl.formatDate(tempDate, {
      day: 'numeric',
      month: 'numeric',
      year: 'numeric',
    })
  }

  const CSS_HANDLES = [
    'containerView',
    'titleView',
    'inputCreate',
    'buttonDelete',
    'buttonPrint',
    'buttonUse',
    'printingArea',
    'containerFields',
    'field',
    'listContainer',
    'totalizerContainer',
    'logo',
  ] as const

  const handles = useCssHandles(CSS_HANDLES)

  return (
    <div className={`${handles.containerView}`}>
      <div className={`${handles.titleView} noPrinting`}>
        <PageHeader
          title={translateMessage({
            id: 'orderquote.view.title',
          })}
          linkLabel={translateMessage({
            id: 'orderquote.button.back',
          })}
          onLinkClick={() => {
            navigate({
              to: '/orderquote',
            })
          }}
        >
          <div className="flex flex-row noPrinting">
            <div
              className={`${handles.buttonContainerView} mb5 flex flex-column items-end w-100 pt6`}
            >
              <div className="flex">
                <div className={`mr5 ${handles.buttonDelete}`}>
                  <Button
                    variation="danger-tertiary"
                    isLoading={removing}
                    disabled={loading || savingQuote}
                    onClick={() => {
                      handleModalToggle()
                    }}
                  >
                    <FormattedMessage id="orderquote.button.delete" />
                  </Button>
                </div>
                <div className={`mr5 ${handles.buttonPrint}`}>
                  <PrintButton
                    isLoading={savingQuote}
                    disabled={loading || savingQuote || removing}
                  />
                </div>
                <div className={`${handles.buttonUse}`}>
                  <Button
                    variation="primary"
                    isLoading={loadingOrderForm || usingQuote}
                    disabled={loading || orderFormError || removing}
                    onClick={() => {
                      handleUseCart()
                    }}
                  >
                    <FormattedMessage id="orderquote.button.use" />
                  </Button>
                </div>
              </div>
            </div>
          </div>
        </PageHeader>
      </div>
      <div className={`ph5 ph7-ns printing-area ${handles.printingArea}`}>
        {!loading && (
          <div className="flex flex-row">
            <div
              className={`flex flex-column w-100 ${handles.containerFields}`}
            >
              {!!logo && (
                <div className="mb5">
                  <img
                    src={logo}
                    alt={quoteList.cartName}
                    className={`${handles.logo}`}
                    height="50"
                  />
                </div>
              )}
              <div className={`mb2 ${handles.field}`}>
                <span className="b">
                  <FormattedMessage id="orderquote.view.label.cartName" />
                </span>
                : {quoteList.cartName}
              </div>
              <div className={`mb2 ${handles.field}`}>
                <span className="b">
                  <FormattedMessage id="orderquote.view.label.creationDate" />
                </span>
                : {formatDate(quoteList.creationDate)}
              </div>
              <div className={`mb2 ${handles.field}`}>
                <span className="b">
                  <FormattedMessage id="orderquote.view.label.expirationDate" />
                </span>
                : {formatDate(expires)}
              </div>
              {!!quoteList.paymentTerm && (
                <div className={`mb4 ${handles.field}`}>
                  <span className="b">
                    <FormattedMessage id="orderquote.view.label.paymentTerm" />
                  </span>
                  : {quoteList.paymentTerm}
                </div>
              )}
              {!!quoteList.address && (
                <div>
                  <div className="mb2 mt5 b">
                    <FormattedMessage id="orderquote.view.label.address" />
                  </div>
                  <div className={`${quoteList.address ? '' : 'dn'}`}>
                    <div className={`mb2 ${handles.field}`}>
                      <span className="b">
                        <FormattedMessage id="orderquote.view.label.street" />
                      </span>
                      : {quoteList?.address?.street}
                    </div>
                    <div className={`mb2 ${handles.field}`}>
                      <span className="b">
                        <FormattedMessage id="orderquote.view.label.number" />
                      </span>
                      : {quoteList?.address?.number}
                    </div>
                    <div
                      className={`${handles.field} ${
                        quoteList?.address?.complement ? 'mb2' : 'dn'
                      }`}
                    >
                      <span className="b">
                        <FormattedMessage id="orderquote.view.label.complement" />
                      </span>
                      : {quoteList?.address?.complement}
                    </div>
                    <div className={`mb2 ${handles.field}`}>
                      <span className="b">
                        <FormattedMessage id="orderquote.view.label.neighborhood" />
                      </span>
                      : {quoteList?.address?.neighborhood}
                    </div>
                    <div className={`mb2 ${handles.field}`}>
                      <span className="b">
                        <FormattedMessage id="orderquote.view.label.city" />
                      </span>
                      : {quoteList?.address?.city}
                    </div>
                    <div className={`mb2 ${handles.field}`}>
                      <span className="b">
                        <FormattedMessage id="orderquote.view.label.state" />
                      </span>
                      : {quoteList?.address?.state}
                    </div>
                    <div className={`mb2 ${handles.field}`}>
                      <span className="b">
                        <FormattedMessage id="orderquote.view.label.postalCode" />
                      </span>
                      : {quoteList?.address?.postalCode}
                    </div>
                    <div className={`mb2 ${handles.field}`}>
                      <span className="b">
                        <FormattedMessage id="orderquote.view.label.country" />
                      </span>
                      : {quoteList?.address?.country}
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>
        )}

        <div className="flex flex-row">
          <div
            className={`flex flex-column w-100 mb5 ${handles.listContainer}`}
          >
            <Table
              fullWidth
              schema={defaultSchema}
              items={quoteList.items}
              loading={loading}
              density="high"
            />
            <div className={`mt5 ${handles.totalizerContainer}`}>
              <Totalizer items={summary} />
            </div>
          </div>
        </div>
      </div>
      <ModalDialog
        centered
        confirmation={{
          onClick: handleRemoveCart,
          label: translateMessage({
            id: 'orderquote.delete.confirmation.yes',
          }),
        }}
        cancelation={{
          onClick: handleModalToggle,
          label: translateMessage({
            id: 'orderquote.delete.confirmation.no',
          }),
        }}
        isOpen={isModalOpen}
        onClose={handleModalToggle}
      >
        <h1>
          <FormattedMessage id="orderquote.delete.confirmation.title" />
        </h1>
        <p>
          <FormattedMessage id="orderquote.delete.confirmation.message" />
        </p>
      </ModalDialog>
    </div>
  )
}

QuoteCreate.propTypes = {
  SaveCartMutation: PropTypes.func,
  GetSetupConfig: PropTypes.object,
  GetCart: PropTypes.func,
  RemoveCart: PropTypes.func,
  UseCart: PropTypes.func,
}

interface MessageDescriptor {
  id: string
  description?: string | object
  defaultMessage?: string
}

export default injectIntl(
  compose(
    graphql(removeCart, {
      name: 'RemoveCart',
      options: { ssr: false },
    }),
    graphql(getCart, {
      name: 'GetCart',
      options: { ssr: false },
    }),
    graphql(getSetupConfig, {
      name: 'GetSetupConfig',
      options: { ssr: false },
    }),
    graphql(useCart, {
      name: 'UseCart',
      options: { ssr: false },
    })
  )(QuoteCreate)
)
