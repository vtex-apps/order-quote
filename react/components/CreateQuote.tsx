/* eslint-disable @typescript-eslint/no-explicit-any */
import React, { useState, useContext, useEffect } from 'react'
import {
  Input,
  Textarea,
  Button,
  Table,
  Totalizer,
  ToastContext,
  PageHeader,
} from 'vtex.styleguide'
import { useCssHandles } from 'vtex.css-handles'
import { useQuery, useMutation } from 'react-apollo'
import { FormattedCurrency } from 'vtex.format-currency'
import { useRuntime } from 'vtex.render-runtime'
import { useIntl, FormattedMessage } from 'react-intl'

import { getSession } from '../modules/session'
import saveCartMutation from '../graphql/createQuote.graphql'
import clearCartMutation from '../graphql/clearCartMutation.graphql'
import getOrderForm from '../queries/orderForm.gql'
import storageFactory from '../utils/storage'

const localStore = storageFactory(() => localStorage)

const useSessionResponse = () => {
  const [session, setSession] = useState<any>()
  const sessionPromise = getSession()

  useEffect(() => {
    if (!sessionPromise) {
      return
    }

    sessionPromise.then((sessionResponse) => {
      const { response } = sessionResponse

      setSession(response)
    })
  }, [sessionPromise])

  return session
}

let isAuthenticated =
  JSON.parse(String(localStore.getItem('orderquote_isAuthenticated'))) ?? false

const CSS_HANDLES = [
  'containerCreate',
  'inputCreate',
  'buttonsContainer',
  'noteContainer',
  'buttonSaveQuote',
  'buttonRequestQuote',
  'listContainer',
  'descriptionContainer',
  'notAuthenticatedMessage',
  'itemNameContainer',
  'itemName',
  'itemSkuName',
  'totalizerContainer',
] as const

const QuoteCreate: StorefrontFunctionComponent = () => {
  const [_state, setState] = useState({
    name: '',
    note: '',
    errorMessage: '',
    savingQuote: false,
  })

  const { formatMessage } = useIntl()
  const { navigate } = useRuntime()

  const { showToast } = useContext(ToastContext)
  const sessionResponse: any = useSessionResponse()
  const handles = useCssHandles(CSS_HANDLES)

  const { data } = useQuery(getOrderForm, {
    ssr: false,
  })

  const [SaveCartMutation] = useMutation(saveCartMutation)
  const [ClearCartMutation] = useMutation(clearCartMutation)

  if (!data?.orderForm) return null
  const { orderForm } = data

  if (sessionResponse) {
    isAuthenticated =
      sessionResponse?.namespaces?.profile?.isAuthenticated?.value === 'true'

    localStore.setItem(
      'orderquote_isAuthenticated',
      JSON.stringify(isAuthenticated)
    )
  }

  const { name, note, savingQuote, errorMessage } = _state

  const translateMessage = (message: MessageDescriptor) => {
    return formatMessage(message)
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
            <div className={handles.itemNameContainer}>
              <span className={handles.itemName}>{rowData.name}</span>
              <br />
              <span className={`t-mini ${handles.itemSkuName}`}>
                {rowData.skuName}
              </span>
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
      total: {
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
  const { totalizers } = orderForm ?? {}

  const subtotal = (
    totalizers?.find((x: { id: string }) => x.id === 'Items') || {
      value: 0,
    }
  ).value

  // TODO: Capture order-level discounts
  //
  //   const discounts = (
  //     totalizers?.find((x: { id: string }) => x.id === 'Discounts') || {
  //       value: 0,
  //     }
  //   ).value

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
        page: 'store.order-quote',
        fallbackToWindowLocation: true,
        fetchPage: true,
      })
    })
  }

  const handleSaveCart = (sendToSalesRep: boolean) => {
    if (!isAuthenticated) {
      toastMessage('store/orderquote.error.notAuthenticated')
    } else {
      activeLoading(true)
      if (
        name &&
        name.length > 0 &&
        orderForm?.items &&
        orderForm.items.length
      ) {
        // referenceName: String
        // items: [CartItem]
        // subtotal: Float
        // note: String
        // sendToSalesRep: Boolean

        const cart = {
          referenceName: name,
          items: orderForm.items.map((item: any) => {
            return {
              name: item.name,
              skuName: item.skuName,
              refId: item.refId,
              id: item.id,
              productId: item.productId,
              imageUrl: item.imageUrl,
              listPrice: parseInt(String(item.listPrice * 100), 10),
              price: parseInt(String(item.price * 100), 10),
              quantity: item.quantity,
              sellingPrice: parseInt(String(item.sellingPrice * 100), 10),
            }
          }),
          subtotal: parseInt(String(subtotal * 100), 10),
          note,
          sendToSalesRep,
        }

        SaveCartMutation({
          variables: cart,
        })
          .then((result: any) => {
            if (result.data.orderQuote) {
              activeLoading(false)
              toastMessage('store/orderquote.create.success')
              activeLoading(false)
              handleClearCart(orderForm.orderFormId)
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

  const saveQuote = (sendToSalesRep: boolean) => {
    if (!name) {
      setState({
        ..._state,
        errorMessage: translateMessage({
          id: 'store/orderquote.create.required',
        }),
      })
    } else {
      handleSaveCart(sendToSalesRep)
    }
  }

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

      {!isAuthenticated && (
        <div className="flex flex-row ph5 ph7-ns">
          <div className="flex flex-column w-100">
            <div className={`mb5 ${handles.notAuthenticatedMessage}`}>
              <FormattedMessage id="store/orderquote.error.notAuthenticated" />
            </div>
          </div>
        </div>
      )}

      {isAuthenticated && (
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
              className={`flex flex-column w-100 mb5 ${handles.noteContainer}`}
            >
              <Textarea
                label={translateMessage({
                  id: 'store/orderquote.create.descriptionLabel',
                })}
                onChange={(e: any) =>
                  setState({ ..._state, note: e.target.value })
                }
                value={note}
                characterCountdownText={
                  <FormattedMessage
                    id="store/orderquote.create.characterLeft"
                    values={{ count: _state.note.length }}
                  />
                }
                maxLength="500"
                rows="4"
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
                className={`flex flex-column w-30 ${handles.buttonSaveQuote}`}
              >
                <Button
                  variation="secondary"
                  isLoading={savingQuote}
                  onClick={() => {
                    saveQuote(false)
                  }}
                >
                  <FormattedMessage id="store/orderquote.create.button.save-for-later" />
                </Button>
              </div>
              <div
                className={`flex flex-column w-30 ${handles.buttonRequestQuote}`}
              >
                <Button
                  variation="primary"
                  isLoading={savingQuote}
                  onClick={() => {
                    saveQuote(true)
                  }}
                >
                  <FormattedMessage id="store/orderquote.create.button.request-quote" />
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

interface MessageDescriptor {
  id: string
  description?: string | Record<string, unknown>
  defaultMessage?: string
  values?: Record<string, unknown>
}

export default QuoteCreate
