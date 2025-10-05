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

    # Parse the incoming event body
    try:
        body = json.loads(event.get('body', '{}'))
    except Exception:
        return {
            'statusCode': 400,
            'body': json.dumps({'error': 'Invalid JSON in request body'})
        }

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

    # Validate mandatory fields (name and price)
    name = body.get('name')
    price = body.get('price')
    if not name or price is None:
        return {
            'statusCode': 400,
            'body': json.dumps({'error': 'Missing required fields: name and price'})
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
                'body': json.dumps({'error': 'Variant not found (deleted)'})
            }
    except (BotoCoreError, ClientError) as error:
        print(error)
        return {
            'statusCode': 500,
            'body': json.dumps({'message': str(error)})
        }

    # Check for duplicate variant name within the same product (excluding current variant)
    try:
        existing_variants = variant_table.scan(
            FilterExpression='product_id = :product_id AND #n = :name AND id <> :variant_id AND (attribute_not_exists(is_deleted) OR is_deleted = :is_deleted)',
            ExpressionAttributeNames={'#n': 'name'},
            ExpressionAttributeValues={
                ':product_id': product_id,
                ':name': name,
                ':variant_id': variant_id,
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

    price_decimal = decimal.Decimal(str(price)).quantize(TWO_DECIMAL_PLACES)
    updated_fields = {
        'name': name,
        'price': price_decimal,
        'stock_available': body.get('stock_available', existing_variant.get('stock_available', 0)),
        'active': body.get('active', existing_variant.get('active', True)),
        'display_order': body.get('display_order', existing_variant.get('display_order', 1)),
        'updated_datetime': get_current_datetime(),
        'updated_user_id': body.get('updated_user_id', '')
    }

    # Update item in DynamoDB
    try:
        update_expr = "SET " + ", ".join([
            f"#n = :name",
            "price = :price",
            "stock_available = :stock_available",
            "active = :active",
            "display_order = :display_order",
            "updated_datetime = :updated_datetime",
            "updated_user_id = :updated_user_id"
        ])
        expr_attr_names = {'#n': 'name'}
        expr_attr_values = {
            ':name': name,
            ':price': str(price_decimal),
            ':stock_available': updated_fields['stock_available'],
            ':active': updated_fields['active'],
            ':display_order': updated_fields['display_order'],
            ':updated_datetime': updated_fields['updated_datetime'],
            ':updated_user_id': updated_fields['updated_user_id']
        }
        response = variant_table.update_item(
            Key={'id': variant_id},
            UpdateExpression=update_expr,
            ExpressionAttributeNames=expr_attr_names,
            ExpressionAttributeValues=expr_attr_values,
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
        'body': json.dumps({'message': 'Variant updated successfully', 'variant': updated_variant}, default=str)
    }

def get_current_datetime():
    import datetime
    return datetime.datetime.now().isoformat()