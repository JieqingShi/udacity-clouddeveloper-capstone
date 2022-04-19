// import {APIGatewayTokenAuthorizerEvent, APIGatewayAuthorizerResult, APIGatewayAuthorizerHandler} from 'aws-lambda'
// import 'source-map-support/register'

// export const handler: APIGatewayAuthorizerHandler = async (event: APIGatewayTokenAuthorizerEvent): Promise<APIGatewayAuthorizerResult> => {
//   try {
//       verifyToken(event.authorizationToken)
//       console.log('User is authorized')

//       return {
//         principalId: 'user',
//         policyDocument: {
//             Version: '2012-10-17',
//             Statement: [
//                 {
//                     Action: 'execute-api:Invoke',
//                     Effect: 'Allow',
//                     Resource: '*'
//                 }
//             ]
//         }
//       }
//   } catch (e) {
//       console.log('User is not authorized', e.message)

//       return {
//         principalId: 'user',
//         policyDocument: {
//             Version: '2012-10-17',
//             Statement: [
//                 {
//                     Action: 'execute-api:Invoke',
//                     Effect: 'Deny',
//                     Resource: '*'
//                 }
//             ]
//         }
//       }
//   }
// }

// function verifyToken (authHeader: string): void {
//   if (!authHeader)
//     throw new Error('No authentication header')

//   if (!authHeader.toLowerCase().startsWith('bearer '))
//     throw new Error('Invalid authentication header')

//   const split = authHeader.split(' ')
//   const token = split[1]

//   if (token !== '12345abcde')
//     throw new Error('Invalid token')
// }


// the CustomAuthorize... from lecture are deprecated
// import {APIGatewayTokenAuthorizerEvent, APIGatewayAuthorizerResult, APIGatewayAuthorizerHandler} from 'aws-lambda'
// import 'source-map-support/register'
// import {verify} from 'jsonwebtoken'
// import {JwtToken} from '../../auth/JwtToken'
// import * as AWS from 'aws-sdk'

// const secretId = process.env.AUTH_0_SECRET_ID
// const secretField = process.env.AUTH_0_SECRET_FIELD

// const client = new AWS.SecretsManager()

// let cachedSecret: string


// const auth0Secret = process.env.AUTH_0_SECRET
// export const handler: APIGatewayAuthorizerHandler = async (event: APIGatewayTokenAuthorizerEvent): Promise<APIGatewayAuthorizerResult> => {
//   try {
//       const decodedToken = await verifyToken(event.authorizationToken)
//       console.log('User is authorized')

//       return {
//         principalId: decodedToken.sub,
//         policyDocument: {
//             Version: '2012-10-17',
//             Statement: [
//                 {
//                     Action: 'execute-api:Invoke',
//                     Effect: 'Allow',
//                     Resource: '*'
//                 }
//             ]
//         }
//       }
//   } catch (e) {
//       console.log('User is not authorized', e.message)

//       return {
//         principalId: 'user',
//         policyDocument: {
//             Version: '2012-10-17',
//             Statement: [
//                 {
//                     Action: 'execute-api:Invoke',
//                     Effect: 'Deny',
//                     Resource: '*'
//                 }
//             ]
//         }
//       }
//   }
// }

// async function getSecret() {
//     if (cachedSecret) return cachedSecret

//     const data = await client.getSecretValue({
//         SecretId: secretId
//     }).promise()

//     cachedSecret = data.SecretString

//     return JSON.parse(cachedSecret)
// }

// async function verifyToken (authHeader: string): Promise<JwtToken> {
//   if (!authHeader)
//     throw new Error('No authentication header')

//   if (!authHeader.toLowerCase().startsWith('bearer '))
//     throw new Error('Invalid authentication header')

//   const split = authHeader.split(' ')
//   const token = split[1]

//   const secretObject: any = await getSecret()
//   const secret = secretObject[secretField]    

//   return verify(token, secret) as JwtToken
// }

import { APIGatewayTokenAuthorizerEvent, APIGatewayAuthorizerResult } from 'aws-lambda'
import 'source-map-support/register'
import * as middy from 'middy'
import { secretsManager } from 'middy/middlewares'

import { verify } from 'jsonwebtoken'
import { JwtToken } from '../../auth/JwtToken'

const secretId = process.env.AUTH_0_SECRET_ID
const secretField = process.env.AUTH_0_SECRET_FIELD

// wrap everything into this handler function
export const handler = middy(async (event: APIGatewayTokenAuthorizerEvent, context): Promise<APIGatewayAuthorizerResult> => {
  try {
    const decodedToken = verifyToken(
      event.authorizationToken,
      context.AUTH0_SECRET[secretField]
    )
    console.log('User was authorized', decodedToken)

    return {
      principalId: decodedToken.sub,
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
    console.log('User was not authorized', e.message)

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
})

function verifyToken(authHeader: string, secret: string): JwtToken {
  if (!authHeader)
    throw new Error('No authentication header')

  if (!authHeader.toLowerCase().startsWith('bearer '))
    throw new Error('Invalid authentication header')

  const split = authHeader.split(' ')
  const token = split[1]

  return verify(token, secret) as JwtToken
}

handler.use(
  secretsManager({
    cache: true,
    cacheExpiryInMillis: 60000,
    // Throw an error if can't read the secret
    throwOnFailedCall: true,
    secrets: {
      AUTH0_SECRET: secretId
    }
  })
)



