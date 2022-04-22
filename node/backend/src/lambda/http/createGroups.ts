import { APIGatewayProxyEvent, APIGatewayProxyResult } from 'aws-lambda'
import 'source-map-support/register'
import * as middy from 'middy'
import { cors, httpErrorHandler } from 'middy/middlewares'
import { createLogger } from '../../utils/logger'
import { CreateGroupRequest } from '../../requests/CreateGroupRequest'
import { createGroup } from '../../businessLogic/groups'
import { getUserId } from '../../auth/utils'

const logger = createLogger('createGroupLogger')

export const handler =middy(async (event: APIGatewayProxyEvent): Promise<APIGatewayProxyResult> => {
  logger.info('Processing event: ', event)

  const newGroup: CreateGroupRequest = JSON.parse(event.body)
  const userId = getUserId(event)

  const newItem = await createGroup(newGroup, userId)

  return {
    statusCode: 201,
    body: JSON.stringify({
      newItem
    })
  }
})

handler
.use(httpErrorHandler())
.use(
    cors({
    credentials: true
  })
)
