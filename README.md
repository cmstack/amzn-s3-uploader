# Amazon S3 Uploader

A serverless file upload solution built with AWS CDK, featuring direct-to-S3 uploads using presigned URLs with support for both single-part and multipart uploads.

## Architecture

- **Frontend**: React web application hosted on S3 with CloudFront distribution
- **API**: API Gateway with Lambda functions for presigned URL generation
- **Storage**: S3 bucket for file uploads with CORS configuration
- **CDN**: CloudFront distribution for fast global content delivery

## Features

- ✅ Direct-to-S3 uploads (no server bandwidth usage)
- ✅ Automatic multipart upload for large files (>100MB)
- ✅ Presigned URL generation with 1-hour expiration
- ✅ CORS-enabled API for browser uploads
- ✅ CloudFront distribution for web hosting
- ✅ Secure S3 access with Origin Access Control

## Prerequisites

- Node.js 18+ and npm
- AWS CLI configured with appropriate permissions
- AWS CDK v2 installed globally: `npm install -g aws-cdk`

## Quick Start

1. **Install dependencies**:
   ```bash
   npm install
   ```

2. **Build the project**:
   ```bash
   npm run build
   ```

3. **Deploy to AWS**:
   ```bash
   npx cdk deploy
   ```

4. **Access your application**:
   After deployment, find the CloudFront URL in the CDK outputs.

## Project Structure

```
├── lib/
│   └── amzn-s3-uploader-stack.ts    # CDK stack definition
├── lambda/
│   ├── presigned-url/               # Generate presigned URLs
│   └── complete-multipart/          # Complete multipart uploads
├── frontend/                        # React web application
├── bin/
│   └── amzn-s3-uploader.ts         # CDK app entry point
└── API.md                          # API documentation
```

## API Endpoints

See [API.md](./API.md) for complete API documentation.

- `POST /upload` - Generate presigned URLs for file uploads
- `POST /complete` - Complete multipart uploads

## Configuration

### Environment Variables (Lambda)
- `UPLOAD_BUCKET_NAME` - S3 bucket name for file uploads (auto-configured)

### S3 Bucket Settings
- **Upload Bucket**: Configured with CORS for browser uploads
- **Web Bucket**: Private bucket with CloudFront access only
- **Removal Policy**: DESTROY (for development - change for production)

## Development

### Build Commands

- `npm run build` - Compile TypeScript to JavaScript
- `npm run watch` - Watch for changes and compile
- `npm run test` - Run Jest unit tests

### CDK Commands

- `npx cdk deploy` - Deploy stack to AWS
- `npx cdk diff` - Compare deployed stack with current state
- `npx cdk synth` - Generate CloudFormation template
- `npx cdk destroy` - Remove all AWS resources

### Local Development

1. **Frontend development**:
   ```bash
   cd frontend
   npm install
   npm start
   ```

2. **Lambda testing**:
   ```bash
   cd lambda/presigned-url
   python3 lambda_function.py
   ```

## Deployment Outputs

After deployment, CDK provides these outputs:

- **UploadBucketName** - S3 bucket for file uploads
- **WebBucketName** - S3 bucket for web hosting
- **DistributionDomainName** - CloudFront URL for the web app
- **DistributionId** - CloudFront distribution ID
- **ApiGatewayUrl** - API Gateway base URL

## Security Considerations

- Presigned URLs expire after 1 hour
- S3 buckets use least-privilege access policies
- CloudFront uses Origin Access Control for secure S3 access
- CORS configured for browser security

## Cost Optimization

- CloudFront uses PRICE_CLASS_100 (US, Canada, Europe)
- S3 buckets auto-delete objects on stack destruction
- Lambda functions have 30-second timeout
- Multipart uploads auto-abort on failure

## Troubleshooting

### Common Issues

1. **CORS errors**: Ensure API Gateway CORS is properly configured
2. **Large file uploads**: Files >100MB automatically use multipart upload
3. **Deployment failures**: Check AWS credentials and permissions

### Logs

- **Lambda logs**: CloudWatch Logs groups for each function
- **API Gateway logs**: Enable in API Gateway console if needed
- **CloudFront logs**: Configure access logging if required

## License

MIT License - see LICENSE file for details.
