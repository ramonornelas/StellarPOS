import json
import uuid
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

    # Validate mandatory fields
    name = body.get('name')
    price = body.get('price')
    if not name or price is None:
        return {
            'statusCode': 400,
            'body': json.dumps({'error': 'Missing required fields: name and price'})
        }

    # Prepare product item with defaults
    product_id = str(uuid.uuid4())
    price_decimal = decimal.Decimal(str(price)).quantize(TWO_DECIMAL_PLACES)
    product = {
        'id': product_id,
        'name': name,
        'price': price_decimal,
        'created_datetime': get_current_datetime(),
        'updated_datetime': get_current_datetime(),
        'display_order': body.get('display_order', 999),
        'has_variants': body.get('has_variants', False),
        'is_active': body.get('is_active', True),
        'is_combo': body.get('is_combo', False),
        'stock_available': body.get('stock_available', 0),
        'image_url': body.get('image_url', ''),
        'cost': decimal.Decimal(str(body.get('cost', 0))).quantize(TWO_DECIMAL_PLACES)
    }

    # Put item in DynamoDB
    try:
        product_table.put_item(Item={k: str(v) if isinstance(v, (decimal.Decimal, uuid.UUID)) else v for k, v in product.items()})
    except (BotoCoreError, ClientError) as error:
        print(error)
        return {
            'statusCode': 500,
            'body': json.dumps({'message': str(error)})
        }

    return {
        'statusCode': 201,
        'body': json.dumps({'message': 'Product created successfully', 'product': product}, default=str)
    }

def get_current_datetime():
    import datetime
    return datetime.datetime.now().isoformat()
