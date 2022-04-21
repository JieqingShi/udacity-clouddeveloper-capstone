import {getPredictions} from './postrequest'
const Jimp = require('jimp')


// const imageUrl = "https://serverless-udagram-images-redux-dev.s3.eu-west-1.amazonaws.com/350bc0df-5ff6-4e00-b7d0-2ab50f85189a"
const imageUrl = "https://serverless-udagram-images-redux-dev.s3.amazonaws.com/a40558f3-f0bf-43de-86eb-2b1ebd59b949"
  

async function textOverlay(imageUrl) {
    // Reading image
    const image = await Jimp.read(imageUrl);
    image.resize(600, Jimp.AUTO)
    const width = image.bitmap.width;
    const height = image.bitmap.height;

    var textImage = new Jimp(width, height, 0x0);
    const predictionResults = await getPredictions(imageUrl)
    const breeds = predictionResults.top5
    const probabilities = predictionResults.prob5
    // Defining the text font
    const font = await Jimp.loadFont(Jimp.FONT_SANS_16_BLACK);
    for (let i = 0; i < breeds.length; i++) {
      textImage.print(font, 10, 10 + i * 20, `${breeds[i].split("_").join(" ")}: ${Math.round(probabilities[i]*10000)/100}%`);
    }
    textImage.color([{ apply: 'xor', params: ['#eeeee4'] }])
    image.blit(textImage, 0, 0)
    // image.print(font, 10, 10, 'German Shepherd Dog');
    // Writing image after processing
    await image.writeAsync('./textOverlay.png');
    return image
 }

 const imageOverlay = textOverlay(imageUrl)
 console.log(imageOverlay)


