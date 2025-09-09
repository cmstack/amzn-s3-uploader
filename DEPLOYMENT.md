# Deployment Guide

This guide walks through deploying the Amazon S3 File Uploader solution.

## Prerequisites

1. **AWS CLI** configured with appropriate credentials
2. **AWS CDK CLI** installed (`npm install -g aws-cdk`)
3. **Node.js** 18+ installed
4. **AWS Account** with permissions for S3, CloudFront, and IAM

## Deployment Steps

### 1. Install Dependencies

```bash
npm install
```

### 2. Bootstrap CDK (First Time Only)

If this is your first CDK deployment in this region/account:

```bash
cdk bootstrap
```

### 3. Build and Deploy

```bash
npm run deploy
```

This command will:
- Build the React frontend
- Compile the CDK TypeScript code  
- Deploy the infrastructure to AWS
- Upload the frontend to S3
- Invalidate CloudFront cache

### 4. Get Deployment Outputs

After deployment, note the outputs:
- **DistributionDomainName**: Your application URL
- **UploadBucketName**: S3 bucket for file uploads  
- **WebBucketName**: S3 bucket for web hosting
- **ApiGatewayUrl**: API endpoint for upload operations

## Configuration

### Environment Variables

For local development, create a `.env` file:

```
REACT_APP_API_URL=https://your-api-gateway-url.amazonaws.com/prod
```

The API Gateway URL will be provided as a CDK output after deployment.

### Security Features

This implementation uses a secure architecture:
1. **No AWS credentials in frontend**: Uses presigned URLs generated server-side
2. **Lambda-based API**: Secure backend handles all S3 interactions
3. **Automatic multipart uploads**: Large files (>100MB) automatically use multipart upload
4. **CORS-enabled API**: Ready for cross-origin requests

## Architecture Overview

```
User Browser
    ↓
CloudFront Distribution (React App)
    ↓
API Gateway
    ↓
Lambda Functions (Presigned URLs)
    ↓
S3 Upload Bucket (File Storage)
```

### Components:
- **Frontend**: React app served via CloudFront
- **API Gateway**: RESTful API with CORS support  
- **Lambda Functions**: Generate presigned URLs and handle multipart completion
- **S3 Buckets**: Separate buckets for web hosting and file uploads

## Security Considerations

1. **CORS Configuration**: The S3 upload bucket has CORS enabled for all origins. Restrict this to your domain in production.

2. **IAM Permissions**: The upload role has minimal required permissions. Review and adjust as needed.

3. **Authentication**: Implement user authentication before production use.

4. **Bucket Policies**: Consider additional bucket policies for enhanced security.

## Monitoring

1. **CloudWatch Metrics**: Monitor S3 and CloudFront metrics
2. **Access Logs**: Enable S3 and CloudFront access logging
3. **Cost Monitoring**: Set up billing alerts for S3 storage and data transfer

## Cleanup

To remove all resources:

```bash
cdk destroy
```

⚠️ **Warning**: This will delete all uploaded files and cannot be undone.

## Troubleshooting

### Build Issues
- Ensure Node.js version is 18+
- Clear node_modules and reinstall dependencies
- Check TypeScript compilation errors

### Deployment Issues  
- Verify AWS credentials are configured
- Check IAM permissions for CDK deployment
- Ensure bucket names are globally unique

### Upload Issues
- Verify CORS configuration on S3 bucket
- Check AWS credentials in browser application
- Monitor browser network tab for errors

## Support

For issues or questions:
1. Check AWS CloudWatch logs
2. Review browser developer console
3. Verify S3 bucket policies and CORS settings