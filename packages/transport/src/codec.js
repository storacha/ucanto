import * as API from '@ucanto/interface'

/**
 * @typedef {`${Lowercase<string>}/${Lowercase<string>}`|`${Lowercase<string>}/${Lowercase<string>}+${Lowercase<string>}`} ContentType
 * @typedef {`${Lowercase<string>}/${Lowercase<string>}`|`${Lowercase<string>}/${Lowercase<string>};q=${number}.${number}`} MediaType
 * @param {object} source
 * @param {Record<ContentType, API.Transport.RequestDecoder>} source.decoders
 * @param {Record<MediaType, API.Transport.ResponseEncoder>} source.encoders
 * @returns {API.InboundCodec}
 */
export const inbound = source => new Inbound(source)

/**
 * @implements {API.InboundCodec}
 */
class Inbound {
  /**
   * @param {API.HTTPRequest} request
   * @returns {API.Result<API.InboundAcceptCodec, API.HTTPError>} transport
   */
  accept({ headers }) {
    const contentType = headers['content-type'] || headers['Content-Type']
    const decoder = this.decoders[contentType]
    if (!decoder) {
      return {
        error: {
          status: 415,
          message: `The server cannot process the request because the payload format is not supported. Please check the content-type header and try again with a supported media type.`,
          headers: {
            accept: Object.keys(this.decoders).join(', '),
          },
        },
      }
    }

    const accept = parseAcceptHeader(headers.accept || headers.Accept || '*/*')
    for (const { category, type } of accept) {
      for (const encoder of this.encoders) {
        const select =
          (category === '*' || category === encoder.category) &&
          (type === '*' || type === encoder.type)

        if (select) {
          return { ok: { ...encoder, decoder } }
        }
      }
    }

    return {
      error: {
        status: 406,
        message: `The requested resource cannot be served in the requested content type. Please specify a supported content type using the Accept header.`,
        headers: {
          accept: formatAcceptHeader(Object.values(this.encoders)),
        },
      },
    }
  }

  /**
   * @param {object} source
   * @param {Record<string, API.Transport.RequestDecoder>} source.decoders
   * @param {Record<string, API.Transport.ResponseEncoder>} source.encoders
   */
  constructor({ decoders = {}, encoders = {} }) {
    this.decoders = decoders

    if (Object.keys(decoders).length === 0) {
      throw new Error('At least one decoder MUST be provided')
    }

    // We sort the encoders by preference, so that we can pick the most
    // preferred one when client accepts multiple content types.
    this.encoders = Object.entries(encoders)
      .map(([mediaType, encoder]) => {
        return { ...parseMediaType(mediaType), encoder }
      })
      .sort((a, b) => b.preference - a.preference)

    if (this.encoders.length === 0) {
      throw new Error('At least one encoder MUST be provided')
    }
  }
}

/**
 * @param {object} source
 * @param {Record<MediaType, API.Transport.RequestEncoder>} source.encoders
 * @param {Record<ContentType, API.Transport.ResponseDecoder>} source.decoders
 * @returns {API.OutboundCodec}
 */
export const outbound = source => new Outbound(source)

/**
 * @implements {API.OutboundCodec}
 */
class Outbound {
  /**
   * @param {object} source
   * @param {Record<string, API.Transport.RequestEncoder>} source.encoders
   * @param {Record<string, API.Transport.ResponseDecoder>} source.decoders
   */
  constructor({ decoders = {}, encoders = {} }) {
    this.decoders = decoders

    if (Object.keys(decoders).length === 0) {
      throw new Error('At least one decoder MUST be provided')
    }

    // We sort the encoders by preference, so that we can pick the most
    // preferred one when client accepts multiple content types.
    this.encoders = Object.entries(encoders)
      .map(([mediaType, encoder]) => {
        return { ...parseMediaType(mediaType), encoder }
      })
      .sort((a, b) => b.preference - a.preference)

    this.acceptType = formatAcceptHeader(this.encoders)

    if (this.encoders.length === 0) {
      throw new Error('At least one encoder MUST be provided')
    }

    this.encoder = this.encoders[0].encoder
  }

  /**
   * @template {API.AgentMessage} Message
   * @param {Message} message
   */
  encode(message) {
    return this.encoder.encode(message, {
      accept: this.acceptType,
    })
  }
  /**
   * @template {API.AgentMessage} Message
   * @param {API.HTTPResponse<Message>} response
   * @returns {API.Await<Message>}
   */
  decode(response) {
    const { headers } = response
    const contentType = headers['content-type'] || headers['Content-Type']
    const decoder = this.decoders[contentType] || this.decoders['*/*']
    switch (response.status) {
      case 415:
      case 406:
        throw Object.assign(
          new RangeError(new TextDecoder().decode(response.body)),
          {
            status: response.status,
            headers: response.headers,
          }
        )
    }
    if (!decoder) {
      throw Object.assign(
        TypeError(
          `Can not decode response with content-type '${contentType}' because no matching transport decoder is configured.`
        ),
        {
          error: true,
        }
      )
    }

    return decoder.decode(response)
  }
}

/**
 * @typedef {{ category: string, type: string, preference: number }} Media
 * @param {string} source
 * @returns {Media}
 */
export const parseMediaType = source => {
  const [mediaType = '*/*', mediaRange = ''] = source.trim().split(';')
  const [category = '*', type = '*'] = mediaType.split('/')
  const params = new URLSearchParams(mediaRange)
  const preference = parseFloat(params.get('q') || '0')
  return {
    category,
    type,
    /* c8 ignore next */
    preference: isNaN(preference) ? 0 : preference,
  }
}

/**
 * @param {Media} media
 */
export const formatMediaType = ({ category, type, preference }) =>
  /** @type {MediaType}  */ (
    `${category}/${type}${preference ? `;q=${preference}` : ''}`
  )

/**
 * @param {string} source
 */
export const parseAcceptHeader = source =>
  source
    .split(',')
    .map(parseMediaType)
    .sort((a, b) => b.preference - a.preference)

/**
 * @param {Media[]} source
 */
export const formatAcceptHeader = source =>
  source.map(formatMediaType).join(', ')
