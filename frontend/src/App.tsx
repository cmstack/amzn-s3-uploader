import { useState } from 'react'
import './App.css'

interface UploadProgress {
  loaded: number
  total: number
  percentage: number
}

interface UploadData {
  uploadType: 'single' | 'multipart'
  presignedUrl?: string
  uploadId?: string
  key?: string
  presignedUrls?: Array<{
    partNumber: number
    presignedUrl: string
  }>
  partSize?: number
}

function App() {
  const [selectedFile, setSelectedFile] = useState<File | null>(null)
  const [apiUrl, setApiUrl] = useState<string>('')
  const [isUploading, setIsUploading] = useState<boolean>(false)
  const [progress, setProgress] = useState<UploadProgress>({ loaded: 0, total: 0, percentage: 0 })
  const [error, setError] = useState<string>('')
  const [success, setSuccess] = useState<boolean>(false)

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0] || null
    setSelectedFile(file)
    setError('')
    setSuccess(false)
  }

  const handleDrop = (event: React.DragEvent<HTMLDivElement>) => {
    event.preventDefault()
    event.currentTarget.classList.remove('drag-over')
    const files = event.dataTransfer.files
    if (files.length > 0) {
      setSelectedFile(files[0])
      setError('')
      setSuccess(false)
    }
  }

  const handleDragOver = (event: React.DragEvent<HTMLDivElement>) => {
    event.preventDefault()
    event.currentTarget.classList.add('drag-over')
  }

  const handleDragLeave = (event: React.DragEvent<HTMLDivElement>) => {
    event.currentTarget.classList.remove('drag-over')
  }

  const uploadSingleFile = async (file: File, presignedUrl: string): Promise<Response> => {
    const response = await fetch(presignedUrl, {
      method: 'PUT',
      body: file,
      headers: {
        'Content-Type': file.type,
      },
    })

    if (!response.ok) {
      throw new Error(`Upload failed: ${response.statusText}`)
    }

    return response
  }

  const uploadMultipartFile = async (file: File, uploadData: UploadData): Promise<any> => {
    const { uploadId, key, presignedUrls, partSize } = uploadData
    
    if (!uploadId || !key || !presignedUrls || !partSize) {
      throw new Error('Invalid multipart upload data')
    }

    const parts: Array<{ ETag: string; PartNumber: number }> = []

    for (let i = 0; i < presignedUrls.length; i++) {
      const { partNumber, presignedUrl } = presignedUrls[i]
      const start = (partNumber - 1) * partSize
      const end = Math.min(start + partSize, file.size)
      const chunk = file.slice(start, end)

      const response = await fetch(presignedUrl, {
        method: 'PUT',
        body: chunk,
        headers: {
          'Content-Type': file.type,
        },
      })

      if (!response.ok) {
        throw new Error(`Part ${partNumber} upload failed: ${response.statusText}`)
      }

      const etag = response.headers.get('ETag')
      if (!etag) {
        throw new Error(`No ETag received for part ${partNumber}`)
      }

      parts.push({
        ETag: etag,
        PartNumber: partNumber,
      })

      // Update progress
      const loaded = end
      const percentage = Math.round((loaded / file.size) * 100)
      setProgress({ loaded, total: file.size, percentage })
    }

    // Complete multipart upload
    const completeResponse = await fetch(`${apiUrl}/complete`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        uploadId,
        key,
        parts,
      }),
    })

    if (!completeResponse.ok) {
      throw new Error(`Failed to complete multipart upload: ${completeResponse.statusText}`)
    }

    return completeResponse.json()
  }

  const handleUpload = async () => {
    if (!selectedFile || !apiUrl) {
      setError('Please select a file and enter API URL')
      return
    }

    setIsUploading(true)
    setError('')
    setSuccess(false)
    setProgress({ loaded: 0, total: selectedFile.size, percentage: 0 })

    try {
      // Get presigned URL(s) from API
      const response = await fetch(`${apiUrl}/upload`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          fileName: selectedFile.name,
          fileType: selectedFile.type,
          fileSize: selectedFile.size,
        }),
      })

      if (!response.ok) {
        throw new Error(`Failed to get presigned URL: ${response.statusText}`)
      }

      const uploadData: UploadData = await response.json()

      if (uploadData.uploadType === 'single' && uploadData.presignedUrl) {
        await uploadSingleFile(selectedFile, uploadData.presignedUrl)
      } else if (uploadData.uploadType === 'multipart') {
        await uploadMultipartFile(selectedFile, uploadData)
      }

      setSuccess(true)
      
    } catch (error) {
      console.error('Upload failed:', error)
      setError(error instanceof Error ? error.message : 'Upload failed')
    } finally {
      setIsUploading(false)
      setProgress({ loaded: 0, total: 0, percentage: 0 })
    }
  }

  const formatFileSize = (bytes: number): string => {
    if (bytes === 0) return '0 Bytes'
    const k = 1024
    const sizes = ['Bytes', 'KB', 'MB', 'GB']
    const i = Math.floor(Math.log(bytes) / Math.log(k))
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i]
  }

  const handleFileInputClick = () => {
    document.getElementById('fileInput')?.click()
  }

  return (
    <div className="app-container">
      <h1>Amazon S3 File Uploader</h1>
      <p>Upload large files to Amazon S3 with progress tracking and retry functionality</p>
      
      <div className="form-field">
        <label className="form-label" htmlFor="apiUrl">API Gateway URL</label>
        <span className="form-description">Enter your API Gateway URL from CDK deployment</span>
        <input 
          type="text" 
          id="apiUrl" 
          className="input-field" 
          placeholder="https://abc123.execute-api.us-east-1.amazonaws.com/prod"
          value={apiUrl}
          onChange={(e) => setApiUrl(e.target.value)}
          disabled={isUploading}
        />
      </div>
      
      <div className="form-field">
        <label className="form-label">Select File</label>
        <span className="form-description">Choose a file to upload to S3. Supports large files with multipart upload.</span>
        <div 
          className="file-upload-area" 
          onClick={handleFileInputClick}
          onDrop={handleDrop}
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
        >
          <input 
            type="file" 
            id="fileInput" 
            style={{ display: 'none' }} 
            onChange={handleFileChange}
          />
          <div>Drop file to upload, or click to browse</div>
        </div>
      </div>
      
      {selectedFile && (
        <div className="file-info">
          <h3>File Details</h3>
          <div><strong>Name:</strong> {selectedFile.name}</div>
          <div><strong>Size:</strong> {formatFileSize(selectedFile.size)}</div>
          <div><strong>Type:</strong> {selectedFile.type || 'Unknown'}</div>
        </div>
      )}
      
      {progress.percentage > 0 && isUploading && (
        <div className="progress-container">
          <h3>Upload Progress</h3>
          <div className="progress-bar">
            <div className="progress-fill" style={{ width: `${progress.percentage}%` }}></div>
          </div>
          <div>{progress.percentage}% - {formatFileSize(progress.loaded)} of {formatFileSize(progress.total)}</div>
        </div>
      )}
      
      {error && (
        <div className="alert alert-error">
          <strong>Upload Failed</strong>
          <div>{error}</div>
          <button className="retry-button" onClick={handleUpload} disabled={isUploading}>
            Retry Upload
          </button>
        </div>
      )}
      
      {success && (
        <div className="alert alert-success">
          <strong>Upload Complete</strong>
          <div>File successfully uploaded to S3!</div>
        </div>
      )}
      
      <button 
        className="upload-button" 
        onClick={handleUpload}
        disabled={!selectedFile || !apiUrl || isUploading}
      >
        {isUploading ? 'Uploading...' : 'Upload to S3'}
      </button>
    </div>
  )
}

export default App