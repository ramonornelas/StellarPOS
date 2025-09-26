
import json
import boto3
import os
from botocore.exceptions import BotoCoreError, ClientError
import base64
from decimal import Decimal

def get_table_names(stage):
    """Get table names based on the stage"""
    if stage and stage.lower() == 'test':
        return {
            'USER_TABLE': os.getenv('TEST_USER_TABLE', 'test_stellar_user'),
            'ROLE_TABLE': os.getenv('TEST_ROLE_TABLE', 'test_stellar_role')
        }
    else:
        return {
            'USER_TABLE': os.getenv('USER_TABLE', 'stellar_user'),
            'ROLE_TABLE': os.getenv('ROLE_TABLE', 'stellar_role')
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
        role_table = dynamodb.Table(tables['ROLE_TABLE'])

        user_id = event['pathParameters']['id']

        response = user_table.get_item(Key={'id': user_id})

        if 'Item' in response:
            user = response['Item']
            role_id = user.get('role_id')
            role_name = None
            home_screen = None
            if role_id:
                role_response = role_table.get_item(Key={'id': role_id})
                role = role_response.get('Item', {})
                role_name = role.get('name')
                home_screen = role.get('home_screen')
            user['role_name'] = role_name
            user['home_screen'] = home_screen
            return {
                'statusCode': 200,
                'body': json.dumps(user, cls=CustomJSONEncoder)
            }
        else:
            return {
                'statusCode': 404,
                'body': json.dumps({'message': 'User not found'})
            }
    except (BotoCoreError, ClientError) as error:
        print(error)
        return {
            'statusCode': 500,
            'body': json.dumps({'message': str(error)})
        }
