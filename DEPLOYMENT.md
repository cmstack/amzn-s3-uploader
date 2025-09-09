# Deployment Guide

This guide walks through deploying the Amazon S3 File Uploader solution using AWS CDK.

## Prerequisites

- **AWS CLI** configured with appropriate credentials
- **AWS CDK v2** installed globally: `npm install -g aws-cdk`
- **Node.js 18+** and npm
- **AWS Account** with permissions for S3, CloudFront, Lambda, API Gateway, and IAM

## Deployment Steps

### 1. Install Dependencies

```bash
npm install
```

### 2. Bootstrap CDK (First Time Only)

If this is your first CDK deployment in this AWS account/region:

```bash
npx cdk bootstrap
```

### 3. Build Frontend (Required)

Build the React frontend before deployment:

```bash
cd frontend
npm install
npm run build
cd ..
```

### 4. Build and Deploy CDK Stack

```bash
npx cdk deploy
```

This will:
- Compile TypeScript CDK code
- Create S3 buckets with CORS configuration
- Deploy Lambda functions for presigned URL generation
- Set up API Gateway with CORS
- Create CloudFront distribution
- Deploy frontend to S3 with CloudFront invalidation

### 5. Note Deployment Outputs

After successful deployment, CDK outputs:

- **DistributionDomainName**: CloudFront URL for your web app
- **UploadBucketName**: S3 bucket for file uploads
- **WebBucketName**: S3 bucket for web hosting
- **ApiGatewayUrl**: API Gateway base URL
- **DistributionId**: CloudFront distribution ID

## Architecture Overview

```
User Browser
    ↓
CloudFront Distribution (React App)
    ↓
API Gateway (/upload, /complete)
    ↓
Lambda Functions (Python 3.12)
    ↓
S3 Upload Bucket (File Storage)
```

### AWS Resources Created:

- **2 S3 Buckets**: Web hosting (private) and file uploads (CORS-enabled)
- **CloudFront Distribution**: Global CDN with Origin Access Control
- **API Gateway**: REST API with CORS for upload endpoints
- **2 Lambda Functions**: Presigned URL generation and multipart completion
- **IAM Roles**: Least-privilege access for Lambda functions

## Configuration

### Automatic Configuration

The CDK stack automatically configures:
- S3 bucket CORS for browser uploads
- Lambda environment variables (`UPLOAD_BUCKET_NAME`)
- IAM permissions for S3 access
- CloudFront Origin Access Control
- API Gateway CORS headers

### Manual Configuration (Optional)

For production deployments, consider:

1. **Restrict CORS origins** in S3 bucket configuration
2. **Enable CloudFront access logging**
3. **Set up CloudWatch alarms** for monitoring
4. **Configure custom domain** for CloudFront

## Security Features

- **Presigned URLs**: 1-hour expiration, no AWS credentials in frontend
- **Origin Access Control**: Secure S3 access via CloudFront only
- **CORS Configuration**: Controlled cross-origin access
- **Least Privilege IAM**: Lambda functions have minimal required permissions
- **Automatic Cleanup**: Failed multipart uploads are automatically aborted

## File Upload Behavior

- **Small files (≤100MB)**: Single-part upload with one presigned URL
- **Large files (>100MB)**: Automatic multipart upload (10MB parts)
- **Upload timeout**: Presigned URLs expire after 1 hour
- **Error handling**: Failed uploads are cleaned up automatically

## Development Workflow

### Local Frontend Development

```bash
cd frontend
npm start
```

Update API endpoint in frontend code to use deployed API Gateway URL.

### Testing Lambda Functions

```bash
cd lambda/presigned-url
python3 -c "import lambda_function; print('Function loaded successfully')"
```

### CDK Development Commands

- `npx cdk diff` - Compare deployed stack with current state
- `npx cdk synth` - Generate CloudFormation template
- `npm run watch` - Watch for TypeScript changes

## Monitoring and Logging

### CloudWatch Logs
- Lambda function logs: `/aws/lambda/AmznS3UploaderStack-PresignedUrlFunction-*`
- Lambda function logs: `/aws/lambda/AmznS3UploaderStack-CompleteMultipartFunction-*`

### Metrics to Monitor
- S3 bucket storage and requests
- CloudFront cache hit ratio and data transfer
- Lambda function duration and errors
- API Gateway request count and latency

## Cost Optimization

- **CloudFront**: Uses PRICE_CLASS_100 (US, Canada, Europe only)
- **S3 Lifecycle**: Objects auto-delete on stack destruction
- **Lambda**: 30-second timeout prevents runaway costs
- **Multipart Cleanup**: Failed uploads don't accumulate storage costs

## Troubleshooting

### Common Deployment Issues

1. **Frontend build missing**: Run `cd frontend && npm run build` before CDK deploy
2. **Bucket name conflicts**: CDK generates unique names using account/region
3. **Permission errors**: Ensure AWS credentials have CDK deployment permissions

### Runtime Issues

1. **CORS errors**: Check browser console and API Gateway CORS configuration
2. **Upload failures**: Monitor Lambda logs in CloudWatch
3. **Large file issues**: Verify multipart upload completion

### Debugging Steps

1. Check CloudWatch logs for Lambda functions
2. Test API endpoints directly with curl/Postman
3. Verify S3 bucket CORS configuration
4. Monitor browser network tab for failed requests

## Cleanup

To remove all AWS resources:

```bash
npx cdk destroy
```

⚠️ **Warning**: This permanently deletes all uploaded files and cannot be undone.

## Production Considerations

1. **Change removal policy** from DESTROY to RETAIN for S3 buckets
2. **Implement authentication** for upload endpoints
3. **Set up monitoring alerts** for errors and costs
4. **Configure backup strategy** for uploaded files
5. **Restrict CORS origins** to your domain only
6. **Enable access logging** for audit trails