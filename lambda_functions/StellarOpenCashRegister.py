import json
import uuid
import boto3
from botocore.exceptions import BotoCoreError, ClientError
import datetime
import decimal

dynamodb = boto3.resource('dynamodb')
cash_register_closeout_table = dynamodb.Table('stellar_cashRegisterCloseout')

TWO_DECIMAL_PLACES = decimal.Decimal('0.01')

def lambda_handler(event, context):
    try:
        if 'body' in event:
            data = json.loads(event['body'])

            # Required fields
            opening_amount = decimal.Decimal(str(data['opening_amount'])).quantize(TWO_DECIMAL_PLACES)
            opened_at = data['opened_at']
            status = data.get('status', 'open')

            # Optional fields
            opened_user_id = data.get('opened_user_id', '')
            date = data.get('date', opened_at[:10])  # Use date from opened_at if not provided
            notes = data.get('notes', '')

            # Prepare the item for DynamoDB
            closeout_id = str(uuid.uuid4())
            item = {
                'id': closeout_id,
                'date': date,
                'opened_at': opened_at,
                'opening_amount': str(opening_amount),
                'status': status,
                'opened_user_id': opened_user_id,
                'notes': notes
            }

            cash_register_closeout_table.put_item(Item=item)

            return {
                'statusCode': 201,
                'body': json.dumps(item)
            }
        else:
            return {
                'statusCode': 400,
                'body': json.dumps('Bad Request: Missing body in event')
            }
    except (BotoCoreError, ClientError, Exception) as error:
        print(error)
        return {
            'statusCode': 500,
            'body': json.dumps({'message': str(error)})
        }