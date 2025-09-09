# S3 Uploader API Documentation

## Base URL
After deployment, your API Gateway URL will be available in the CDK outputs as `ApiGatewayUrl`.

## Authentication
No authentication required for these endpoints.

## CORS
All endpoints support CORS with the following configuration:
- **Allowed Origins**: `*`
- **Allowed Methods**: `GET`, `POST`, `OPTIONS`
- **Allowed Headers**: `Content-Type`, `X-Amz-Date`, `Authorization`, `X-Api-Key`, `X-Amz-Security-Token`

---

## Endpoints

### 1. Generate Presigned URL

**Endpoint**: `POST /upload`

Generates presigned URLs for file uploads. Automatically determines whether to use single-part or multipart upload based on file size (>100MB triggers multipart).

#### Request Body
```json
{
  "fileName": "example.pdf",
  "fileType": "application/pdf",
  "fileSize": 52428800
}
```

#### Request Parameters
| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `fileName` | string | Yes | Name of the file to upload |
| `fileType` | string | Yes | MIME type of the file |
| `fileSize` | number | No | File size in bytes (required for files >100MB) |

#### Response - Single Part Upload (files ≤100MB)
```json
{
  "uploadType": "single",
  "presignedUrl": "https://s3.amazonaws.com/bucket/uploads/abc123-example.pdf?...",
  "key": "uploads/abc123-example.pdf"
}
```

#### Response - Multipart Upload (files >100MB)
```json
{
  "uploadType": "multipart",
  "uploadId": "abc123-def456-ghi789",
  "key": "uploads/abc123-example.pdf",
  "partSize": 10485760,
  "presignedUrls": [
    {
      "partNumber": 1,
      "presignedUrl": "https://s3.amazonaws.com/bucket/uploads/abc123-example.pdf?partNumber=1&uploadId=..."
    },
    {
      "partNumber": 2,
      "presignedUrl": "https://s3.amazonaws.com/bucket/uploads/abc123-example.pdf?partNumber=2&uploadId=..."
    }
  ]
}
```

#### Error Responses
```json
{
  "error": "fileName and fileType are required"
}
```

**Status Codes**:
- `200`: Success
- `400`: Bad Request (missing required parameters)
- `500`: Internal Server Error

---

### 2. Complete Multipart Upload

**Endpoint**: `POST /complete`

Completes a multipart upload by combining all uploaded parts.

#### Request Body
```json
{
  "uploadId": "abc123-def456-ghi789",
  "key": "uploads/abc123-example.pdf",
  "parts": [
    {
      "PartNumber": 1,
      "ETag": "\"d41d8cd98f00b204e9800998ecf8427e\""
    },
    {
      "PartNumber": 2,
      "ETag": "\"098f6bcd4621d373cade4e832627b4f6\""
    }
  ]
}
```

#### Request Parameters
| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `uploadId` | string | Yes | Upload ID from the initial multipart upload request |
| `key` | string | Yes | S3 object key from the initial request |
| `parts` | array | Yes | Array of uploaded parts with PartNumber and ETag |

#### Parts Array Object
| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `PartNumber` | number | Yes | Part number (1-based index) |
| `ETag` | string | Yes | ETag returned from the part upload |

#### Success Response
```json
{
  "success": true,
  "location": "https://s3.amazonaws.com/bucket/uploads/abc123-example.pdf",
  "key": "uploads/abc123-example.pdf",
  "etag": "\"d41d8cd98f00b204e9800998ecf8427e-2\""
}
```

#### Error Responses
```json
{
  "error": "uploadId, key, and parts array are required"
}
```

**Status Codes**:
- `200`: Success
- `400`: Bad Request (missing required parameters)
- `500`: Internal Server Error

---

## Usage Examples

### Single File Upload (≤100MB)

1. **Get presigned URL**:
```javascript
const response = await fetch(`${API_BASE_URL}/upload`, {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    fileName: 'document.pdf',
    fileType: 'application/pdf',
    fileSize: 5242880
  })
});

const { presignedUrl, key } = await response.json();
```

2. **Upload file**:
```javascript
await fetch(presignedUrl, {
  method: 'PUT',
  headers: { 'Content-Type': 'application/pdf' },
  body: file
});
```

### Large File Upload (>100MB)

1. **Get multipart presigned URLs**:
```javascript
const response = await fetch(`${API_BASE_URL}/upload`, {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    fileName: 'large-video.mp4',
    fileType: 'video/mp4',
    fileSize: 157286400
  })
});

const { uploadId, key, presignedUrls, partSize } = await response.json();
```

2. **Upload each part**:
```javascript
const parts = [];
for (let i = 0; i < presignedUrls.length; i++) {
  const start = i * partSize;
  const end = Math.min(start + partSize, file.size);
  const chunk = file.slice(start, end);
  
  const uploadResponse = await fetch(presignedUrls[i].presignedUrl, {
    method: 'PUT',
    body: chunk
  });
  
  parts.push({
    PartNumber: presignedUrls[i].partNumber,
    ETag: uploadResponse.headers.get('ETag')
  });
}
```

3. **Complete multipart upload**:
```javascript
await fetch(`${API_BASE_URL}/complete`, {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    uploadId,
    key,
    parts
  })
});
```

## Error Handling

All endpoints return appropriate HTTP status codes and error messages in JSON format. Common error scenarios:

- **400 Bad Request**: Missing required parameters
- **500 Internal Server Error**: AWS service errors or unexpected failures

For multipart uploads, if completion fails, the API automatically attempts to abort the multipart upload to prevent incomplete uploads from accumulating storage costs.