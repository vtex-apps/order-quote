/* eslint-disable vtex/prefer-early-return */
/* eslint-disable no-console */
import React, { useEffect } from 'react'
import { injectIntl, FormattedMessage, WrappedComponentProps } from 'react-intl'
import { FormattedCurrency } from 'vtex.format-currency'
import { Table, Button, PageHeader } from 'vtex.styleguide'
import { useCssHandles } from 'vtex.css-handles'
import { compose, graphql, useLazyQuery } from 'react-apollo'
import PropTypes from 'prop-types'
import { useRuntime } from 'vtex.render-runtime'

import getCarts from './queries/getCarts.gql'
import getOrderForm from './queries/orderForm.gql'

let initialLoad = true

const QuoteList: StorefrontFunctionComponent<WrappedComponentProps & any> = ({
  data: { orderForm },
  intl,
}: any) => {
  const [getQuoteList, { data, loading }] = useLazyQuery(getCarts, {
    fetchPolicy: 'no-cache',
    partialRefetch: true,
  })

  const { navigate } = useRuntime()

  const translateMessage = (message: MessageDescriptor) => {
    return intl.formatMessage(message)
  }

  const fetch = () => {
    getQuoteList({
      variables: {
        email: orderForm.clientProfileData.email,
      },
    })
  }
  useEffect(() => {
    if (orderForm && initialLoad) {
      initialLoad = false
      fetch()
    }
  })

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
                page: `store.create`,
              })
              setTimeout(() => {
                initialLoad = true
              }, 1000)
            }}
          >
            <FormattedMessage id="store/orderquote.button.new" />
          </Button>
        </div>
      </PageHeader>

      <div className="flex flex-row ph5 ph7-ns">
        <div className="mb5 flex flex-column w-100">
          {orderForm &&
            (!orderForm.clientProfileData ||
              !orderForm.clientProfileData.email) && (
              <div className={`mb5 ${handles.notAuthenticatedMessage}`}>
                <FormattedMessage id="store/orderquote.error.notAuthenticated" />
              </div>
            )}
          {orderForm?.clientProfileData?.email && data && (
            <div className={`mb5 ${handles.listContainer}`}>
              <Table
                fullWidth
                schema={defaultSchema}
                items={data.getCarts}
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
    })
  )(QuoteList)
)
