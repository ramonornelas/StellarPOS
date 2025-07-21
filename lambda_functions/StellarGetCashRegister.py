import json
import boto3
import os
from botocore.exceptions import BotoCoreError, ClientError
from decimal import Decimal

def get_table_names(stage):
    """Get table names based on the stage"""
    if stage and stage.lower() == 'test':
        return {
            'CASH_REGISTER_TABLE': os.getenv('TEST_CASH_REGISTER_TABLE', 'test_stellar_cashRegisterCloseout')
        }
    else:
        return {
            'CASH_REGISTER_TABLE': os.getenv('CASH_REGISTER_TABLE', 'stellar_cashRegisterCloseout')
        }

dynamodb = boto3.resource('dynamodb')

class CustomJSONEncoder(json.JSONEncoder):
    def default(self, obj):
        if isinstance(obj, set):
            return list(obj)
        if isinstance(obj, Decimal):
            return str(obj)
        return super().default(obj)

def lambda_handler(event, context):
    try:
        stage = event.get('requestContext', {}).get('stage', 'dev')
        tables = get_table_names(stage)
        cash_register_table = dynamodb.Table(tables['CASH_REGISTER_TABLE'])

        # Get cashRegisterId from path parameters if present
        cash_register_id = event.get('pathParameters', {}).get('cashRegisterId')

        if cash_register_id:
            response = cash_register_table.get_item(Key={'id': cash_register_id})
            item = response.get('Item')
            if item:
                # Convert Decimal values to string for JSON serialization
                for key, value in item.items():
                    if isinstance(value, Decimal):
                        item[key] = str(value)
                return {
                    'statusCode': 200,
                    'body': json.dumps(item, cls=CustomJSONEncoder)
                }
            else:
                return {
                    'statusCode': 404,
                    'body': json.dumps({'message': 'Cash register not found'})
                }
        else:
            # If no cashRegisterId provided, return all items (optional, or you can return an error)
            response = cash_register_table.scan()
            items = response.get('Items', [])
            for entry in items:
                for key, value in entry.items():
                    if isinstance(value, Decimal):
                        entry[key] = str(value)
            return {
                'statusCode': 200,
                'body': json.dumps(items, cls=CustomJSONEncoder)
            }
    except (BotoCoreError, ClientError) as error:
        print(error)
        return {
            'statusCode': 500,
            'body': json.dumps({'message': str(error)})
        }