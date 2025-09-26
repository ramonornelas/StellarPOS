import json
import boto3
from botocore.exceptions import BotoCoreError, ClientError
import os
import base64
from decimal import Decimal

def get_table_name(stage):
    """Get product table name based on the stage"""
    if stage and stage.lower() == 'test':
        return os.getenv('TEST_POS_PRODUCT_TABLE', 'test_POS_product')
    else:
        return os.getenv('POS_PRODUCT_TABLE', 'POS_product')

dynamodb = boto3.resource('dynamodb')

class CustomJSONEncoder(json.JSONEncoder):
    def default(self, obj):
        if isinstance(obj, set):
            return list(obj)
        if isinstance(obj, boto3.dynamodb.types.Binary):
            return base64.b64encode(obj.value).decode('utf-8')
        if isinstance(obj, Decimal):
            return str(obj)
        return super().default(obj)

def lambda_handler(event, context):
    # Detect stage from API Gateway event
    stage = 'prod'  # default
    if 'requestContext' in event and 'stage' in event['requestContext']:
        stage = event['requestContext']['stage']
        if stage == '$default':
            stage = 'prod'

    table_name = get_table_name(stage)
    table = dynamodb.Table(table_name)

    try:
        response = table.scan()
        products = response['Items']
        # Filter out products where is_deleted is True
        filtered_products = [p for p in products if not p.get('is_deleted', False)]
        return {
            'statusCode': 200,
            'body': json.dumps(filtered_products, cls=CustomJSONEncoder)
        }
    except (BotoCoreError, ClientError) as error:
        print(error)
        return {
            'statusCode': 500,
            'body': json.dumps({'message': str(error)})
        }