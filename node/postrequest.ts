const axios = require('axios')

const image_url = "https://serverless-udagram-images-redux-dev.s3.eu-west-1.amazonaws.com/1f0a6188-43bb-4d5c-84cc-61581774b609"
const endpoint = "https://tn6w5h7da5.execute-api.eu-west-1.amazonaws.com/dev/predict"
// axios({
//     method: 'post',
//     url: '/login',
//     data: {
//         firstName: 'Finn',
//         lastName: 'Williams'
//     }
// });

axios.post(endpoint, {
    "url": image_url
}).then((res) => {
    console.log(`statusCode: ${res.status}`)
    console.log(`prediction: ${res.data.top1}`)
    console.log(`probability: ${res.data.prob}`)
}).catch((error) => {
    console.error(error)
})

