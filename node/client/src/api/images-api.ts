import { apiEndpoint, modelEndpoint } from '../config'
import { ImageModel } from '../types/ImageModel'
import { ImageUploadInfo } from '../types/ImageUploadInfo'
import { ImageUploadResponse } from '../types/ImageUploadResponse'
import { PredictionResponse } from '../types/PredictionResponse'

export async function getImages(groupId: string): Promise<ImageModel[]> {
  console.log('Fetching images')
  const response = await fetch(`${apiEndpoint}/groups/${groupId}/images`)
  const result = await response.json()

  return result.items
}

export async function createImage(
  idToken: string,
  newImage: ImageUploadInfo
): Promise<ImageUploadResponse> {

  const reply = await fetch(
    `${apiEndpoint}/groups/${newImage.groupId}/images`,
    {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${idToken}`
      },
      body: JSON.stringify({
        title: newImage.title
      })
    }
  )

  return await reply.json()
}

export async function uploadFile(uploadUrl: string, file: Buffer): Promise<void> {
  await fetch(uploadUrl, {
    method: 'PUT',
    body: file
  })
}

// adding function for generating predictions from model 
export async function generatePrediction(url: string): Promise<PredictionResponse> {
  const response = await fetch(`${modelEndpoint}/predict`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      "url": url
    })
  })

  return await response.json()
}
