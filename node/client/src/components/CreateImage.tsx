import * as React from 'react'
import { Form, Button } from 'semantic-ui-react'
import { createImage, uploadFile, generatePrediction } from '../api/images-api'
import Auth from '../auth/Auth'

enum UploadState {
  NoUpload,
  UploadingData,
  UploadingFile,
}

interface CreateImageProps {
  match: {
    params: {
      groupId: string
    }
  }
  auth: Auth
}

interface CreateImageState {
  title: string
  file: any
  uploadState: UploadState
}

export class CreateImage extends React.PureComponent<
  CreateImageProps,
  CreateImageState
> {
  state: CreateImageState = {
    title: '',
    file: undefined,
    uploadState: UploadState.NoUpload,

  }

  handleTitleChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    this.setState({ title: event.target.value })
  }

  handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = event.target.files
    if (!files) return

    console.log('File change', files)
    this.setState({
      file: files[0]
    })
  }

  handleSubmit = async (event: React.SyntheticEvent) => {
    event.preventDefault()

    try {
      if (!this.state.file) {
        alert('File should be selected')
        return
      }

      this.setUploadState(UploadState.UploadingData)
      const uploadInfo = await createImage(this.props.auth.getIdToken(), {
        groupId: this.props.match.params.groupId,
        title: this.state.title
      })

      console.log('Created image', uploadInfo)

      this.setUploadState(UploadState.UploadingFile)
      await uploadFile(uploadInfo.uploadUrl, this.state.file)
      // add model prediction here!
      const imageUrl = uploadInfo.uploadUrl.split("?")[0]
      const modelResult = await generatePrediction(imageUrl)
      console.log('Model result', modelResult)
      
      const breed = modelResult.top1[0].split("_").join(" ")
      const probability = Math.round(modelResult.prob[0] * 100)
      alert(`Image was uploaded and model result was generated. This image shows a ${breed} with a ${probability}% probability`)
    
    } catch (e) {
      alert('Could not upload an image: ' + e.message)
    } finally {
      this.setUploadState(UploadState.NoUpload)
      
    }
  }

  setUploadState(uploadState: UploadState) {
    this.setState({
      uploadState
    })
  }

  render() {
    return (
      <div>
        <h1>Upload new image</h1>

        <Form onSubmit={this.handleSubmit}>
          <Form.Field>
            <label>Title</label>
            <input
              placeholder="Image title"
              value={this.state.title}
              onChange={this.handleTitleChange}
            />
          </Form.Field>
          <Form.Field>
            <label>Image</label>
            <input
              type="file"
              accept="image/*"
              placeholder="Image to upload"
              onChange={this.handleFileChange}
            />
          </Form.Field>

          {this.renderButton()}
        </Form>
      </div>
    )
  }

  renderButton() {

    return (
      <div>
        {this.state.uploadState === UploadState.UploadingData && <p>Uploading image metadata</p>}
        {this.state.uploadState === UploadState.UploadingFile && <p>Uploading file</p>}
        <Button
          loading={this.state.uploadState !== UploadState.NoUpload}
          type="submit"
        >
          Upload
        </Button>
      </div>
    )
  }
}
