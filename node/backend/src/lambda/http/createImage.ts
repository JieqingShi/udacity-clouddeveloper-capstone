import { APIGatewayProxyEvent, APIGatewayProxyResult } from 'aws-lambda'
import 'source-map-support/register'
import * as middy from 'middy'
import { cors, httpErrorHandler } from 'middy/middlewares'
import { AttachmentUtils } from '../../dataLayer/attachmentUtils'
import { createLogger } from '../../utils/logger'
import { validateGroup } from '../../businessLogic/groups'
import { createImageEntryInTable } from '../../businessLogic/images'
import { CreateImageRequest } from '../../requests/CreateImageRequest'

const attachmentUtils = new AttachmentUtils()
const logger = createLogger('createImageLogger')

export const handler = middy(async (event: APIGatewayProxyEvent): Promise<APIGatewayProxyResult> => {
  logger.info('Process event', event)
  const groupId = event.pathParameters.groupId

  const groupExists = await validateGroup(groupId)

  if (!groupExists) {
    return {
      statusCode: 404,
      body: JSON.stringify({
        error: 'Group does not exist'
      })
    }
  }
  logger.info(`Group with Id ${groupId} exists`)

  const createImageRequest: CreateImageRequest = JSON.parse(event.body)  // contains title
  logger.info(`Storing image item in Table with the following content: ${createImageRequest}`)
  const imageItem = await createImageEntryInTable(createImageRequest, groupId)

  logger.info(`Generating upload URL for image storage`)
  const uploadUrl = attachmentUtils.getUploadUrl(imageItem.imageId)
  logger.info(`Upload URL: ${uploadUrl}`)
  
  return {
    statusCode: 201,
    body: JSON.stringify({
      newItem: imageItem,
      uploadUrl: uploadUrl
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

// async function groupExists(groupId: string) {
//   const result = await docClient
//     .get({
//       TableName: groupsTable,
//       Key: {
//         id: groupId
//       }
//     })
//     .promise()

//   logger.info('Get group: ', result)
//   return !!result.Item
// }

// async function createImage(groupId: string, imageId: string, event: any) {
//   const timestamp = new Date().toISOString()
//   const newImage = JSON.parse(event.body)

//   const newItem = {
//     groupId,
//     timestamp,
//     imageId,
//     ...newImage,
//     imageUrl: `https://${bucketName}.s3.amazonaws.com/${imageId}`,
//     processedImageUrl: null
//   }
//   logger.info('Storing new item: ', newItem)

//   await docClient
//     .put({
//       TableName: imagesTable,
//       Item: newItem
//     })
//     .promise()

//   return newItem
// }

// function getUploadUrl(imageId: string) {
//   return s3.getSignedUrl('putObject', {
//     Bucket: bucketName,
//     Key: imageId,
//     Expires: parseInt(urlExpiration)
//   })
// }
