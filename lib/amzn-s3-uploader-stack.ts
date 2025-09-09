import * as cdk from 'aws-cdk-lib';
import { Construct } from 'constructs';
import * as s3 from 'aws-cdk-lib/aws-s3';
import * as cloudfront from 'aws-cdk-lib/aws-cloudfront';
import * as origins from 'aws-cdk-lib/aws-cloudfront-origins';
import * as s3deploy from 'aws-cdk-lib/aws-s3-deployment';
import * as iam from 'aws-cdk-lib/aws-iam';
import * as lambda from 'aws-cdk-lib/aws-lambda';
import * as apigateway from 'aws-cdk-lib/aws-apigateway';

export class AmznS3UploaderStack extends cdk.Stack {
  constructor(scope: Construct, id: string, props?: cdk.StackProps) {
    super(scope, id, props);

    // S3 bucket for file uploads
    const uploadBucket = new s3.Bucket(this, 'UploadBucket', {
      bucketName: `s3-uploader-${this.account}-${this.region}`,
      versioned: false,
      removalPolicy: cdk.RemovalPolicy.DESTROY,
      autoDeleteObjects: true,
      cors: [
        {
          allowedMethods: [
            s3.HttpMethods.GET,
            s3.HttpMethods.POST,
            s3.HttpMethods.PUT,
            s3.HttpMethods.DELETE,
            s3.HttpMethods.HEAD,
          ],
          allowedOrigins: ['*'],
          allowedHeaders: ['*'],
          exposedHeaders: [
            'ETag',
            'x-amz-meta-custom-header',
          ],
        },
      ],
    });

    // S3 bucket for hosting the web application
    const webBucket = new s3.Bucket(this, 'WebBucket', {
      bucketName: `s3-uploader-web-${this.account}-${this.region}`,
      versioned: false,
      removalPolicy: cdk.RemovalPolicy.DESTROY,
      autoDeleteObjects: true,
      websiteIndexDocument: 'index.html',
      websiteErrorDocument: 'error.html',
      publicReadAccess: false,
      blockPublicAccess: s3.BlockPublicAccess.BLOCK_ALL,
    });

    // CloudFront Origin Access Control (using older syntax for compatibility)
    const oac = new cloudfront.S3OriginAccessControl(this, 'OAC', {
      description: 'OAC for S3 uploader web bucket',
    });

    // CloudFront distribution for web application
    const distribution = new cloudfront.Distribution(this, 'Distribution', {
      defaultBehavior: {
        origin: origins.S3BucketOrigin.withOriginAccessControl(webBucket, {
          originAccessControl: oac,
        }),
        viewerProtocolPolicy: cloudfront.ViewerProtocolPolicy.REDIRECT_TO_HTTPS,
        allowedMethods: cloudfront.AllowedMethods.ALLOW_GET_HEAD,
        cachedMethods: cloudfront.CachedMethods.CACHE_GET_HEAD,
        compress: true,
      },
      defaultRootObject: 'index.html',
      errorResponses: [
        {
          httpStatus: 404,
          responseHttpStatus: 200,
          responsePagePath: '/index.html',
          ttl: cdk.Duration.minutes(30),
        },
      ],
      priceClass: cloudfront.PriceClass.PRICE_CLASS_100,
    });

    // Grant CloudFront access to the web bucket
    webBucket.addToResourcePolicy(
      new iam.PolicyStatement({
        actions: ['s3:GetObject'],
        resources: [webBucket.arnForObjects('*')],
        principals: [new iam.ServicePrincipal('cloudfront.amazonaws.com')],
        conditions: {
          StringEquals: {
            'AWS:SourceArn': `arn:aws:cloudfront::${this.account}:distribution/${distribution.distributionId}`,
          },
        },
      })
    );

    // Lambda function for generating presigned URLs
    const presignedUrlFunction = new lambda.Function(this, 'PresignedUrlFunction', {
      runtime: lambda.Runtime.PYTHON_3_12,
      handler: 'lambda_function.lambda_handler',
      code: lambda.Code.fromAsset('lambda/presigned-url'),
      environment: {
        UPLOAD_BUCKET_NAME: uploadBucket.bucketName,
      },
      timeout: cdk.Duration.seconds(30),
    });

    // Lambda function for completing multipart uploads
    const completeMultipartFunction = new lambda.Function(this, 'CompleteMultipartFunction', {
      runtime: lambda.Runtime.PYTHON_3_12,
      handler: 'lambda_function.lambda_handler',
      code: lambda.Code.fromAsset('lambda/complete-multipart'),
      environment: {
        UPLOAD_BUCKET_NAME: uploadBucket.bucketName,
      },
      timeout: cdk.Duration.seconds(30),
    });

    // Grant Lambda functions permissions to the upload bucket
    uploadBucket.grantReadWrite(presignedUrlFunction);
    uploadBucket.grantReadWrite(completeMultipartFunction);

    // API Gateway
    const api = new apigateway.RestApi(this, 'S3UploaderApi', {
      restApiName: 'S3 Uploader API',
      description: 'API for generating S3 presigned URLs',
      defaultCorsPreflightOptions: {
        allowOrigins: apigateway.Cors.ALL_ORIGINS,
        allowMethods: apigateway.Cors.ALL_METHODS,
        allowHeaders: [
          'Content-Type',
          'X-Amz-Date',
          'Authorization',
          'X-Api-Key',
          'X-Amz-Security-Token'
        ],
      },
    });

    // API Gateway integrations
    const presignedUrlIntegration = new apigateway.LambdaIntegration(presignedUrlFunction);
    const completeMultipartIntegration = new apigateway.LambdaIntegration(completeMultipartFunction);

    // API Gateway resources
    const uploadResource = api.root.addResource('upload');
    uploadResource.addMethod('POST', presignedUrlIntegration);

    const completeResource = api.root.addResource('complete');
    completeResource.addMethod('POST', completeMultipartIntegration);

    // Deploy frontend build to S3
    new s3deploy.BucketDeployment(this, 'DeployWebsite', {
      sources: [s3deploy.Source.asset('./frontend/build')],
      destinationBucket: webBucket,
      distribution,
      distributionPaths: ['/*'],
    });


    // Output important values
    new cdk.CfnOutput(this, 'UploadBucketName', {
      value: uploadBucket.bucketName,
      description: 'Name of the S3 bucket for file uploads',
    });

    new cdk.CfnOutput(this, 'WebBucketName', {
      value: webBucket.bucketName,
      description: 'Name of the S3 bucket for web hosting',
    });

    new cdk.CfnOutput(this, 'DistributionDomainName', {
      value: distribution.distributionDomainName,
      description: 'CloudFront distribution domain name',
    });

    new cdk.CfnOutput(this, 'DistributionId', {
      value: distribution.distributionId,
      description: 'CloudFront distribution ID',
    });

    new cdk.CfnOutput(this, 'ApiGatewayUrl', {
      value: api.url,
      description: 'API Gateway URL for upload endpoints',
    });
  }
}
