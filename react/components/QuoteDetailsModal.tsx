/* eslint-disable react/display-name */
import type { FunctionComponent, ChangeEventHandler } from 'react'
import React, { useState, useEffect } from 'react'
import { useIntl, FormattedMessage } from 'react-intl'
import { useQuery, useMutation } from 'react-apollo'
import { useRuntime } from 'vtex.render-runtime'
import {
  Modal,
  Button,
  Table,
  Card,
  Slider,
  Tag,
  Textarea,
  Input,
  InputCurrency,
} from 'vtex.styleguide'
import { formatCurrency, FormattedCurrency } from 'vtex.format-currency'

import { labelTypeByStatusMap } from './QuotesTable'
import GET_QUOTE from '../graphql/getQuote.graphql'
import UPDATE_QUOTE from '../graphql/updateQuote.graphql'
import GET_AUTH_RULES from '../graphql/getDimension.graphql'

interface QuoteDetailsModalProps {
  isOpen: boolean
  isSalesRep: boolean
  quoteId: string
  handleClose: () => void
}

function shallowEqual(
  object1: Record<string, unknown>,
  object2: Record<string, unknown>
) {
  const keys1 = Object.keys(object1)
  const keys2 = Object.keys(object2)

  if (keys1.length !== keys2.length) {
    return false
  }

  for (const key of keys1) {
    if (object1[key] !== object2[key]) {
      return false
    }
  }

  return true
}

function arrayShallowEqual(
  array1: Array<Record<string, any>>,
  array2: Array<Record<string, any>>
) {
  let equal = true

  for (const [index, member] of array1.entries()) {
    if (!shallowEqual(member, array2[index])) {
      equal = false
      break
    }
  }

  return equal
}

