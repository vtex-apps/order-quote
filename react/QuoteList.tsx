/* eslint-disable no-console */
import React, { useState } from 'react'
import { injectIntl, FormattedMessage, WrappedComponentProps } from 'react-intl'
import { FormattedCurrency } from 'vtex.format-currency'
import { Table, Button, PageHeader } from 'vtex.styleguide'
import { useCssHandles } from 'vtex.css-handles'
import getCarts from './graphql/getCarts.graphql'
import { compose, graphql } from 'react-apollo'
import PropTypes from 'prop-types'
import { useRuntime } from 'vtex.render-runtime'

import getOrderForm from './queries/orderForm.gql'

let initialLoad = true

const QuoteList: StorefrontFunctionComponent<WrappedComponentProps & any> = ({
  data: { orderForm },
  GetCarts,
  intl,
}: any) => {
  const [_state, setState] = useState<any>({
    quoteList: [],
    loading: true,
  })
  const { quoteList, loading } = _state

  const { navigate } = useRuntime()

  const translateMessage = (message: MessageDescriptor) => {
    return intl.formatMessage(message)
  }

  const getQuoteList = () => {
    initialLoad = false
    if (orderForm?.clientProfileData?.email) {
      GetCarts({
        variables: {
          email: orderForm.clientProfileData.email,
        },
      }).then((res: any) => {
        if (res?.data?.getCarts.length) {
          setState({
            ..._state,
            quoteList: res.data.getCarts,
            loading: false,
          })
        } else {
          setState({
            ..._state,
            loading: false,
          })
        }
      })
    }
  }

  if (orderForm) {
    if (initialLoad || (quoteList.length === 0 && loading === true)) {
      getQuoteList()
    }
  }

  const defaultSchema = {
    properties: {
      cartName: {
        title: 'Name',
        width: 300,
      },
      discounts: {
        title: 'Discounts',
        minWidth: 100,
        headerRight: true,
        // eslint-disable-next-line react/display-name
        cellRenderer: ({ cellData }: any) => {
          return (
            <span className="tr w-100">
              <FormattedCurrency
                value={cellData > 0 ? cellData / 100 : cellData}
              />
            </span>
          )
        },
      },
      shipping: {
        title: 'Shipping',
        minWidth: 100,
        headerRight: true,
        // eslint-disable-next-line react/display-name
        cellRenderer: ({ cellData }: any) => {
          const newCellData = cellData > 0 ? cellData / 100 : cellData
          return (
            <span className="tr w-100">
              <FormattedCurrency
                value={newCellData > 0 ? newCellData / 100 : newCellData}
              />
            </span>
          )
        },
      },
      total: {
        title: 'Total',
        minWidth: 100,
        headerRight: true,
        // eslint-disable-next-line react/display-name
        cellRenderer: ({ cellData }: any) => {
          return (
            <span className="tr w-100">
              <FormattedCurrency
                value={cellData > 0 ? cellData / 100 : cellData}
              />
            </span>
          )
        },
      },
      creationDate: {
        title: 'Created',
        headerRight: true,
        // eslint-disable-next-line react/display-name
        cellRenderer: ({ cellData }: any) => {
          return (
            <span className="tr w-100">
              {intl.formatDate(cellData, {
                day: 'numeric',
                month: 'short',
                year: 'numeric',
              })}
            </span>
          )
        },
      },
    },
  }

  const CSS_HANDLES = [
    'containerList',
    'createButton',
    'listContainer',
    'notAuthenticatedMessage',
  ] as const
  const handles = useCssHandles(CSS_HANDLES)

  return (
    <div className={`${handles.containerList}`}>
      <PageHeader
        title={translateMessage({
          id: 'store/orderquote.list.title',
        })}
      >
        <div className={`${handles.createButton}`}>
          <Button
            variation="primary"
            onClick={() => {
              navigate({
                to: `/orderquote/create`,
              })
            }}
          >
            <FormattedMessage id="store/orderquote.button.new" />
          </Button>
        </div>
      </PageHeader>

      <div className="flex flex-row ph5 ph7-ns">
        <div className={`mb5 flex flex-column w-100`}>
          {orderForm &&
            (!orderForm.clientProfileData ||
              !orderForm.clientProfileData.email) && (
              <div className={`mb5 ${handles.notAuthenticatedMessage}`}>
                <FormattedMessage id="store/orderquote.error.notAuthenticated" />
              </div>
            )}
          {orderForm?.clientProfileData?.email && (
            <div className={`mb5 ${handles.listContainer}`}>
              <Table
                fullWidth
                schema={defaultSchema}
                items={quoteList}
                density="high"
                loading={loading}
                onRowClick={({ rowData }: any) => {
                  navigate({
                    to: `/orderquote/view/${rowData.id}`,
                  })
                }}
              />
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

QuoteList.propTypes = {
  GetCarts: PropTypes.func,
  data: PropTypes.object,
}

interface MessageDescriptor {
  id: string
  description?: string | object
  defaultMessage?: string
}

export default injectIntl(
  compose(
    graphql(getOrderForm, {
      options: { ssr: false },
    }),
    graphql(getCarts, {
      name: 'GetCarts',
      options: { ssr: false },
    })
  )(QuoteList)
)
