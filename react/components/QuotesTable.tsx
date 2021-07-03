/* eslint-disable react/display-name */
import type { FunctionComponent, ChangeEvent } from 'react'
import React from 'react'
import { Table, Tag, Checkbox } from 'vtex.styleguide'
import { useIntl } from 'react-intl'
import { FormattedCurrency } from 'vtex.format-currency'
// import { useRuntime } from 'vtex.render-runtime'

interface QuotesTableProps {
  isSalesRep: boolean
  quotes: QuoteSimple[]
  page: number
  pageSize: number
  total: number
  loading: boolean
  handlePrevClick: () => void
  handleNextClick: () => void
  handleRowsChange: (e: ChangeEvent<HTMLInputElement>) => void
  searchValue: string
  handleInputSearchChange: (e: React.FormEvent<HTMLInputElement>) => void
  handleInputSearchClear: () => void
  handleInputSearchSubmit: () => void
  handleNewQuote?: () => void
  sortedBy: string
  sortOrder: string
  handleSort: ({
    sortOrder,
    sortedBy,
  }: {
    sortOrder: string
    sortedBy: string
  }) => void
  filterStatements: unknown[]
  handleFiltersChange: (statements: FilterStatement[]) => void
  handleDetailsModal: (id: string) => void
}

interface CellRendererProps {
  cellData: unknown
  rowData: QuoteSimple
  updateCellMeasurements: () => void
}

export const labelTypeByStatusMap: Record<string, string> = {
  ready: 'success',
  placed: 'neutral',
  declined: 'error',
  expired: 'error',
  pending: 'warning',
  revised: 'warning',
}

