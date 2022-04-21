import { APIGatewayTokenAuthorizerEvent, APIGatewayAuthorizerResult } from 'aws-lambda'
import 'source-map-support/register'
import { verify, decode } from 'jsonwebtoken'
import { createLogger } from '../../utils/logger'
import Axios from 'axios'
import { Jwt } from '../../auth/Jwt'
import { JwtToken } from '../../auth/JwtToken'

const logger = createLogger('auth')

// To get this URL you need to go to an Auth0 page -> Show Advanced Settings -> Endpoints -> JSON Web Key Set
const jwksUrl = process.env.AUTH_0_JWKS_URL

export const handler = async (
  event: APIGatewayTokenAuthorizerEvent
): Promise<APIGatewayAuthorizerResult> => {
  logger.info('Authorizing a user', event.authorizationToken)
  try {
    const jwtToken = await verifyToken(event.authorizationToken)
    logger.info('User was authorized', jwtToken)

    return {
      principalId: jwtToken.sub,
      policyDocument: {
        Version: '2012-10-17',
        Statement: [
          {
            Action: 'execute-api:Invoke',
            Effect: 'Allow',
            Resource: '*'
          }
        ]
      }
    }
  } catch (e) {
    logger.error('User not authorized', { error: e.message })

    return {
      principalId: 'user',
      policyDocument: {
        Version: '2012-10-17',
        Statement: [
          {
            Action: 'execute-api:Invoke',
            Effect: 'Deny',
            Resource: '*'
          }
        ]
      }
    }
  }
}

async function getCert(jwksUrl: string): Promise<any> {
  const response = await Axios.get(jwksUrl)
  const keys = response.data.keys

  if (!keys || !keys.length)
    return new Error('The JWKS endpoint did not contain any keys');

  // https://auth0.com/blog/navigating-rs256-and-jwks/
  const signingKeys = keys.filter(key =>
      key.use === 'sig'
      && key.kty === 'RSA'
      && key.kid
      && key.e
      && key.n
      && ((key.x5c && key.x5c.length) || (key.n && key.e))  // Has useful public keys
  )

  if (!signingKeys.length)
    return new Error('The JWKS endpoint did not contain any signature verification keys')

  // Read first jwk see explanation here https://auth0.com/docs/tokens/json-web-tokens/json-web-key-sets
  const signedKey = signingKeys[0]
  const cert = signedKey.x5c[0]
  const certBody = `-----BEGIN CERTIFICATE-----\n${cert}\n-----END CERTIFICATE-----`

  return certBody
}


async function verifyToken(authHeader: string): Promise<JwtToken> {
  const token = getToken(authHeader)
  const jwt: Jwt = decode(token, { complete: true }) as Jwt
  logger.info('Decoded JWT: ', jwt)
  // You can read more about how to do this here: https://auth0.com/blog/navigating-rs256-and-jwks/

  const cert = await getCert(jwksUrl)
  const result = verify(token, cert, { algorithms: ['RS256'] }) as JwtToken
  return result
}

function getToken(authHeader: string): string {
  if (!authHeader) throw new Error('No authentication header')

  if (!authHeader.toLowerCase().startsWith('bearer '))
    throw new Error('Invalid authentication header')

  const split = authHeader.split(' ')
  const token = split[1]

  return token
}