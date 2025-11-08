import json
import uuid
import boto3
import os
from botocore.exceptions import BotoCoreError, ClientError
import datetime
import decimal

def get_table_names(stage):
    """Get table names based on the stage"""
    if stage and stage.lower() == 'test':
        return {
            'CASH_REGISTER_CLOSEOUT_TABLE': os.getenv('TEST_CASH_REGISTER_CLOSEOUT_TABLE', 'test_stellar_cashRegisterCloseout'),
            'RETURN_TICKET_TABLE': os.getenv('TEST_POS_RETURN_TICKET_TABLE', 'test_POS_returnTicket')
        }
    else:
        return {
            'CASH_REGISTER_CLOSEOUT_TABLE': os.getenv('CASH_REGISTER_CLOSEOUT_TABLE', 'stellar_cashRegisterCloseout'),
            'RETURN_TICKET_TABLE': os.getenv('POS_RETURN_TICKET_TABLE', 'POS_returnTicket')
        }

dynamodb = boto3.resource('dynamodb')

TWO_DECIMAL_PLACES = decimal.Decimal('0.01')

def get_cash_returns(return_ticket_table, cash_register_id):
    """
    Get all cash returns for a specific cash register
    Returns the total amount of cash returns
    """
    try:
        # Scan the return ticket table for cash returns associated with this cash register
        response = return_ticket_table.scan(
            FilterExpression='cash_register_id = :cash_register_id AND refund_method = :refund_method',
            ExpressionAttributeValues={
                ':cash_register_id': cash_register_id,
                ':refund_method': 'cash'
            }
        )
        
        returns = response.get('Items', [])
        
        # Handle pagination
        while 'LastEvaluatedKey' in response:
            response = return_ticket_table.scan(
                FilterExpression='cash_register_id = :cash_register_id AND refund_method = :refund_method',
                ExpressionAttributeValues={
                    ':cash_register_id': cash_register_id,
                    ':refund_method': 'cash'
                },
                ExclusiveStartKey=response['LastEvaluatedKey']
            )
            returns.extend(response.get('Items', []))
        
        # Calculate total cash returns
        total_cash_returns = decimal.Decimal('0.00')
        for return_item in returns:
            total_amount = return_item.get('total_amount', 0)
            if total_amount:
                total_cash_returns += decimal.Decimal(str(total_amount))
        
        return total_cash_returns.quantize(TWO_DECIMAL_PLACES)
        
    except Exception as e:
        print(f"Error getting cash returns for cash register {cash_register_id}: {str(e)}")
        return decimal.Decimal('0.00').quantize(TWO_DECIMAL_PLACES)

def lambda_handler(event, context):
    try:
        stage = event.get('requestContext', {}).get('stage', 'dev')
        tables = get_table_names(stage)
        cash_register_closeout_table = dynamodb.Table(tables['CASH_REGISTER_CLOSEOUT_TABLE'])
        return_ticket_table = dynamodb.Table(tables['RETURN_TICKET_TABLE'])

        if 'body' in event:
            data = json.loads(event['body'])

            # Required fields
            cash_register_id = data.get('id')
            closing_amount = decimal.Decimal(str(data['closing_amount'])).quantize(TWO_DECIMAL_PLACES)
            closed_at = data['closed_at']
            status = data.get('status', 'closed')

            # Validate required fields
            if not cash_register_id:
                return {
                    'statusCode': 400,
                    'body': json.dumps({'message': 'cash_register_id is required'})
                }

            # Optional fields
            closed_user_id = data.get('closed_user_id', '')
            notes = data.get('notes', '')

            # New fields
            cash_sales = decimal.Decimal(str(data.get('cash_sales', 0))).quantize(TWO_DECIMAL_PLACES)

            # Fetch opening_amount from DynamoDB
            opening_amount = decimal.Decimal('0.00')
            try:
                get_response = cash_register_closeout_table.get_item(Key={'id': cash_register_id})
                opening_amount = decimal.Decimal(str(get_response['Item'].get('opening_amount', '0.00'))).quantize(TWO_DECIMAL_PLACES)
            except Exception as e:
                print(f"Error fetching opening_amount: {e}")
                return {
                    'statusCode': 404,
                    'body': json.dumps({'message': 'Opening amount not found for this closeout id'})
                }

            # Get cash returns for this cash register
            cash_returns = get_cash_returns(return_ticket_table, cash_register_id)

            # Calculate expected_amount with new formula: opening_amount + cash_sales - cash_returns
            expected_amount = (opening_amount + cash_sales - cash_returns).quantize(TWO_DECIMAL_PLACES)
            difference_amount = (closing_amount - expected_amount).quantize(TWO_DECIMAL_PLACES)

            # Update the item in DynamoDB
            update_expression = (
                "SET closing_amount = :closing_amount, "
                "closed_at = :closed_at, "
                "#s = :status, "
                "closed_user_id = :closed_user_id, "
                "notes = :notes, "
                "cash_sales = :cash_sales, "
                "cash_returns = :cash_returns, "
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
                ':cash_returns': str(cash_returns),
                ':expected_amount': str(expected_amount),
                ':difference_amount': str(difference_amount)
            }
            expression_names = {
                '#s': 'status'
            }

            response = cash_register_closeout_table.update_item(
                Key={'id': cash_register_id},
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