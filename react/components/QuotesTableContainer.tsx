import type { FunctionComponent, ChangeEvent } from 'react'
import React, { Fragment, useState } from 'react'
import { useQuery } from 'react-apollo'

import QuotesTable from './QuotesTable'
import QuoteDetailsModal from './QuoteDetailsModal'
import GET_QUOTES from '../graphql/getQuotes.graphql'

const QuotesTableContainer: FunctionComponent = () => {
  const [permissionState] = useState({
    isSalesRep: true,
  })

  const [paginationState, setPaginationState] = useState({
    page: 1,
    pageSize: 25,
  })

  const [filterState, setFilterState] = useState({
    filterStatements: [] as FilterStatement[],
    organization: [] as string[],
    costCenter: [] as string[],
    status: [] as string[],
  })

  const [searchState, setSearchState] = useState({
    searchValue: '',
  })

  const [sortState, setSortState] = useState({
    sortOrder: 'DESC',
    sortedBy: 'lastUpdate',
  })

  const [modalState, setModalState] = useState({
    quoteId: '',
    isOpen: false,
  })

  const { data, loading, fetchMore } = useQuery(GET_QUOTES, { ssr: false })

  if (!data) return null

  const handlePrevClick = () => {
    if (paginationState.page === 1) return

    const newPage = paginationState.page - 1

    setPaginationState({
      ...paginationState,
      page: newPage,
    })

    fetchMore({
      variables: {
        page: newPage,
        pageSize: paginationState.pageSize,
        organization: filterState.organization,
        costCenter: filterState.costCenter,
        status: filterState.status,
        search: searchState.searchValue,
        sortOrder: sortState.sortOrder,
        sortedBy: sortState.sortedBy,
      },
    })
  }

  const handleNextClick = () => {
    const newPage = paginationState.page + 1

    setPaginationState({
      ...paginationState,
      page: newPage,
    })

    fetchMore({
      variables: {
        page: newPage,
        pageSize: paginationState.pageSize,
        organization: filterState.organization,
        costCenter: filterState.costCenter,
        status: filterState.status,
        search: searchState.searchValue,
        sortOrder: sortState.sortOrder,
        sortedBy: sortState.sortedBy,
      },
    })
  }

  const handleRowsChange = (e: ChangeEvent<HTMLInputElement>) => {
    const {
      target: { value },
    } = e

    setPaginationState({
      page: 1,
      pageSize: +value,
    })

    fetchMore({
      variables: {
        page: 1,
        pageSize: +value,
        organization: filterState.organization,
        costCenter: filterState.costCenter,
        status: filterState.status,
        search: searchState.searchValue,
        sortOrder: sortState.sortOrder,
        sortedBy: sortState.sortedBy,
      },
    })
  }

  const handleFiltersChange = (statements: FilterStatement[]) => {
    const organizations = [] as string[]
    const costCenters = [] as string[]
    const statuses = [] as string[]

    // TODO: handle organization and costCenter filters
    statements.forEach((statement) => {
      if (!statement?.object) return
      const { subject, object } = statement

      switch (subject) {
        case 'status': {
          if (!object) return
          const keys = Object.keys(object)
          const isAllTrue = !keys.some((key) => !object[key])
          const isAllFalse = !keys.some((key) => object[key])
          const trueKeys = keys.filter((key) => object[key])

          if (isAllTrue) break
          if (isAllFalse) statuses.push('none')
          statuses.push(...trueKeys)
          break
        }

        default:
          break
      }
    })

    setFilterState({
      status: statuses,
      organization: organizations,
      costCenter: costCenters,
      filterStatements: statements,
    })

    setPaginationState({
      ...paginationState,
      page: 1,
    })

    fetchMore({
      variables: {
        page: 1,
        pageSize: paginationState.pageSize,
        search: searchState.searchValue,
        sortOrder: sortState.sortOrder,
        sortedBy: sortState.sortedBy,
        status: statuses,
        organization: organizations,
        costCenter: costCenters,
      },
    })
  }

  const handleInputSearchChange = (e: React.FormEvent<HTMLInputElement>) => {
    const {
      currentTarget: { value },
    } = e

    setSearchState({
      searchValue: value,
    })
  }

  const handleInputSearchClear = () => {
    setSearchState({
      searchValue: '',
    })

    fetchMore({
      variables: {
        page: 1,
        pageSize: paginationState.pageSize,
        organization: filterState.organization,
        costCenter: filterState.costCenter,
        status: filterState.status,
        search: '',
        sortOrder: sortState.sortOrder,
        sortedBy: sortState.sortedBy,
      },
    })
  }

  const handleInputSearchSubmit = () => {
    fetchMore({
      variables: {
        page: 1,
        pageSize: paginationState.pageSize,
        organization: filterState.organization,
        costCenter: filterState.costCenter,
        status: filterState.status,
        search: searchState.searchValue,
        sortOrder: sortState.sortOrder,
        sortedBy: sortState.sortedBy,
      },
    })
  }

  const handleSort = ({
    sortOrder,
    sortedBy,
  }: {
    sortOrder: string
    sortedBy: string
  }) => {
    setSortState({
      sortOrder,
      sortedBy,
    })
    fetchMore({
      variables: {
        page: 1,
        pageSize: paginationState.pageSize,
        organization: filterState.organization,
        costCenter: filterState.costCenter,
        status: filterState.status,
        search: searchState.searchValue,
        sortOrder,
        sortedBy,
      },
    })
  }

  const handleDetailsModal = (id: string) => {
    setModalState({
      isOpen: true,
      quoteId: id,
    })
  }

  const handleDetailsModalClose = () => {
    setModalState({
      isOpen: false,
      quoteId: '',
    })
  }

  return (
    <Fragment>
      <QuotesTable
        quotes={data.getQuotes?.data ?? []}
        isSalesRep={permissionState.isSalesRep}
        page={paginationState.page}
        pageSize={paginationState.pageSize}
        total={data.getQuotes?.pagination?.total ?? 0}
        loading={loading}
        handlePrevClick={handlePrevClick}
        handleNextClick={handleNextClick}
        filterStatements={filterState.filterStatements}
        handleFiltersChange={handleFiltersChange}
        handleInputSearchChange={handleInputSearchChange}
        handleInputSearchClear={handleInputSearchClear}
        handleInputSearchSubmit={handleInputSearchSubmit}
        handleRowsChange={handleRowsChange}
        handleSort={handleSort}
        searchValue={searchState.searchValue}
        sortOrder={sortState.sortOrder}
        sortedBy={sortState.sortedBy}
        handleDetailsModal={handleDetailsModal}
      />
      {modalState.quoteId ? (
        <QuoteDetailsModal
          isOpen={modalState.isOpen}
          isSalesRep={permissionState.isSalesRep}
          handleClose={handleDetailsModalClose}
          quoteId={modalState.quoteId}
        />
      ) : null}
    </Fragment>
  )
}

export default QuotesTableContainer
