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
    if 'pathParameters' in event and event['pathParameters'] and 'id' in event['pathParameters']:
        product_id = event['pathParameters']['id']
    if not product_id:
        return {
            'statusCode': 400,
            'body': json.dumps({'error': 'Missing required path parameter: id'})
        }

    # Validate mandatory fields (name and price)
    name = body.get('name')
    price = body.get('price')
    if not name or price is None:
        return {
            'statusCode': 400,
            'body': json.dumps({'error': 'Missing required fields: name and price'})
        }

    price_decimal = decimal.Decimal(str(price)).quantize(TWO_DECIMAL_PLACES)
    updated_fields = {
        'name': name,
        'price': price_decimal,
        'display_order': body.get('display_order', 999),
        'has_variants': body.get('has_variants', False),
        'is_active': body.get('is_active', True),
        'is_combo': body.get('is_combo', False),
        'stock_available': body.get('stock_available', 0),
        'image_url': body.get('image_url', ''),
        'cost': decimal.Decimal(str(body.get('cost', 0))).quantize(TWO_DECIMAL_PLACES),
        'updated_datetime': get_current_datetime()
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

    # Update item in DynamoDB
    try:
        update_expr = "SET " + ", ".join([
            f"#n = :name",
            "price = :price",
            "display_order = :display_order",
            "has_variants = :has_variants",
            "is_active = :is_active",
            "is_combo = :is_combo",
            "stock_available = :stock_available",
            "image_url = :image_url",
            "cost = :cost",
            "updated_datetime = :updated_datetime"
        ])
        expr_attr_names = {'#n': 'name'}
        expr_attr_values = {
            ':name': name,
            ':price': str(price_decimal),
            ':display_order': updated_fields['display_order'],
            ':has_variants': updated_fields['has_variants'],
            ':is_active': updated_fields['is_active'],
            ':is_combo': updated_fields['is_combo'],
            ':stock_available': updated_fields['stock_available'],
            ':image_url': updated_fields['image_url'],
            ':cost': str(updated_fields['cost']),
            ':updated_datetime': updated_fields['updated_datetime']
        }
        response = product_table.update_item(
            Key={'id': product_id},
            UpdateExpression=update_expr,
            ExpressionAttributeNames=expr_attr_names,
            ExpressionAttributeValues=expr_attr_values,
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
        'body': json.dumps({'message': 'Product updated successfully', 'product': updated_product}, default=str)
    }

def get_current_datetime():
    import datetime
    return datetime.datetime.now().isoformat()
