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
        # Use #st in the entire expression to avoid conflict with reserved keyword
        response = cash_register_table.scan(
            FilterExpression="attribute_exists(#st) AND #st = :open",
            ExpressionAttributeNames={"#st": "status"},
            ExpressionAttributeValues={":open": "open"}
        )
        items = response.get('Items', [])
        if items:
            open_register = items[0]
            for key, value in open_register.items():
                if isinstance(value, Decimal):
                    open_register[key] = str(value)
            return {
                'statusCode': 200,
                'body': json.dumps(open_register, cls=CustomJSONEncoder)
            }
        else:
            return {
                'statusCode': 200,
                'body': json.dumps(None)
            }
    except (BotoCoreError, ClientError) as error:
        print(error)
        return {
            'statusCode': 500,
            'body': json.dumps({'message': str(error)})
        }