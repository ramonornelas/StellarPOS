import json
import uuid
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

    # Parse the incoming event body
    try:
        body = json.loads(event.get('body', '{}'))
    except Exception:
        return {
            'statusCode': 400,
            'body': json.dumps({'error': 'Invalid JSON in request body'})
        }

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

    # Validate mandatory fields
    name = body.get('name')
    price = body.get('price')
    if not name or price is None:
        return {
            'statusCode': 400,
            'body': json.dumps({'error': 'Missing required fields: name and price'})
        }

    # Check for duplicate variant name within the same product
    try:
        existing_variants = variant_table.scan(
            FilterExpression='product_id = :product_id AND #n = :name AND (attribute_not_exists(is_deleted) OR is_deleted = :is_deleted)',
            ExpressionAttributeNames={'#n': 'name'},
            ExpressionAttributeValues={
                ':product_id': product_id,
                ':name': name,
                ':is_deleted': False
            }
        )
        if existing_variants['Items']:
            return {
                'statusCode': 400,
                'body': json.dumps({'error': 'A variant with this name already exists for this product'})
            }
    except (BotoCoreError, ClientError) as error:
        print(error)
        return {
            'statusCode': 500,
            'body': json.dumps({'message': str(error)})
        }

    # Prepare variant item with defaults
    variant_id = str(uuid.uuid4())
    price_decimal = decimal.Decimal(str(price)).quantize(TWO_DECIMAL_PLACES)
    variant = {
        'id': variant_id,
        'product_id': product_id,
        'name': name,
        'price': price_decimal,
        'stock_available': body.get('stock_available', 0),
        'active': body.get('active', True),
        'display_order': body.get('display_order', 1),
        'created_datetime': get_current_datetime(),
        'updated_datetime': get_current_datetime(),
        'updated_user_id': body.get('updated_user_id', ''),
        'is_deleted': False
    }

    # Put item in DynamoDB
    try:
        variant_table.put_item(Item={k: str(v) if isinstance(v, (decimal.Decimal, uuid.UUID)) else v for k, v in variant.items()})
    except (BotoCoreError, ClientError) as error:
        print(error)
        return {
            'statusCode': 500,
            'body': json.dumps({'message': str(error)})
        }

    return {
        'statusCode': 201,
        'body': json.dumps({'message': 'Variant created successfully', 'variant': variant}, default=str)
    }

def get_current_datetime():
    import datetime
    return datetime.datetime.now().isoformat()