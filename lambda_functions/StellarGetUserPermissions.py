import json
import boto3
from botocore.exceptions import BotoCoreError, ClientError
from decimal import Decimal
from boto3.dynamodb.conditions import Key

dynamodb = boto3.resource('dynamodb')
user_table = dynamodb.Table('stellar_user')
role_table = dynamodb.Table('stellar_role')
permissions_table = dynamodb.Table('stellar_permission')
access_control_table = dynamodb.Table('stellar_access_control')

class CustomJSONEncoder(json.JSONEncoder):
    def default(self, obj):
        if isinstance(obj, set):
            return list(obj)
        if isinstance(obj, Decimal):
            return str(obj)
        return super().default(obj)

def lambda_handler(event, context):
    try:
        user_id = event['pathParameters']['userId']

        # 1. Get the user and their role
        user_response = user_table.get_item(Key={'id': user_id})
        if 'Item' not in user_response:
            return {
                'statusCode': 404,
                'body': json.dumps({'message': 'User not found'})
            }
        user = user_response['Item']
        role_id = user.get('role_id')
        if not role_id:
            return {
                'statusCode': 404,
                'body': json.dumps({'message': 'User has no role assigned'})
            }

        # 2. Get the permissions associated with the role in stellar_access_control
        access_response = access_control_table.query(
            IndexName='role_id-index',
            KeyConditionExpression=Key('role_id').eq(role_id)
        )
        # Only include permissions where allowed is True
        permission_ids = [
            item['permission_id']
            for item in access_response.get('Items', [])
            if item.get('allowed') is True or item.get('allowed') == 1
        ]

        if not permission_ids:
            return {
                'statusCode': 200,
                'body': json.dumps([], cls=CustomJSONEncoder)
            }

        # 3. Get the details of the permissions
        permissions = []
        for pid in permission_ids:
            perm_response = permissions_table.get_item(Key={'id': pid})
            if 'Item' in perm_response:
                permissions.append(perm_response['Item'])

        return {
            'statusCode': 200,
            'body': json.dumps(permissions, cls=CustomJSONEncoder)
        }

    except (BotoCoreError, ClientError) as error:
        print(error)
        return {
            'statusCode': 500,
            'body': json.dumps({'message': str(error)})
        }
