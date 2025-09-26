import json
import boto3
from botocore.exceptions import BotoCoreError, ClientError
import os
import decimal

def get_table_name(stage):
    """Get product table name based on the stage"""
    if stage.lower() == 'test':
        return os.getenv('TEST_POS_PRODUCT_TABLE', 'test_POS_product')
    else:
        return os.getenv('POS_PRODUCT_TABLE', 'POS_product')

dynamodb = boto3.resource('dynamodb')
TWO_DECIMAL_PLACES = decimal.Decimal('0.01')

def lambda_handler(event, context):
    # Detect stage from API Gateway event
    stage = 'prod'  # default
    if 'requestContext' in event and 'stage' in event['requestContext']:
        stage = event['requestContext']['stage']
        if stage == '$default':
            stage = 'prod'

    table_name = get_table_name(stage)
    product_table = dynamodb.Table(table_name)

    # Get product_id from pathParameters
    product_id = None
    if 'pathParameters' in event and event['pathParameters'] and 'id' in event['pathParameters']:
        product_id = event['pathParameters']['id']
    if not product_id:
        return {
            'statusCode': 400,
            'body': json.dumps({'error': 'Missing required path parameter: id'})
        }

    # Check if product exists
    try:
        get_response = product_table.get_item(Key={'id': product_id})
        if 'Item' not in get_response:
            return {
                'statusCode': 404,
                'body': json.dumps({'error': 'Product not found'})
            }
    except (BotoCoreError, ClientError) as error:
        print(error)
        return {
            'statusCode': 500,
            'body': json.dumps({'message': str(error)})
        }

    # Soft delete: set is_deleted = True and deleted_at = now
    try:
        from datetime import datetime
        response = product_table.update_item(
            Key={'id': product_id},
            UpdateExpression="SET is_deleted = :is_deleted, deleted_at = :deleted_at, updated_datetime = :updated_datetime",
            ExpressionAttributeValues={
                ':is_deleted': True,
                ':deleted_at': datetime.now().isoformat(),
                ':updated_datetime': datetime.now().isoformat()
            },
            ReturnValues="ALL_NEW"
        )
        updated_product = response.get('Attributes', {})
    except (BotoCoreError, ClientError) as error:
        print(error)
        return {
            'statusCode': 500,
            'body': json.dumps({'message': str(error)})
        }

    return {
        'statusCode': 200,
        'body': json.dumps({'message': 'Product soft-deleted successfully', 'product': updated_product}, default=str)
    }
