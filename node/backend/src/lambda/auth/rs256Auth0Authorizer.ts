import {APIGatewayTokenAuthorizerEvent, APIGatewayAuthorizerResult, APIGatewayAuthorizerHandler} from 'aws-lambda'
import 'source-map-support/register'
import {verify} from 'jsonwebtoken'
import {JwtToken} from '../../auth/JwtToken'
// import * as AWS from 'aws-sdk'

// const secretId = process.env.AUTH_0_SECRET_ID
// const secretField = process.env.AUTH_0_SECRET_FIELD

// const client = new AWS.SecretsManager()
// // const auth0Secret = process.env.AUTH_0_SECRET
// let cachedSecret: string

// with RS256 there are no secrets anymore
const cert = `-----BEGIN CERTIFICATE-----
MIIDDTCCAfWgAwIBAgIJFU3PVcqCcSF5MA0GCSqGSIb3DQEBCwUAMCQxIjAgBgNV
BAMTGWRldi03NWFzY3M1Ny5ldS5hdXRoMC5jb20wHhcNMjIwNDE1MTAxNjAxWhcN
MzUxMjIzMTAxNjAxWjAkMSIwIAYDVQQDExlkZXYtNzVhc2NzNTcuZXUuYXV0aDAu
Y29tMIIBIjANBgkqhkiG9w0BAQEFAAOCAQ8AMIIBCgKCAQEA6h9MNqVk9kj5FZ2a
b8v3tLPP3pItwNP7lR16ocb7D+dHdgRl7GkwiT7bsKBES2WQYaBCWErfPdPVh8YK
8vtjDoYzYldly3NJoDcTdQIUjvxs3JPhorwmVFHw9qITPgPGsz/T6Jc+bZDbYzOR
vzfBmDbO0VvBTcFHD1phBjX//hAtRaAdnpc/XQg3gNjPyj2r2TUslOfwHlxWzkoj
GEoA85fQg2k4xJA3kOQDmUMjT3P0VYcmL3AYz0i7Ouv58QKR6Yz308um8of+m/zH
eQhfFjqnoi6hkjOkCuEuIul6YfzC6Ry+PYsMzqJW5RwQUxbmz1BgD9FdxcJ54pqZ
NDgN1QIDAQABo0IwQDAPBgNVHRMBAf8EBTADAQH/MB0GA1UdDgQWBBREb/ziYpLz
K7FVWMMYUoTyd9B1djAOBgNVHQ8BAf8EBAMCAoQwDQYJKoZIhvcNAQELBQADggEB
AOKLBLg1pFdjLyd+ux9VTDqcIFc2e1YYHHtEyiLG4xqJek2IE6/WpI/7R+M0+Ya3
mSvtPATgo+Hc6eJeWfAgU9IckB8VILp6wEbN4kGlqe0w3o4tHHsr5MB1m0TJt5Uu
cn5TfVmP8KeD4e2vkTnonwU/tscMpGtEep3AuYgHtSizBZb/iJTOvw+s0C4Pyh4Y
VlgR4lnq8WCAlYzvfUQUXOkZJdjLwQc+lUqaW4GrygNI9Zzb3GGWSArvFRawcDR2
CtJEigyw3g8548aRQyGfq229HMJV0/EMWCua5Sis+/9MhjrnsoeY+tZDMQNgi72u
F/Yx2hEoZg6sZP+j8Sa/1/8=
-----END CERTIFICATE-----`

export const handler: APIGatewayAuthorizerHandler = async (event: APIGatewayTokenAuthorizerEvent): Promise<APIGatewayAuthorizerResult> => {
  try {
      const decodedToken = await verifyToken(event.authorizationToken)
      console.log('User is authorized')

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
      console.log('User is not authorized', e.message)

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

// async function getSecret() {
//     if (cachedSecret) return cachedSecret

//     const data = await client.getSecretValue({
//         SecretId: secretId
//     }).promise()

//     cachedSecret = data.SecretString

//     return JSON.parse(cachedSecret)
// }

async function verifyToken (authHeader: string): Promise<JwtToken> {
  if (!authHeader)
    throw new Error('No authentication header')

  if (!authHeader.toLowerCase().startsWith('bearer '))
    throw new Error('Invalid authentication header')

  const split = authHeader.split(' ')
  const token = split[1]

  // const secretObject: any = await getSecret()
  // const secret = secretObject[secretField]  

  // return verify(token, secret) as JwtToken
  return verify(token, cert, {algorithms: ['RS256']}) as JwtToken
}