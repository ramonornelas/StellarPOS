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
            closeout_id = data.get('id')
            closing_amount = decimal.Decimal(str(data['closing_amount'])).quantize(TWO_DECIMAL_PLACES)
            closed_at = data['closed_at']
            status = data.get('status', 'closed')

            # Optional fields
            closed_user_id = data.get('closed_user_id', '')
            notes = data.get('notes', '')

            # New fields
            cash_sales = decimal.Decimal(str(data.get('cash_sales', 0))).quantize(TWO_DECIMAL_PLACES)

            # Fetch opening_amount from DynamoDB
            opening_amount = decimal.Decimal('0.00')
            try:
                get_response = cash_register_closeout_table.get_item(Key={'id': closeout_id})
                opening_amount = decimal.Decimal(str(get_response['Item'].get('opening_amount', '0.00'))).quantize(TWO_DECIMAL_PLACES)
            except Exception as e:
                print(f"Error fetching opening_amount: {e}")
                return {
                    'statusCode': 404,
                    'body': json.dumps({'message': 'Opening amount not found for this closeout id'})
                }

            # Calculate expected_amount and difference_amount
            expected_amount = (opening_amount + cash_sales).quantize(TWO_DECIMAL_PLACES)
            difference_amount = (closing_amount - expected_amount).quantize(TWO_DECIMAL_PLACES)

            # Update the item in DynamoDB
            update_expression = (
                "SET closing_amount = :closing_amount, "
                "closed_at = :closed_at, "
                "#s = :status, "
                "closed_user_id = :closed_user_id, "
                "notes = :notes, "
                "cash_sales = :cash_sales, "
                "expected_amount = :expected_amount, "
                "difference_amount = :difference_amount"
            )
            expression_values = {
                ':closing_amount': str(closing_amount),
                ':closed_at': closed_at,
                ':status': status,
                ':closed_user_id': closed_user_id,
                ':notes': notes,
                ':cash_sales': str(cash_sales),
                ':expected_amount': str(expected_amount),
                ':difference_amount': str(difference_amount)
            }
            expression_names = {
                '#s': 'status'
            }

            response = cash_register_closeout_table.update_item(
                Key={'id': closeout_id},
                UpdateExpression=update_expression,
                ExpressionAttributeValues=expression_values,
                ExpressionAttributeNames=expression_names,
                ReturnValues="ALL_NEW"
            )

            updated_item = response.get('Attributes', {})

            return {
                'statusCode': 200,
                'body': json.dumps(updated_item)
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