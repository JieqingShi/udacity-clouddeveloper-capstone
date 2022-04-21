import Axios from 'axios'
const modelEndpoint = process.env.MODEL_ENDPOINT

export async function getPredictions(imageUrl: string): Promise<any> {
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