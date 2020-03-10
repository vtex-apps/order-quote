export const errorResponse = (err: any) => {
  if (err.response) {
    const status = err.response.status ? err.response.status : 500
    const { url = null, method = null, data = null } = err.response.config || {}
    if (err.response.data) {
      const error = err.response.data.error
      const operationId = err.response.data.operationId
      const message = err.response.data.message
      return {
        status,
        body: error,
        details: { url, method, data, operationId, message },
      }
    }
    return { status, body: err, details: { url, method } }
  }
  return { status: 500, body: err, details: null }
}
