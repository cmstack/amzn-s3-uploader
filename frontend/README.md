# Amazon S3 File Uploader

A robust web-based solution for uploading large files to Amazon S3, built with React and a clean, modern interface.

## Features

- **Large File Support**: Handles large file uploads with multipart upload functionality
- **Drag & Drop Interface**: Intuitive file selection with drag-and-drop support
- **Progress Tracking**: Real-time upload progress indicators
- **Error Handling**: Comprehensive error handling with retry mechanisms
- **Clean UI**: Modern, responsive React interface
- **CloudFront Delivery**: Global content delivery through Amazon CloudFront
- **Fast Development**: Uses Vite + TypeScript for lightning-fast development and builds
- **Type Safety**: Full TypeScript support for better development experience

## Architecture

- **Frontend**: React + TypeScript application with Vite for optimal performance
- **Backend**: Lambda functions with API Gateway
- **Storage**: Amazon S3 for file storage
- **CDN**: Amazon CloudFront for global distribution
- **Infrastructure**: AWS CDK for infrastructure as code

## Quick Start

### Prerequisites

- Node.js 18+ 
- AWS CLI configured
- AWS CDK CLI installed

### Local Development

1. Install dependencies:
   ```bash
   npm install
   ```

2. Start the Vite development server:
   ```bash
   npm run dev-frontend
   ```

3. Open http://localhost:3000

   (Lightning-fast Vite dev server with HMR and TypeScript support)

### Deployment

1. Deploy everything in one command:
   ```bash
   npm run deploy
   ```

   This will:
   - Build the React application with Vite (super fast!)
   - Deploy the CDK infrastructure
   - Upload files to S3 and invalidate CloudFront

The CDK stack will output the CloudFront distribution URL and API Gateway endpoint.

## Configuration

The application requires the API Gateway URL for S3 uploads. Set this environment variable:

- `REACT_APP_API_URL`

The API Gateway URL is provided as a CDK deployment output.

## Security Considerations

- **Secure Architecture**: No AWS credentials required in frontend
- **Presigned URLs**: Server-side generation ensures security
- **Lambda Functions**: Minimal IAM permissions for S3 operations
- **API Gateway**: CORS-enabled for cross-origin requests
- Consider implementing authentication for production use
- Enable S3 bucket logging and monitoring