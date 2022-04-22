import * as uuid from 'uuid'
import { Image } from '../models/Image'
import { ImageAccess } from '../dataLayer/ImagesAccess'
import { CreateImageRequest } from '../requests/CreateImageRequest'
import { UpdateImageRequest } from '../requests/UpdateImageRequest'
import { createLogger } from '../utils/logger'
import { AttachmentUtils } from '../dataLayer/attachmentUtils'
import { resizeAndApplyTextOverlay } from './jimpImageProcessing'
import { getPredictions } from './predictions'


const imageAccess = new ImageAccess()
const attachmentUtils = new AttachmentUtils()
const imagesBucketName = process.env.IMAGES_S3_BUCKET
const imagesProcessedBucketName = process.env.IMAGES_PROCESSED_S3_BUCKET
const logger = createLogger('imagesBusinessLogicLogger')

export async function getAllImagesPerGroup(groupId: string): Promise<Image[]> {
  logger.info(`Getting all images from group ${groupId}`)
  const result = await imageAccess.getAllImagesPerGroup(groupId)
  return result
}

export async function getImageById(imageId: string): Promise<Image> {
  logger.info(`Getting image with Id ${imageId}`)
  const result = await imageAccess.getImageById(imageId)
  return result
}

export async function createImageEntryInTable(createImageRequest: CreateImageRequest, groupId: string): Promise<Image> {
  const imageId = uuid.v4()
  const imageItem = {
    imageId: imageId,
    groupId: groupId,
    imageUrl: attachmentUtils.getImagePublicReadUrl(imagesBucketName, imageId),
    processedImageUrl: null,  // is not defined for now
    title: createImageRequest.title,
    timestamp: new Date().toISOString()
  }

  logger.info(`Creating a image with the following information: ${JSON.stringify(imageItem)}`)
  const result = await imageAccess.createImageInGroup(imageItem)
  return result
}

// export async function createImage(groupId: string, event: any): Promise<Image> {
//   const createImageRequest: CreateImageRequest = JSON.parse(event.body)
//   logger.info(`Storing image item in Table with the following content: ${createImageRequest}`)
//   const imageItem = await createImageEntryInTable(createImageRequest, groupId)

//   logger.info(`Generating upload URL for image storage`)
//   const uploadUrl = await attachmentUtils.getUploadUrl(imageItem.imageId)
//   logger.info(`Upload URL: ${uploadUrl}`)
//   console.log(`Upload URL: ${uploadUrl}`)

//   return imageItem
// }

export async function updateImage(updateImageRequest: UpdateImageRequest): Promise<Image> {
  const imageItem = await imageAccess.getImageById(updateImageRequest.imageId)
  if (!imageItem) {
    throw new Error(`Image with Id ${updateImageRequest.imageId} does not exist`)
  }
  
  logger.info("Obtained item corresponding to imageId from DynamoDB: ", imageItem)
  
  const newItem = {
    groupId: imageItem.groupId,
    timestamp: imageItem.timestamp,
    imageUrl: imageItem.imageUrl,
    imageId: updateImageRequest.imageId,
    // these two are getting updated
    processedImageUrl: updateImageRequest.processedImageUrl,
    title: updateImageRequest.title
  } as Image

  const result = await imageAccess.createImageInGroup(newItem)
  return result
}

export async function createProcessedImage(imageId: string, imageUrl: string): Promise<void> {
    logger.info(`Creating processed image for image under Url ${imageUrl}`)

    logger.info(`Getting predictions from model endpoint`)
    const predictions = await getPredictions(imageUrl)

    logger.info(`Resizing image and overlaying predictions as text over the image`)
    const imageBuffer = await resizeAndApplyTextOverlay(imageUrl, predictions.top5, predictions.prob5)

    logger.info(`Obtained converted image buffer`)
    logger.info(`Saving processed images in S3 Bucket ${imagesProcessedBucketName}`)
    await attachmentUtils.putImageInProcessedBucket(imageId, imageBuffer)

    const updateImageRequest: UpdateImageRequest = {
        imageId: imageId,
        processedImageUrl: attachmentUtils.getImagePublicReadUrl(imagesProcessedBucketName, imageId),
        title: `${predictions.top5[0].split("_").join(" ")} - ${Math.round(predictions.prob5[0]*10000)/100}%`,
    }
    logger.info(`Updating image item table with the following information: ${JSON.stringify(updateImageRequest)}`)
    logger.info(`New title of image is ${updateImageRequest.title}`)
    logger.info(`Processed image url is ${updateImageRequest.processedImageUrl}`)
    await updateImage(updateImageRequest)

}