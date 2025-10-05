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

    # Get product_id from pathParameters
    product_id = None
    if 'pathParameters' in event and event['pathParameters'] and 'product_id' in event['pathParameters']:
        product_id = event['pathParameters']['product_id']
    if not product_id:
        return {
            'statusCode': 400,
            'body': json.dumps({'error': 'Missing required path parameter: product_id'})
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

    # Get all variants for the product (excluding deleted ones)
    try:
        response = variant_table.scan(
            FilterExpression='product_id = :product_id AND (attribute_not_exists(is_deleted) OR is_deleted = :is_deleted)',
            ExpressionAttributeValues={
                ':product_id': product_id,
                ':is_deleted': False
            }
        )
        variants = response.get('Items', [])
        
        # Sort variants by display_order and then by name
        variants.sort(key=lambda x: (x.get('display_order', 999), x.get('name', '')))
        
        # Convert Decimal types to float for JSON serialization
        for variant in variants:
            if 'price' in variant and isinstance(variant['price'], decimal.Decimal):
                variant['price'] = float(variant['price'])
        
    except (BotoCoreError, ClientError) as error:
        print(error)
        return {
            'statusCode': 500,
            'body': json.dumps({'message': str(error)})
        }

    return {
        'statusCode': 200,
        'body': json.dumps({
            'message': 'Variants retrieved successfully',
            'product_id': product_id,
            'variants': variants,
            'count': len(variants)
        }, default=str)
    }