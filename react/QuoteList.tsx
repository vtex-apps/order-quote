import React, { useState } from 'react'
import { injectIntl, FormattedMessage, WrappedComponentProps } from 'react-intl'
import { FormattedCurrency } from 'vtex.format-currency'
import { Table, Button, PageHeader } from 'vtex.styleguide'
import { useCssHandles } from 'vtex.css-handles'
import getCarts from './graphql/getCarts.graphql'
import { compose, graphql } from 'react-apollo'
import PropTypes from 'prop-types'
import { useRuntime } from 'vtex.render-runtime'

let initialLoad = true

const QuoteList: StorefrontFunctionComponent<WrappedComponentProps & any> = ({
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

  if (initialLoad || (quoteList.length === 0 && loading === true)) {
    initialLoad = false
    GetCarts({
      variables: {
        email: 'wender.lima@gmail.com',
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
              <FormattedCurrency value={cellData} />
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
          return (
            <span className="tr w-100">
              <FormattedCurrency value={cellData} />
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
              <FormattedCurrency value={cellData} />
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
    'titleList',
    'createButton',
    'inputCreate',
    'listContainer',
  ] as const
  const handles = useCssHandles(CSS_HANDLES)

  // eslint-disable-next-line no-console
  console.log('quoteList', quoteList)

  return (
    <div className={`${handles.containerList}`}>
      <PageHeader
        title={translateMessage({
          id: 'orderquote.list.title',
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
            <FormattedMessage id="orderquote.button.new" />
          </Button>
        </div>
      </PageHeader>

      <div className="flex flex-row ph5 ph7-ns">
        <div className={`${handles.inputCreate} mb5 flex flex-column w-100`}>
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
        </div>
      </div>
    </div>
  )
}

QuoteList.propTypes = {
  GetCarts: PropTypes.func,
}

interface MessageDescriptor {
  id: string
  description?: string | object
  defaultMessage?: string
}

export default injectIntl(
  compose(
    graphql(getCarts, {
      name: 'GetCarts',
      options: { ssr: false },
    })
  )(QuoteList)
)
