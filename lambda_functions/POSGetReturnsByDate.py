"""
AWS Lambda function for retrieving returns for a specific date.

Endpoint:
- GET /returns/{date} - Get returns for a specific date

Returns all returns for the specified date.
"""

import json
import boto3
import os
from botocore.exceptions import BotoCoreError, ClientError
from decimal import Decimal
from boto3.dynamodb.conditions import Attr



def get_table_names(stage):
    """Get table names based on the stage"""
    if stage.lower() == 'test':
        return {
            'RETURN_TICKET_TABLE': os.getenv('TEST_RETURN_TICKET_TABLE', 'test_POS_returnTicket'),
            'RETURN_PRODUCT_TABLE': os.getenv('TEST_RETURN_PRODUCT_TABLE', 'test_POS_returnProduct'),
            'ORDER_PRODUCT_TABLE': os.getenv('TEST_ORDER_PRODUCT_TABLE', 'test_POS_orderProduct')
        }
    else:
        return {
            'RETURN_TICKET_TABLE': os.getenv('RETURN_TICKET_TABLE', 'POS_returnTicket'),
            'RETURN_PRODUCT_TABLE': os.getenv('RETURN_PRODUCT_TABLE', 'POS_returnProduct'),
            'ORDER_PRODUCT_TABLE': os.getenv('ORDER_PRODUCT_TABLE', 'POS_orderProduct')
        }

dynamodb = boto3.resource('dynamodb')

class CustomJSONEncoder(json.JSONEncoder):
  def default(self, obj):
      if isinstance(obj, set):
          return list(obj)
      if isinstance(obj, Decimal):  # Handle Decimal objects
          return str(obj)  # Convert Decimal to string
      return super().default(obj)

def lambda_handler(event, context):
    try:
        date_to_search = event['pathParameters']['date']
        stage = event.get('requestContext', {}).get('stage', 'dev')
        tables = get_table_names(stage)
        return_ticket_table = dynamodb.Table(tables['RETURN_TICKET_TABLE'])
        return_product_table = dynamodb.Table(tables['RETURN_PRODUCT_TABLE'])

        # Query using created_datetime with begins_with to match the date
        # This matches the pattern used in POSGetReturnsSummary.py
        response = return_ticket_table.scan(
            FilterExpression='begins_with(created_datetime, :target_date)',
            ExpressionAttributeValues={
                ':target_date': date_to_search
            }
        )

        if 'Items' in response and response['Items']:
            returns = response['Items']
            for return_ticket in returns:
                return_id = return_ticket['id']
                
                # Rename total_amount to refund_amount
                if 'total_amount' in return_ticket:
                    return_ticket['refund_amount'] = return_ticket.pop('total_amount')
                
                # Extract date from created_datetime (YYYY-MM-DD format)
                if 'created_datetime' in return_ticket:
                    return_ticket['date'] = return_ticket['created_datetime'].split('T')[0]
                
                # Get products from POS_returnProduct table for this return ticket
                products_response = return_product_table.scan(
                    FilterExpression=Attr('returnTicket_id').eq(return_id)
                )
                
                products = products_response.get('Items', [])
                
                # Clean up product fields - only include required fields
                clean_products = []
                for product in products:
                    clean_product = {
                        'quantity': product.get('quantity'),
                        'product_name': product.get('product_name'),
                        'product_price': product.get('product_price'),
                        'total': product.get('total'),
                        'product_id': product.get('product_id')
                    }
                    clean_products.append(clean_product)
                
                return_ticket['products'] = clean_products

            return {
                'statusCode': 200,
                'body': json.dumps(returns, cls=CustomJSONEncoder)
            }
        else:
            return {
                'statusCode': 404,
                'body': json.dumps({'message': 'Returns not found'})
            }
    except (BotoCoreError, ClientError) as error:
        print(error)
        return {
            'statusCode': 500,
            'body': json.dumps({'message': str(error)})
        }
