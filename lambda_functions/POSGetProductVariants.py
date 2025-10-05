import json
import boto3
from botocore.exceptions import BotoCoreError, ClientError
import base64
import os
from decimal import Decimal  # Add this import statement

def get_table_name(stage):
    """Get product variant table name based on the stage"""
    if stage.lower() == 'test':
        return os.getenv('TEST_POS_PRODUCT_VARIANT_TABLE', 'test_POS_product_variant')
    else:
        return os.getenv('POS_PRODUCT_VARIANT_TABLE', 'POS_product_variant')

dynamodb = boto3.resource('dynamodb')

class CustomJSONEncoder(json.JSONEncoder):
  def default(self, obj):
      if isinstance(obj, set):
          return list(obj)
      if isinstance(obj, boto3.dynamodb.types.Binary):
          return base64.b64encode(obj.value).decode('utf-8')
      if isinstance(obj, Decimal):  # Handle Decimal objects
          return str(obj)  # Convert Decimal to string
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
        # Filter out soft-deleted items (is_deleted = true)
        response = table.scan(
            FilterExpression="attribute_not_exists(is_deleted) OR is_deleted = :false_val",
            ExpressionAttributeValues={
                ':false_val': False
            }
        )

        users = response['Items']

        return {
            'statusCode': 200,
            'body': json.dumps(users, cls=CustomJSONEncoder)
        }
    except (BotoCoreError, ClientError) as error:
        print(error)
        return {
            'statusCode': 500,
            'body': json.dumps({'message': str(error)})
        }
