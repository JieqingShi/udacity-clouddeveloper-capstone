import { APIGatewayProxyEvent, APIGatewayProxyResult } from 'aws-lambda'
import 'source-map-support/register'
import * as middy from 'middy'
import { cors } from 'middy/middlewares'
import { createLogger } from '../../utils/logger'
import { getAllGroups } from '../../businessLogic/groups';

const logger = createLogger('getGroupsLogger')

export const handler = middy(async (event: APIGatewayProxyEvent): Promise<APIGatewayProxyResult> => {
  logger.info('Processing event: ', event)

  const groups = await getAllGroups()

  return {
    statusCode: 200,
    body: JSON.stringify({
      items: groups
    })
  }
})

handler.use(
  cors({
    credentials: true
  })
)