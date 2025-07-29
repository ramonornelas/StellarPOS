import json
import boto3
import os
from botocore.exceptions import BotoCoreError, ClientError
from boto3.dynamodb.conditions import Key

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
kms = boto3.client('kms')
cmk_key_id = 'arn:aws:kms:us-west-1:325099253927:key/11f057ae-d34e-458a-be4f-ea924ce6959a'

def lambda_handler(event, context):
    try:
        stage = event.get('requestContext', {}).get('stage', 'dev')
        tables = get_table_names(stage)
        user_table = dynamodb.Table(tables['USER_TABLE'])

        login_data = json.loads(event['body'])
        username = login_data['username']
        password = login_data['password']

        user = get_user_by_username(username, user_table)
        if not user:
            return {
                'statusCode': 401,
                'body': json.dumps({'message': 'Invalid username or password'})
            }

        if verify_password(password, user['password']):
            return {
                'statusCode': 200,
                'body': json.dumps({'message': 'Login successful'})
            }
        else:
            return {
                'statusCode': 401,
                'body': json.dumps({'message': 'Invalid username or password'})
            }

    except (BotoCoreError, ClientError) as error:
        print(error)
        return {
            'statusCode': 500,
            'body': json.dumps({'message': str(error)})
        }

def get_user_by_username(username, user_table):
    response = user_table.scan(
        FilterExpression=Key('username').eq(username)
    )
    items = response['Items']
    if items:
        return items[0]
    return None

def verify_password(password, encrypted_password):
    try:
        response = kms.decrypt(CiphertextBlob=bytes(encrypted_password))
        decrypted_password = response['Plaintext'].decode('utf-8')
        return password == decrypted_password
    except (BotoCoreError, ClientError) as error:
        print("Error decrypting password:", error)
        raise Exception("Failed to verify password")
