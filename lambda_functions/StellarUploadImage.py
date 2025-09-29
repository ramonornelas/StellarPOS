import json
import boto3
import base64
import os
import uuid
from datetime import datetime
from botocore.exceptions import ClientError, NoCredentialsError
from urllib.parse import unquote_plus


def lambda_handler(event, context):
    """
    AWS Lambda function to receive an image and store it in S3.
    
    Expected event structure:
    {
        "image_data": "base64_encoded_image_string",
        "file_extension": ".png",  # Optional, defaults to .png
        "custom_name": "test_image_000",  # Optional, defaults to "test_image_000"
        "folder": "test_products",      # Optional, defaults to "test_products"
        "make_public": true        # Optional, defaults to true
    }
    
    """
    
    # Initialize S3 client
    try:
        s3_client = boto3.client('s3')
        bucket_name = os.environ.get('S3_BUCKET_NAME', 'test-stellar-images')
        region_name = os.environ.get('AWS_REGION', 'us-west-1')
    except Exception as e:
        return create_response(500, f"Failed to initialize S3 client: {str(e)}")
    
    try:
        # Parse the incoming event
        image_data, file_extension, custom_name, folder, make_public = parse_event(event)
        
        if not image_data:
            return create_response(400, "No image data provided")
        
        # Generate unique filename
        s3_key = generate_unique_s3_key(
            s3_client, 
            bucket_name, 
            custom_name, 
            folder, 
            file_extension
        )
        
        # Upload image to S3
        url = upload_image_to_s3(
            s3_client,
            bucket_name,
            region_name,
            image_data,
            s3_key,
            file_extension,
            make_public
        )
        
        if url:
            return create_response(200, "Image uploaded successfully", {
                "image_url": url,
                "s3_key": s3_key,
                "bucket": bucket_name,
                "timestamp": datetime.utcnow().isoformat()
            })
        else:
            return create_response(500, "Failed to upload image")
            
    except Exception as e:
        print(f"Error in lambda_handler: {str(e)}")
        return create_response(500, f"Internal server error: {str(e)}")


def parse_event(event):
    """
    Parse the Lambda event to extract image data and parameters.
    
    Returns:
        tuple: (image_data, file_extension, custom_name, folder, make_public)
    """
    
    # Default values
    image_data = None
    file_extension = ".png"
    custom_name = "test_image_000"
    folder = "test_products"
    make_public = True
    
    try:
        # Check if it's a direct JSON event
        if 'image_data' in event:
            image_data = event['image_data']
            file_extension = event.get('file_extension', file_extension)
            custom_name = event.get('custom_name', custom_name)
            folder = event.get('folder', folder)
            make_public = event.get('make_public', make_public)
            
            # Decode base64 image data
            image_data = base64.b64decode(image_data)
            
        # Check if it's from API Gateway with JSON body
        elif 'body' in event:
            body = json.loads(event['body']) if isinstance(event['body'], str) else event['body']
            if 'image_data' in body:
                image_data = base64.b64decode(body['image_data'])
                file_extension = body.get('file_extension', file_extension)
                custom_name = body.get('custom_name', custom_name)
                folder = body.get('folder', folder)
                make_public = body.get('make_public', make_public)
                
    except Exception as e:
        print(f"Error parsing event: {str(e)}")
        return None, file_extension, custom_name, folder, make_public
    
    return image_data, file_extension, custom_name, folder, make_public

def file_exists_in_s3(s3_client, bucket_name, s3_key):
    """
    Check if a file exists in S3.
    """
    try:
        s3_client.head_object(Bucket=bucket_name, Key=s3_key)
        return True
    except ClientError as e:
        if e.response['Error']['Code'] == '404':
            return False
        else:
            print(f"Error checking file existence: {str(e)}")
            return False


def generate_unique_s3_key(s3_client, bucket_name, base_name, folder, file_extension):
    """
    Generate a unique S3 key by checking if it exists and adding a counter if needed.
    """
    if folder and not folder.endswith('/'):
        folder += '/'
    
    # Try the base name first
    s3_key = f"{folder}{base_name}{file_extension}"
    if not file_exists_in_s3(s3_client, bucket_name, s3_key):
        return s3_key
    
    # If it exists, try with incrementing numbers
    counter = 1
    while True:
        s3_key = f"{folder}{base_name}({counter}){file_extension}"
        if not file_exists_in_s3(s3_client, bucket_name, s3_key):
            return s3_key
        counter += 1


def upload_image_to_s3(s3_client, bucket_name, region_name, image_data, s3_key, file_extension, make_public):
    """
    Upload image data to S3 and return the URL.
    """
    try:
        # Determine content type
        content_type_map = {
            '.jpg': 'image/jpeg',
            '.jpeg': 'image/jpeg',
            '.png': 'image/png',
            '.gif': 'image/gif',
            '.bmp': 'image/bmp',
            '.webp': 'image/webp'
        }
        content_type = content_type_map.get(file_extension.lower(), 'binary/octet-stream')
        
        # Prepare upload parameters
        upload_params = {
            'Bucket': bucket_name,
            'Key': s3_key,
            'Body': image_data,
            'ContentType': content_type
        }
        
        # Add public read permission if requested
        if make_public:
            upload_params['ACL'] = 'public-read'
        
        # Upload the file
        s3_client.put_object(**upload_params)
        
        # Generate the URL
        if make_public:
            url = f"https://{bucket_name}.s3.{region_name}.amazonaws.com/{s3_key}"
        else:
            # Generate presigned URL for private files
            url = s3_client.generate_presigned_url(
                'get_object',
                Params={'Bucket': bucket_name, 'Key': s3_key},
                ExpiresIn=3600  # 1 hour
            )
        
        print(f"Successfully uploaded to: {url}")
        return url
        
    except ClientError as e:
        print(f"AWS error during upload: {str(e)}")
        return None
    except Exception as e:
        print(f"Unexpected error during upload: {str(e)}")
        return None


def create_response(status_code, message, data=None):
    """
    Create a standardized HTTP response for API Gateway.
    """
    response_body = {
        "message": message,
        "statusCode": status_code
    }
    
    if data:
        response_body["data"] = data
    
    return {
        "statusCode": status_code,
        "headers": {
            "Content-Type": "application/json",
            "Access-Control-Allow-Origin": "*",  # Enable CORS
            "Access-Control-Allow-Headers": "Content-Type",
            "Access-Control-Allow-Methods": "POST, OPTIONS"
        },
        "body": json.dumps(response_body)
    }