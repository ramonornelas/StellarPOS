import json
import uuid
import boto3
from botocore.exceptions import BotoCoreError, ClientError
import datetime

dynamodb = boto3.resource('dynamodb')
category_table = dynamodb.Table('POS_category')

def lambda_handler(event, context):
    try:
        if 'body' in event:
            categories = json.loads(event['body'])

            # Save each category in the table
            for category in categories:
                new_category = {
                    'id': str(uuid.uuid4()),
                    'name': category['name'],
                    'display_order': category.get('display_order', 0),
                    'created_datetime': get_current_datetime(),
                    'updated_datetime': get_current_datetime()
                }
                category_table.put_item(Item=new_category)

            return {
                'statusCode': 201,
                'body': json.dumps({'message': 'Categories uploaded successfully'})
            }
        else:
            return {
                'statusCode': 400,
                'body': json.dumps('Bad Request: Missing body in event')
            }
    except (BotoCoreError, ClientError) as error:
        print(error)
        return {
            'statusCode': 500,
            'body': json.dumps({'message': str(error)})
        }

def get_current_datetime():
    return datetime.datetime.now().isoformat()