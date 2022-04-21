import { APIGatewayProxyEvent } from 'aws-lambda'
import { decode } from 'jsonwebtoken'
import { JwtToken } from './JwtToken'

/**
 * Parse a JWT token and return a user id
 * @param jwtToken JWT token to parse
 * @returns a user id from the JWT token
 */
// export function getUserId(jwtToken: string): string {
//     const decodedToken: JwtToken = decode(jwtToken) as JwtToken
//     const userId = decodedToken.sub
//     return userId
// }

export function getUserId(event: APIGatewayProxyEvent): string {
    const authorization = event.headers.Authorization
    const jwtToken = authorization.split(' ')[1]
    const decodedToken: JwtToken = decode(jwtToken) as JwtToken
    return decodedToken.sub
}

// Just in case it will be needed
// export function getUserIdFromToken(jwtToken: string): string {
//     const decodedJwt = decode(jwtToken) as JwtToken
//     return decodedJwt.sub
// }