const QuoteDetailsModal: FunctionComponent<QuoteDetailsModalProps> = ({
  isOpen,
  isSalesRep,
  quoteId,
  handleClose,
}) => {
  const intl = useIntl()
  const { formatMessage, formatDate } = intl

  const { culture } = useRuntime()
  const { currency: currencyCode, locale } = culture
  const formatPrice = (value: number) =>
    formatCurrency({
      intl,
      culture,
      value: value / 100,
    })

  const [quoteState, setQuoteState] = useState<Quote>({
    id: '',
    costCenter: '',
    creationDate: '',
    creatorEmail: '',
    creatorRole: '',
    expirationDate: '',
    items: [],
    lastUpdate: '',
    organization: '',
    referenceName: '',
    status: '',
    subtotal: 0,
    updateHistory: [],
    viewedByCustomer: false,
    viewedBySales: false,
  })

  const [formState, setFormState] = useState({
    isEditable: false,
  })

  const [noteState, setNoteState] = useState('')

  const [discountState, setDiscountState] = useState(0)

  const { data } = useQuery(GET_QUOTE, {
    variables: { id: quoteId },
    ssr: false,
  })

  const { data: orderAuthData } = useQuery(GET_AUTH_RULES, { ssr: false })

  useEffect(() => {
    // eslint-disable-next-line no-console
    console.log(orderAuthData)
  }, [orderAuthData])

  useEffect(() => {
    if (!data?.getQuote) return

    const {
      getQuote: {
        id,
        costCenter,
        creationDate,
        creatorEmail,
        creatorRole,
        expirationDate,
        items,
        lastUpdate,
        organization,
        referenceName,
        status,
        subtotal,
        updateHistory,
        viewedByCustomer,
        viewedBySales,
      },
    } = data

    setQuoteState({
      id,
      costCenter,
      creationDate,
      creatorEmail,
      creatorRole,
      expirationDate,
      items,
      lastUpdate,
      organization,
      referenceName,
      status,
      subtotal,
      updateHistory,
      viewedByCustomer,
      viewedBySales,
    })

    if (status === 'pending' || status === 'ready' || status === 'revised') {
      setFormState((f) => {
        return {
          ...f,
          isEditable: true,
        }
      })
    }
  }, [data])

  const [updateQuote] = useMutation(UPDATE_QUOTE)

  const handleSaveQuote = () => {
    const { id, items, subtotal } = quoteState

    updateQuote({
      variables: {
        id,
        items,
        subtotal,
        email: '',
        role: '',
        note: '',
        decline: false,
      },
    })
    handleClose()
  }

  const handleUseQuote = () => {}

  if (!data?.getQuote) return null

  const {
    getQuote: { subtotal, items, id },
  } = data

  const handleDeclineQuote = () => {
    // use data from original graphQL query, not from state
    updateQuote({
      variables: {
        id,
        items,
        subtotal,
        email: '',
        role: '',
        note: '',
        decline: true,
      },
    })
    handleClose()
  }

  const handleUpdateSellingPrice: (
    id: string
  ) => ChangeEventHandler<HTMLInputElement> = (itemId) => (event) => {
    let newSubtotal = 0
    const newItems = items.map((item: QuoteItem) => {
      if (item.id === itemId) {
        newSubtotal += +event.target.value * 100 * item.quantity

        return {
          ...item,
          sellingPrice: ((event.target.value as unknown) as number) * 100,
        }
      }

      newSubtotal += item.sellingPrice * item.quantity

      return item
    })

    setQuoteState({
      ...quoteState,
      items: newItems,
      subtotal: newSubtotal,
    })
  }

  const handleUpdateQuantity: (
    id: string
  ) => ChangeEventHandler<HTMLInputElement> = (itemId) => (event) => {
    let newSubtotal = 0
    const newItems = items.map((item: QuoteItem) => {
      if (item.id === itemId) {
        newSubtotal += item.sellingPrice * +event.target.value

        return {
          ...item,
          quantity: +event.target.value,
        }
      }

      newSubtotal += item.sellingPrice * item.quantity

      return item
    })

    setQuoteState({
      ...quoteState,
      items: newItems,
      subtotal: newSubtotal,
    })
  }

  const handlePercentageDiscount = (percent: number) => {
    setDiscountState(percent)
    const newItems = [] as QuoteItem[]

    items.forEach((item: QuoteItem) => {
      const newSellingPrice = item.sellingPrice * ((100 - percent) / 100)

      newItems.push({ ...item, sellingPrice: newSellingPrice })
    })

    setQuoteState({
      ...quoteState,
      items: newItems,
    })
  }

  return (
    <Modal
      isOpen={isOpen}
      title={data.getQuote.referenceName}
      onClose={handleClose}
      responsiveFullScreen
      bottomBar={
        <div className="nowrap">
          <span className="mr4">
            <Button variation="tertiary" onClick={handleClose}>
              <FormattedMessage id="store/orderquote.quotes-table.details-modal.cancel" />
            </Button>
          </span>
          <span className="mr4">
            <Button
              variation="danger"
              onClick={handleDeclineQuote}
              disabled={!formState.isEditable}
            >
              <FormattedMessage id="store/orderquote.quotes-table.details-modal.decline" />
            </Button>
          </span>
          <span>
            <Button
              variation="primary"
              onClick={handleSaveQuote}
              disabled={
                noteState === '' && arrayShallowEqual(items, quoteState.items)
              }
            >
              {isSalesRep ? (
                <FormattedMessage id="store/orderquote.quotes-table.details-modal.save" />
              ) : (
                <FormattedMessage id="store/orderquote.quotes-table.details-modal.submit-to-sales-rep" />
              )}
            </Button>
          </span>
          {!isSalesRep ? (
            <span className="mr4">
              <Button variation="primary" onClick={handleUseQuote}>
                <FormattedMessage id="store/orderquote.quotes-table.details-modal.use-quote" />
              </Button>
            </span>
          ) : null}
        </div>
      }
    >
      <Table
        totalizers={[
          {
            label: formatMessage({
              id: 'store/orderquote.quotes-table.details-modal.subtotal.title', // 'Subtotal'
            }),
            value: formatPrice(quoteState.subtotal / 100),
          },
          {
            label: formatMessage({
              id:
                'store/orderquote.quotes-table.details-modal.expiration.title', // 'Expiration'
            }),
            value: formatDate(quoteState.expirationDate, {
              day: 'numeric',
              month: 'numeric',
              year: 'numeric',
            }),
          },
          {
            label: formatMessage({
              id: 'store/orderquote.quotes-table.details-modal.status.title', // 'Status'
            }),
            value: (
              <Tag
                type={labelTypeByStatusMap[quoteState.status]}
                variation="low"
              >
                {quoteState.status}
              </Tag>
            ),
          },
        ]}
        disableHeader
        fullWidth
        schema={{
          properties: {
            imageUrl: {
              title: formatMessage({
                id:
                  'store/orderquote.quotes-table.details-modal.items.image.title', // 'Image'
              }),
              cellRenderer: ({ rowData: { imageUrl, skuName } }: any) =>
                imageUrl ? (
                  <div className="dib v-mid relative">
                    <img
                      className="br2 v-mid"
                      height="38"
                      width="38"
                      src={imageUrl}
                      alt={skuName}
                      crossOrigin="anonymous"
                    />
                  </div>
                ) : null,
              width: 70,
            },
            name: {
              title: formatMessage({
                id:
                  'store/orderquote.quotes-table.details-modal.items.name.title', // 'Name'
              }),
              cellRenderer: ({ rowData: { name, skuName } }: any) => (
                <>{`${name} ${skuName}`}</>
              ),
            },
            quantity: {
              title: formatMessage({
                id:
                  'store/orderquote.quotes-table.details-modal.items.quantity.title', // 'Quantity'
              }),
              width: 90,
              cellRenderer: ({
                cellData: quantity,
                rowData: { id: itemId },
              }: any) => {
                if (formState.isEditable && isSalesRep) {
                  return (
                    <Input
                      id={itemId}
                      name="quantity"
                      value={quantity}
                      onChange={handleUpdateQuantity(itemId)}
                    />
                  )
                }

                return quantity
              },
            },
            sellingPrice: {
              title: formatMessage({
                id:
                  'store/orderquote.quotes-table.details-modal.items.price.title', // 'Price'
              }),
              headerRight: true,
              width: 144,
              cellRenderer: ({
                cellData: sellingPrice,
                rowData: { id: itemId },
              }: any) => {
                if (formState.isEditable && isSalesRep && discountState === 0) {
                  return (
                    <InputCurrency
                      name="price"
                      value={sellingPrice / 100}
                      onChange={handleUpdateSellingPrice(itemId)}
                      currencyCode={currencyCode}
                      locale={locale}
                    />
                  )
                }

                return (
                  <div className="w-100 tr">
                    <FormattedCurrency value={sellingPrice / 100} />
                  </div>
                )
              },
            },
          },
        }}
        items={quoteState.items}
      />
      {formState.isEditable && isSalesRep ? (
        <div className="mt3">
          <h3 className="t-heading-3">
            <FormattedMessage id="store/orderquote.quotes-table.details-modal.apply-discount.title" />
          </h3>
          <div className="mt1">
            <FormattedMessage id="store/orderquote.quotes-table.details-modal.apply-discount.help-text" />
          </div>
          <div className="mt1">
            <Slider
              onChange={([value]: [number]) => {
                handlePercentageDiscount(value)
              }}
              min={0}
              max={100}
              step={1}
              disabled={false}
              defaultValues={[0]}
              alwaysShowCurrentValue={false}
              value={discountState}
            />
          </div>
        </div>
      ) : null}

      <div className="mt3">
        <h3 className="t-heading-3">
          <FormattedMessage id="store/orderquote.quotes-table.details-modal.update-history.title" />
        </h3>
        {quoteState.updateHistory.map((update, index) => {
          return (
            <div key={index} className="ph4 pv2">
              <Card>
                <p>
                  <FormattedMessage
                    id="store/orderquote.quotes-table.details-modal.update-history.update-details"
                    values={{
                      date: formatDate(update.date, {
                        day: 'numeric',
                        month: 'numeric',
                        year: 'numeric',
                      }),
                      email: update.email,
                      role: update.role,
                      status: update.status,
                      index,
                    }}
                  />
                </p>
                <p>
                  <b>
                    <FormattedMessage id="store/orderquote.quotes-table.details-modal.update-history.notes" />
                  </b>
                  <br />
                  {update.note}
                </p>
              </Card>
            </div>
          )
        })}
      </div>
      {formState.isEditable ? (
        <div className="mt3">
          <Textarea
            label={formatMessage({
              id: 'store/orderquote.quotes-table.details-modal.add-note.label', // Add Note
            })}
            value={noteState}
            onChange={(e: React.ChangeEvent<HTMLInputElement>) => {
              setNoteState(e.target.value)
            }}
            characterCountdownText={
              <FormattedMessage
                id="store/orderquote.create.characterLeft"
                values={{ count: noteState.length }}
              />
            }
            maxLength="500"
            rows="4"
          />
        </div>
      ) : null}
      {
        // TODO: Do not allow discount that would not pass order authorization rules
      }
    </Modal>
  )
}

export default QuoteDetailsModal
