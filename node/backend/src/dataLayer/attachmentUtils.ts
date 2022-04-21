import * as AWS from 'aws-sdk'
import * as AWSXRay from 'aws-xray-sdk'

const XAWS = AWSXRay.captureAWS(AWS)


export class AttachmentUtils {
    constructor(
        private readonly s3 = new XAWS.S3({ signatureVersion: 'v4' }),
        private readonly imagesBucketName = process.env.IMAGES_S3_BUCKET,
        private readonly imagesProcessedBucketName = process.env.IMAGES_PROCESSED_S3_BUCKET,
        private readonly urlExpiration = parseInt(process.env.SIGNED_URL_EXPIRATION)
    ) {}

    async getUploadUrl(imageId: string): Promise<string> {
        return await this.s3.getSignedUrl('putObject', {
            Bucket: this.imagesBucketName,
            Key: imageId,
            Expires: this.urlExpiration
        })
    }

    getImagePublicReadUrl(bucketName: string, imageId: string): string {
        // can be used for both buckets, therefore keeping bucketName as an input argument
        const attachmentUrl = `https://${bucketName}.s3.amazonaws.com/${imageId}`
        return attachmentUrl
    }

    async putImageInProcessedBucket(key: string, body: any): Promise<void> {
        await this.s3.putObject({
            Bucket: this.imagesProcessedBucketName,
            Key: key,
            Body: body
        })
    }
}