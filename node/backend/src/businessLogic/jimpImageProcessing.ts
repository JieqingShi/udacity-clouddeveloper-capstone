import Jimp from 'jimp/es'
import { createLogger } from '../utils/logger'


const logger = createLogger('JimpLogger')

export async function resizeAndApplyTextOverlay(imageUrl: string, classes: string[], probabilities: number[]) {
    /* 
    
      Reads image from an URL, resizes it, applies a text overlay and returns the image as a buffer
      The text is obtained from the model prediction endpoint which returns the top 5 predictions and their probabilities as arrays
      This text is overlayed onto the image and is expected to be in the format <predicted class> - <probability> \n <predicted class> - <probability> \n ...
      Unfortunately the text cannot be constructed beforehand and passed as an input argument as the overlayed text will then be malformatted in the image (tested it, does not work)
      This means the overlay text has to be constructed inside this function, taking the two arrays as input
      The size of the new image is fixed

    */
  
    // Reading image
    const image = await Jimp.read(imageUrl);
    logger.info("Read image. Image has size: ", image.bitmap.width, image.bitmap.height)
    // Resize image
    image.resize(1000, Jimp.AUTO);
    const width = image.bitmap.width;
    const height = image.bitmap.height;
    logger.info("Resized image. Image has size: ", width, height)
  
    // Defining the text font and create the overlay with a custom color
    // The text is going to be 5 lines of "<breed> - <probability>"
    var textImage = new Jimp(width, height, 0x0);
    const font = await Jimp.loadFont(Jimp.FONT_SANS_16_BLACK);
    for (let i = 0; i < classes.length; i++) {
      textImage.print(font, 10, 10 + i * 20, `${classes[i].split("_").join(" ")}: ${Math.round(probabilities[i]*10000)/100}%`);
    }
    textImage.color([{ apply: 'xor', params: ['#063970'] }])
    image.blit(textImage, 0, 0)
    
    // Return buffer
    const convertedBuffer = await image.getBufferAsync(Jimp.AUTO)
    return convertedBuffer
  }