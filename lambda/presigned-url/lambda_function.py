import json
import os
import boto3
import math
from botocore.exceptions import ClientError

s3_client = boto3.client('s3')

def lambda_handler(event, context):
    # CORS headers
    cors_headers = {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Headers': 'Content-Type,X-Amz-Date,Authorization,X-Api-Key,X-Amz-Security-Token',
        'Access-Control-Allow-Methods': 'GET,POST,OPTIONS'
    }
    
    # Handle preflight requests
    if event.get('httpMethod') == 'OPTIONS':
        return {
            'statusCode': 200,
            'headers': cors_headers,
            'body': ''
        }
    
    try:
        # Parse request body
        body = json.loads(event.get('body', '{}'))
        file_name = body.get('fileName')
        file_type = body.get('fileType')
        file_size = body.get('fileSize')
        
        if not file_name or not file_type:
            return {
                'statusCode': 400,
                'headers': cors_headers,
                'body': json.dumps({'error': 'fileName and fileType are required'})
            }
        
        bucket_name = os.environ['UPLOAD_BUCKET_NAME']
        key = f"uploads/{int(context.aws_request_id[:8], 16)}-{file_name}"
        
        # Determine if we need multipart upload (files > 100MB)
        is_large_file = file_size and file_size > 100 * 1024 * 1024  # 100MB
        
        if is_large_file:
            # Initialize multipart upload
            response = s3_client.create_multipart_upload(
                Bucket=bucket_name,
                Key=key,
                ContentType=file_type
            )
            
            upload_id = response['UploadId']
            
            # Calculate number of parts (10MB per part, minimum 5MB except last part)
            part_size = 10 * 1024 * 1024  # 10MB
            num_parts = math.ceil(file_size / part_size)
            
            # Generate presigned URLs for each part
            presigned_urls = []
            for part_number in range(1, num_parts + 1):
                presigned_url = s3_client.generate_presigned_url(
                    'upload_part',
                    Params={
                        'Bucket': bucket_name,
                        'Key': key,
                        'PartNumber': part_number,
                        'UploadId': upload_id
                    },
                    ExpiresIn=3600  # 1 hour
                )
                
                presigned_urls.append({
                    'partNumber': part_number,
                    'presignedUrl': presigned_url
                })
            
            return {
                'statusCode': 200,
                'headers': cors_headers,
                'body': json.dumps({
                    'uploadType': 'multipart',
                    'uploadId': upload_id,
                    'key': key,
                    'presignedUrls': presigned_urls,
                    'partSize': part_size
                })
            }
        
        else:
            # Single part upload for smaller files
            presigned_url = s3_client.generate_presigned_url(
                'put_object',
                Params={
                    'Bucket': bucket_name,
                    'Key': key,
                    'ContentType': file_type
                },
                ExpiresIn=3600  # 1 hour
            )
            
            return {
                'statusCode': 200,
                'headers': cors_headers,
                'body': json.dumps({
                    'uploadType': 'single',
                    'presignedUrl': presigned_url,
                    'key': key
                })
            }
    
    except ClientError as e:
        print(f'AWS error: {e}')
        return {
            'statusCode': 500,
            'headers': cors_headers,
            'body': json.dumps({'error': 'AWS service error'})
        }
    
    except Exception as e:
        print(f'Error generating presigned URL: {e}')
        return {
            'statusCode': 500,
            'headers': cors_headers,
            'body': json.dumps({'error': 'Failed to generate presigned URL'})
        }