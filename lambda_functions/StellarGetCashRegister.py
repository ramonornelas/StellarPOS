import json
import boto3
from botocore.exceptions import BotoCoreError, ClientError
from decimal import Decimal

dynamodb = boto3.resource('dynamodb')
cash_register_table = dynamodb.Table('stellar_cashRegisterCloseout')

class CustomJSONEncoder(json.JSONEncoder):
    def default(self, obj):
        if isinstance(obj, set):
            return list(obj)
        if isinstance(obj, Decimal):
            return str(obj)
        return super().default(obj)

def lambda_handler(event, context):
    try:
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