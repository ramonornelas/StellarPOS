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
            'ORDER_PRODUCT_TABLE': os.getenv('TEST_ORDER_PRODUCT_TABLE', 'test_POS_orderProduct')
        }
    else:
        return {
            'RETURN_TICKET_TABLE': os.getenv('RETURN_TICKET_TABLE', 'POS_returnTicket'),
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
        order_product_table = dynamodb.Table(tables['ORDER_PRODUCT_TABLE'])

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
                order_id = return_ticket.get('order_id')
                
                # Rename total_amount to refund_amount
                if 'total_amount' in return_ticket:
                    return_ticket['refund_amount'] = return_ticket.pop('total_amount')
                
                # Extract date from created_datetime (YYYY-MM-DD format)
                if 'created_datetime' in return_ticket:
                    return_ticket['date'] = return_ticket['created_datetime'].split('T')[0]
                
                # Get ALL products from the original order
                all_products = []
                if order_id:
                    all_products_response = order_product_table.scan(
                        FilterExpression=Attr('orderTicket_id').eq(order_id)
                    )
                    all_products = all_products_response.get('Items', [])
                
                # Mark which products were returned
                for product in all_products:
                    # A product is returned if it has any returnTicket_id
                    # (could be from this return or a different return)
                    product['is_returned'] = bool(product.get('returnTicket_id'))
                
                return_ticket['products'] = all_products

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
