import json
import uuid
import boto3
import os
from botocore.exceptions import BotoCoreError, ClientError

dynamodb = boto3.resource('dynamodb')
kms = boto3.client('kms')
cmk_key_id = 'arn:aws:kms:us-west-1:325099253927:key/11f057ae-d34e-458a-be4f-ea924ce6959a'

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

        user = json.loads(event['body'])
        password = user['password']

        encrypted_password = encrypt_password(password)

        new_user = user.copy()
        new_user['id'] = str(uuid.uuid4())
        new_user['password'] = encrypted_password

        user_table.put_item(Item=new_user)

        return {
            'statusCode': 201,
            'body': json.dumps(new_user, default=str)
        }
    except (BotoCoreError, ClientError) as error:
        print(error)
        return {
            'statusCode': 500,
            'body': json.dumps({'message': str(error)})
        }

def encrypt_password(password):
    try:
        response = kms.encrypt(
            KeyId=cmk_key_id,
            Plaintext=password.encode('utf-8')
        )
        encrypted_password = response['CiphertextBlob']
        return encrypted_password
    except (BotoCoreError, ClientError) as error:
        print("Error encrypting password:", error)
        raise Exception("Failed to encrypt password")
