import Axios from 'axios'
import { ModelPrediction } from '../models/ModelPrediction'
const modelEndpoint = process.env.MODEL_ENDPOINT

export async function getPredictions(imageUrl: string): Promise<ModelPrediction> {
    /* 
      Gets predictions from model endpoint; The models API accepts {"url": <imageUrl>} in the request body and returns 
  
      {
       "url": <same url>, 
       "top5": <top5 predictions>, "
       "prob5": <probabilities of top5 predictions>
      }
  
    */
    const result = await Axios.post(modelEndpoint, {
      "url": imageUrl
    })
  
    return result.data
  }