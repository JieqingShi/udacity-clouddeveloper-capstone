import { APIGatewayProxyEvent, APIGatewayProxyResult } from 'aws-lambda'
import 'source-map-support/register'
import * as AWS  from 'aws-sdk'
import * as uuid from 'uuid'
import * as middy from 'middy'
import { cors } from 'middy/middlewares'

const docClient = new AWS.DynamoDB.DocumentClient()
const s3 = new AWS.S3({
  signatureVersion: 'v4'
})

const groupsTable = process.env.GROUPS_TABLE
const imagesTable = process.env.IMAGES_TABLE
const bucketName = process.env.IMAGES_S3_BUCKET  // Change bucket to processed images bucket
const urlExpiration = process.env.SIGNED_URL_EXPIRATION
// const model_endpoint = process.env.MODEL_ENDPOINT

export const handler = middy(async (event: APIGatewayProxyEvent): Promise<APIGatewayProxyResult> => {
  console.log('Caller event', event)
  const groupId = event.pathParameters.groupId
  const validGroupId = await groupExists(groupId)

  if (!validGroupId) {
    return {
      statusCode: 404,
      body: JSON.stringify({
        error: 'Group does not exist'
      })
    }
  }

  const imageId = uuid.v4()
  const newItem = await createImage(groupId, imageId, event)

  const url = getUploadUrl(imageId)

  return {
    statusCode: 201,
    body: JSON.stringify({
      newItem: newItem,
      uploadUrl: url
    })
  }
})

handler.use(
  cors({
    credentials: true
  })
)

async function groupExists(groupId: string) {
  const result = await docClient
    .get({
      TableName: groupsTable,
      Key: {
        id: groupId
      }
    })
    .promise()

  console.log('Get group: ', result)
  return !!result.Item
}

async function createImage(groupId: string, imageId: string, event: any) {
  const timestamp = new Date().toISOString()
  const newImage = JSON.parse(event.body)

  const newItem = {
    groupId,
    timestamp,
    imageId,
    ...newImage,
    imageUrl: `https://${bucketName}.s3.amazonaws.com/${imageId}`,
    processedImageUrl: null
  }
  console.log('Storing new item: ', newItem)

  await docClient
    .put({
      TableName: imagesTable,
      Item: newItem
    })
    .promise()

  return newItem
}

function getUploadUrl(imageId: string) {
  return s3.getSignedUrl('putObject', {
    Bucket: bucketName,
    Key: imageId,
    Expires: parseInt(urlExpiration)
  })
}

// async function getPredictions(imageUrl: string){
//   const result = await axios.post(model_endpoint, {
//     "url": imageUrl
//   })
//   console.log(predictions)
// }



// import { APIGatewayProxyHandler, APIGatewayProxyEvent, APIGatewayProxyResult } from 'aws-lambda'
// import 'source-map-support/register'
// import * as AWS  from 'aws-sdk'
// import * as uuid from 'uuid'

// import * as middy from 'middy'
// import { cors } from 'middy/middlewares'

// const docClient = new AWS.DynamoDB.DocumentClient()

// const s3 = new AWS.S3({
//     signatureVersion: 'v4'
// })

// const groupsTable = process.env.GROUPS_TABLE
// const imagesTable = process.env.IMAGES_TABLE
// const bucketName = process.env.IMAGES_S3_BUCKET
// const urlExpiration = 300

// // export const handler: APIGatewayProxyHandler = async (event: APIGatewayProxyEvent): Promise<APIGatewayProxyResult> => {
// //   console.log('Caller event', event)
// //   const groupId = event.pathParameters.groupId
// //   const validGroupId = await groupExists(groupId)

// //   if (!validGroupId) {
// //     return {
// //       statusCode: 404,
// //       headers: {
// //         'Access-Control-Allow-Origin': '*'
// //       },
// //       body: JSON.stringify({
// //         error: 'Group does not exist'
// //       })
// //     }
// //   }

//   // TODO: Create an image if groupId is valid
//   // store to imagesTable
//   // provide groupid, timestamp, imageid and title

// // My solution
// //   const title = JSON.parse(event.body)

// //   const newItem = {
// //       groupId: groupId,
// //       timestamp: new Date().toISOString(),
// //       imageId: uuid.v4(),
// //       title: title
// //   }
// //   await docClient.put({
// //     TableName: imagesTable,
// //     Item: newItem
// //   }).promise()

//   const newImage = JSON.parse(event.body)
//   const imageId = uuid.v4()
//   const timestamp = new Date().toISOString()

//   const newItem = {
//     groupId: groupId,
//     timestamp: timestamp,
//     imageId: imageId,
//     ...newImage,
//     imageUrl: `https://${bucketName}.s3.amazonaws.com/${imageId}`
// }

//   console.log("Storing new item: ", newItem)

//   const url = getUploadUrl(imageId)

//   await docClient.put({
//       TableName: imagesTable,
//       Item: newItem
//   }).promise()


//   // In the official solution all this was put into a async function that is then called with await CreateImage()




//   return {
//     statusCode: 201,
//     headers: {
//       'Access-Control-Allow-Origin': '*'
//     },
//     body: JSON.stringify({
//         newItem: newItem,
//         uploadUrl: url
//     })
//   }
// }

// async function groupExists(groupId: string) {
//   const result = await docClient
//     .get({
//       TableName: groupsTable,
//       Key: {
//         id: groupId
//       }
//     })
//     .promise()

//   console.log('Get group: ', result)
//   return !!result.Item
// }

// function getUploadUrl(imageId: string) {
//   return s3.getSignedUrl('putObject', {
//     Bucket: bucketName,
//     Key: imageId,
//     Expires: urlExpiration
//   })
// }
