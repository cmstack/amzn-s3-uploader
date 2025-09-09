import json
import os
import boto3
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
        upload_id = body.get('uploadId')
        key = body.get('key')
        parts = body.get('parts')
        
        if not upload_id or not key or not parts or not isinstance(parts, list):
            return {
                'statusCode': 400,
                'headers': cors_headers,
                'body': json.dumps({'error': 'uploadId, key, and parts array are required'})
            }
        
        bucket_name = os.environ['UPLOAD_BUCKET_NAME']
        
        # Format parts for AWS S3 API
        multipart_upload_parts = []
        for part in parts:
            multipart_upload_parts.append({
                'ETag': part['ETag'],
                'PartNumber': part['PartNumber']
            })
        
        # Complete the multipart upload
        response = s3_client.complete_multipart_upload(
            Bucket=bucket_name,
            Key=key,
            UploadId=upload_id,
            MultipartUpload={'Parts': multipart_upload_parts}
        )
        
        return {
            'statusCode': 200,
            'headers': cors_headers,
            'body': json.dumps({
                'success': True,
                'location': response.get('Location', ''),
                'key': response.get('Key', key),
                'etag': response.get('ETag', '')
            })
        }
    
    except ClientError as e:
        print(f'AWS error completing multipart upload: {e}')
        
        # Try to abort the multipart upload on error
        try:
            if upload_id and key:
                s3_client.abort_multipart_upload(
                    Bucket=bucket_name,
                    Key=key,
                    UploadId=upload_id
                )
                print(f'Aborted multipart upload {upload_id} for key {key}')
        except Exception as abort_error:
            print(f'Error aborting multipart upload: {abort_error}')
        
        return {
            'statusCode': 500,
            'headers': cors_headers,
            'body': json.dumps({'error': 'AWS service error completing multipart upload'})
        }
    
    except Exception as e:
        print(f'Error completing multipart upload: {e}')
        return {
            'statusCode': 500,
            'headers': cors_headers,
            'body': json.dumps({'error': 'Failed to complete multipart upload'})
        }