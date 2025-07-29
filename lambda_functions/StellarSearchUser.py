import json
import boto3
import os
from botocore.exceptions import BotoCoreError, ClientError
from boto3.dynamodb.conditions import Key
import base64
from decimal import Decimal

def get_table_names(stage):
    """Get table names based on the stage"""
    if stage and stage.lower() == 'test':
        return {
            'USER_TABLE': os.getenv('TEST_USER_TABLE', 'test_stellar_user')
        }
    else:
        return {
            'USER_TABLE': os.getenv('USER_TABLE', 'stellar_user')
        }

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
  try:
    stage = event.get('requestContext', {}).get('stage', 'dev')
    tables = get_table_names(stage)
    user_table = dynamodb.Table(tables['USER_TABLE'])

    request_body = json.loads(event['body'])
    username = request_body.get('username')

    filters = []
    if username:
      filters.append(Key('username').eq(username))

    filter_expression = None
    if filters:
      filter_expression = filters[0]
      for filter in filters[1:]:
        filter_expression = filter_expression & filter

    response = user_table.scan(FilterExpression=filter_expression)

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
