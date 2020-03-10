import React from 'react'
import { graphql, compose } from 'react-apollo'
import currentTime from './graphql/currentTime.graphql'
import { Button } from 'vtex.styleguide'
import { injectIntl } from 'react-intl'
import PropTypes from 'prop-types'

const DEFAULT_ADMIN_SETUP = {
  cartName: 'Order Quote',
  cartLifeSpan: 7,
  storeLogoUrl: '',
}

const MyCarts: StorefrontFunctionComponent = () => {
  const {
    getSetupConfig: {
      getSetupConfig: { adminSetup },
    },
  } = this.props

  const { cartName } = adminSetup || DEFAULT_ADMIN_SETUP

  return (
    <div className="fr">
      <Button
        id="vtex-cart-list-open-modal-button"
        variation="tertiary"
        onClick={this.handleOpenModal}
      >
        {cartName}
      </Button>
    </div>
  )
}

MyCarts.propTypes = {
  getSetupConfig: PropTypes.object,
  orderQuoteMutation: PropTypes.func,
  useCartMutation: PropTypes.func,
  getCarts: PropTypes.func,
  removeCart: PropTypes.func,
  currentTime: PropTypes.object,
}

export default injectIntl(
  compose(
    graphql(currentTime, { name: 'currentTime', options: { ssr: false } })
  )(MyCarts)
)