const QuotesTable: FunctionComponent<QuotesTableProps> = ({
  isSalesRep,
  quotes,
  page,
  pageSize,
  total,
  loading,
  handleNextClick,
  handlePrevClick,
  handleRowsChange,
  searchValue,
  handleInputSearchChange,
  handleInputSearchClear,
  handleInputSearchSubmit,
  // handleNewQuote,
  sortedBy,
  sortOrder,
  handleSort,
  filterStatements,
  handleFiltersChange,
  handleDetailsModal,
}) => {
  const { formatMessage, formatDate } = useIntl()
  // const { navigate } = useRuntime()

  const lineActions = [
    {
      label: () =>
        formatMessage({
          id: 'store/orderquote.quotes-table.details.label', // 'Details'
        }),
      onClick: ({ rowData: { id } }: CellRendererProps) => {
        if (!id) return

        handleDetailsModal(id)
      },
    },
  ]

  const getSchema = () => ({
    properties: {
      referenceName: {
        title: formatMessage({
          id: 'store/orderquote.quotes-table.referenceName.title', // 'Ref. Name'
        }),
        cellRenderer: ({
          rowData: { viewedByCustomer, viewedBySales, referenceName },
        }: CellRendererProps) => {
          let renderedName = <>{referenceName}</>

          if (
            (isSalesRep && !viewedBySales) ||
            (!isSalesRep && !viewedByCustomer)
          ) {
            renderedName = <strong>{referenceName}</strong>
          }

          return renderedName
        },
      },
      subtotal: {
        title: formatMessage({
          id: 'store/orderquote.quotes-table.subtotal.title', // 'Subtotal'
        }),
        headerRight: true,
        cellRenderer: ({ rowData: { subtotal } }: CellRendererProps) => (
          <div className="w-100 tr">
            <FormattedCurrency value={subtotal / 100} />
          </div>
        ),
      },
      creatorEmail: {
        title: formatMessage({
          id: 'store/orderquote.quotes-table.creatorEmail.title', // 'Created by'
        }),
      },
      creationDate: {
        title: formatMessage({
          id: 'store/orderquote.quotes-table.creationDate.title', // 'Created on'
        }),
        cellRenderer: ({ rowData: { creationDate } }: CellRendererProps) => {
          return (
            <>
              {formatDate(creationDate, {
                day: 'numeric',
                month: 'numeric',
                year: 'numeric',
              })}
            </>
          )
        },
        sortable: true,
      },
      expirationDate: {
        title: formatMessage({
          id: 'store/orderquote.quotes-table.expirationDate.title', // 'Expiration'
        }),
        cellRenderer: ({ rowData: { expirationDate } }: CellRendererProps) => {
          return (
            <>
              {formatDate(expirationDate, {
                day: 'numeric',
                month: 'numeric',
                year: 'numeric',
              })}
            </>
          )
        },
        sortable: true,
      },
      status: {
        title: formatMessage({
          id: 'store/orderquote.quotes-table.status.title', // 'Status'
        }),
        cellRenderer: ({ rowData: { status } }: CellRendererProps) => (
          <Tag type={labelTypeByStatusMap[status]} variation="low">
            {status}
          </Tag>
        ),
        sortable: true,
      },
      lastUpdate: {
        title: formatMessage({
          id: 'store/orderquote.quotes-table.lastUpdate.title', // 'Last Update'
        }),
        cellRenderer: ({ rowData: { lastUpdate } }: CellRendererProps) => {
          return (
            <>
              {formatDate(lastUpdate, {
                day: 'numeric',
                month: 'numeric',
                year: 'numeric',
              })}
            </>
          )
        },
        sortable: true,
      },
      organization: {
        title: formatMessage({
          id: 'store/orderquote.quotes-table.organization.title', // 'Organization'
        }),
        sortable: true,
      },
      costCenter: {
        title: formatMessage({
          id: 'store/orderquote.quotes-table.costCenter.title', // 'Cost Center'
        }),
        sortable: true,
      },
    },
  })

  const statusSelectorObject = ({
    value,
    onChange,
  }: {
    value: Record<string, unknown>
    onChange: any
  }) => {
    const initialValue = {
      ready: true,
      placed: true,
      declined: true,
      expired: true,
      pending: true,
      revised: true,
      ...(value || {}),
    } as Record<string, unknown>

    const toggleValueByKey = (key: string) => {
      const newValue = {
        ...(value || initialValue),
        [key]: value ? !value[key] : false,
      }

      return newValue
    }

    return (
      <div>
        {Object.keys(initialValue).map((opt, index) => {
          return (
            <div className="mb3" key={`status-select-object-${opt}-${index}`}>
              <Checkbox
                checked={value ? value[opt] : initialValue[opt]}
                label={opt}
                name="status-checkbox-group"
                onChange={() => {
                  const newValue = toggleValueByKey(`${opt}`)
                  const newValueKeys = Object.keys(newValue)
                  const isEmptyFilter = !newValueKeys.some(
                    (key) => !newValue[key]
                  )

                  onChange(isEmptyFilter ? null : newValue)
                }}
                value={opt}
              />
            </div>
          )
        })}
      </div>
    )
  }

  return (
    <div className="pa7">
      <Table
        fullWidth
        items={quotes}
        loading={loading}
        schema={getSchema()}
        lineActions={lineActions}
        fixFirstColumn
        emptyStateLabel={formatMessage({
          id: 'store/orderquote.quotes-table.empty-state-label', // 'No quotes found.'
        })}
        pagination={{
          onNextClick: handleNextClick,
          onPrevClick: handlePrevClick,
          onRowsChange: handleRowsChange,
          currentItemFrom: (page - 1) * pageSize + 1,
          currentItemTo: total < page * pageSize ? total : page * pageSize,
          textShowRows: formatMessage({
            id: 'store/orderquote.quotes-table.showRows', // 'Show rows'
          }),
          textOf: formatMessage({
            id: 'store/orderquote.quotes-table.of', // 'of'
          }),
          totalItems: total,
          rowsOptions: [25, 50, 100],
        }}
        toolbar={{
          inputSearch: {
            value: searchValue,
            placeholder: formatMessage({
              id: 'store/orderquote.quotes-table.search.placeholder', // 'Search'
            }),
            onChange: handleInputSearchChange,
            onClear: handleInputSearchClear,
            onSubmit: handleInputSearchSubmit,
          },
          fields: {
            label: formatMessage({
              id: 'store/orderquote.quotes-table.toggleFields.label', // 'Toggle visible fields'
            }),
            showAllLabel: formatMessage({
              id: 'store/orderquote.quotes-table.toggleFields.showAllLabel', // 'Show all'
            }),
            hideAllLabel: formatMessage({
              id: 'store/orderquote.quotes-table.toggleFields.hideAllLabel', // 'Hide all'
            }),
          },
          // Flow to create new quote should start in minicart, not in this table
          // newLine: {
          //   label: 'New',
          //   handleCallback: handleNewQuote,
          // },
        }}
        sort={{
          sortedBy,
          sortOrder,
        }}
        onSort={handleSort}
        filters={{
          alwaysVisibleFilters: ['status'],
          statements: filterStatements,
          onChangeStatements: handleFiltersChange,
          clearAllFiltersButtonLabel: formatMessage({
            id: 'store/orderquote.quotes-table.clearFilters.label', // 'Clear filters'
          }),
          collapseLeft: true,
          options: {
            status: {
              label: formatMessage({
                id: 'store/orderquote.quotes-table.statusFilter.label', // 'Status'
              }),
              renderFilterLabel: (st: any) => {
                if (!st || !st.object) {
                  // you should treat empty object cases only for alwaysVisibleFilters
                  return formatMessage({
                    id: 'store/orderquote.quotes-table.filters.all', // 'All'
                  })
                }

                const keys = st.object ? Object.keys(st.object) : []
                const isAllTrue = !keys.some((key) => !st.object[key])
                const isAllFalse = !keys.some((key) => st.object[key])
                const trueKeys = keys.filter((key) => st.object[key])
                let trueKeysLabel = ''

                trueKeys.forEach((key, index) => {
                  trueKeysLabel += `${key}${
                    index === trueKeys.length - 1 ? '' : ', '
                  }`
                })

                return `${
                  isAllTrue
                    ? formatMessage({
                        id: 'store/orderquote.quotes-table.filters.all', // 'All'
                      })
                    : isAllFalse
                    ? formatMessage({
                        id: 'store/orderquote.quotes-table.filters.none', // 'None'
                      })
                    : `${trueKeysLabel}`
                }`
              },
              verbs: [
                {
                  label: 'includes',
                  value: 'includes',
                  object: statusSelectorObject,
                },
              ],
            },
          },
        }}
      />
    </div>
  )
}

export default QuotesTable
