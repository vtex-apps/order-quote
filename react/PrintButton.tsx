import React, { FC } from 'react'
import { FormattedMessage } from 'react-intl'
import { Button } from 'vtex.styleguide'

const PrintButton: FC<Props> = ({ isLoading, disabled }: any) => {
  return (
    <Button
      variation="secondary"
      onClick={() => window.print()}
      isLoading={isLoading}
      disabled={disabled}
    >
      <FormattedMessage id="orderquote.button.print" />
    </Button>
  )
}
type Props = {
  isLoading: boolean
  disabled: boolean
}

export default PrintButton
