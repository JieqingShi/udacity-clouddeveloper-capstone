// const Axios = require('axios')
import Axios from 'axios'

// const image_url = "https://serverless-udagram-images-redux-dev.s3.eu-west-1.amazonaws.com/350bc0df-5ff6-4e00-b7d0-2ab50f85189a"
const modelEndpoint = "https://ot7wogofk9.execute-api.eu-west-1.amazonaws.com/dev/predict"
// axios({
//     method: 'post',
//     url: '/login',
//     data: {
//         firstName: 'Finn',
//         lastName: 'Williams'
//     }
// });

// axios.post(endpoint, {
//     "url": image_url
// }).then((res) => {
//     console.log(`statusCode: ${res.status}`)
//     console.log(`prediction: ${res.data.top1}`)
//     console.log(`probability: ${res.data.prob}`)
// }).catch((error) => {
//     console.error(error)
// })

export interface PredictionResults {
    url: string
    top5: string[]
    prob5: number[]
}

export async function getPredictions(imageUrl: string): Promise<PredictionResults> {
    const response = await Axios.post(modelEndpoint, {
        "url": imageUrl
    }, {headers: {'Content-Type': 'application/json'}
    })
    return response.data
}

// export async function getPredictions(imageUrl: string): Promise<PredictionResults> {
//     const response = await Axios.post(modelEndpoint, {
//         "url": imageUrl
//     }, {headers: {'Content-Type': 'application/json'}
//     })
//     return response.data
// }

// const predictionResults = await getPredictions(image_url)
// console.log(predictionResults)
// export async function getPredictions(imageUrl: string): Promise<PredictionResults> {
//     const result = await axios.post(modelEndpoint, {
//       "url": imageUrl
//     })
//     const data = result.data
//     return data as PredictionResults
// }

// const predictionResults = axios.post(modelEndpoint, {"url": image_url}).then((res) => {return res.data})
// console.log(predictionResults)
// const predResults = getPredictions(image_url)
// const url = predResults.map(prediction => prediction.url)
// const url = predResults.then((res) => {return res.url}).catch((error) => {return error})
// const top5 = predResults.then((res) => {return res.top5}).catch((error) => {return error})
// const prob5 = predResults.then((res) => {return res.prob5}).catch((error) => {return error})
// console.log("Url: ", url)
// console.log("Top5: ", top5)
// console.log("Prob5: ", prob5)



