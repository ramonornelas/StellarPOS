import json
import boto3
from botocore.exceptions import BotoCoreError, ClientError
import os
import decimal

def get_table_name(stage):
    """Get variant table name based on the stage"""
    if stage.lower() == 'test':
        return os.getenv('TEST_POS_PRODUCT_VARIANT_TABLE', 'test_POS_product_variant')
    else:
        return os.getenv('POS_PRODUCT_VARIANT_TABLE', 'POS_product_variant')

def get_product_table_name(stage):
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
    product_table_name = get_product_table_name(stage)
    variant_table = dynamodb.Table(table_name)
    product_table = dynamodb.Table(product_table_name)

    # Get product_id and variant_id from pathParameters
    product_id = None
    variant_id = None
    if 'pathParameters' in event and event['pathParameters']:
        product_id = event['pathParameters'].get('product_id')
        variant_id = event['pathParameters'].get('variant_id')
    
    if not product_id:
        return {
            'statusCode': 400,
            'body': json.dumps({'error': 'Missing required path parameter: product_id'})
        }
    
    if not variant_id:
        return {
            'statusCode': 400,
            'body': json.dumps({'error': 'Missing required path parameter: variant_id'})
        }

    # Validate product exists
    try:
        product_response = product_table.get_item(Key={'id': product_id})
        if 'Item' not in product_response:
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

    # Check if variant exists and belongs to the product
    try:
        get_response = variant_table.get_item(Key={'id': variant_id})
        if 'Item' not in get_response:
            return {
                'statusCode': 404,
                'body': json.dumps({'error': 'Variant not found'})
            }
        
        existing_variant = get_response['Item']
        if existing_variant.get('product_id') != product_id:
            return {
                'statusCode': 400,
                'body': json.dumps({'error': 'Variant does not belong to the specified product'})
            }
        
        if existing_variant.get('is_deleted', False):
            return {
                'statusCode': 404,
                'body': json.dumps({'error': 'Variant not found (already deleted)'})
            }
    except (BotoCoreError, ClientError) as error:
        print(error)
        return {
            'statusCode': 500,
            'body': json.dumps({'message': str(error)})
        }

    # Soft delete: set is_deleted = True and updated_datetime = now
    try:
        from datetime import datetime
        response = variant_table.update_item(
            Key={'id': variant_id},
            UpdateExpression="SET is_deleted = :is_deleted, updated_datetime = :updated_datetime",
            ExpressionAttributeValues={
                ':is_deleted': True,
                ':updated_datetime': datetime.now().isoformat()
            },
            ReturnValues="ALL_NEW"
        )
        updated_variant = response.get('Attributes', {})
    except (BotoCoreError, ClientError) as error:
        print(error)
        return {
            'statusCode': 500,
            'body': json.dumps({'message': str(error)})
        }

    return {
        'statusCode': 200,
        'body': json.dumps({'message': 'Variant deleted successfully', 'variant': updated_variant}, default=str)
    }