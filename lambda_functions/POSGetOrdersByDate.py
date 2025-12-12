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
            'ORDER_TICKET_TABLE': os.getenv('TEST_ORDER_TICKET_TABLE', 'test_POS_orderTicket'),
            'ORDER_PRODUCT_TABLE': os.getenv('TEST_ORDER_PRODUCT_TABLE', 'test_POS_orderProduct'),
            'SPLIT_PAYMENT_TABLE': os.getenv('TEST_SPLIT_PAYMENT_TABLE', 'test_POS_orderSplitPayment')
        }
    else:
        return {
            'ORDER_TICKET_TABLE': os.getenv('ORDER_TICKET_TABLE', 'POS_orderTicket'),
            'ORDER_PRODUCT_TABLE': os.getenv('ORDER_PRODUCT_TABLE', 'POS_orderProduct'),
            'SPLIT_PAYMENT_TABLE': os.getenv('SPLIT_PAYMENT_TABLE', 'POS_orderSplitPayment')
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
        order_ticket_table = dynamodb.Table(tables['ORDER_TICKET_TABLE'])
        order_product_table = dynamodb.Table(tables['ORDER_PRODUCT_TABLE'])
        order_split_payment_table = dynamodb.Table(tables['SPLIT_PAYMENT_TABLE'])

        filter_expression = Attr('date').eq(date_to_search)
        response = order_ticket_table.scan(FilterExpression=filter_expression)

        if 'Items' in response and response['Items']:
            orders = response['Items']
            for order in orders:
                order_id = order['id']
                products_response = order_product_table.scan(
                    FilterExpression=Attr('orderTicket_id').eq(order_id)
                )
                if 'Items' in products_response and products_response['Items']:
                    products = products_response['Items']
                    
                    # Add is_returned flag to each product
                    returned_count = 0
                    for product in products:
                        # A product is returned if it has a returnTicket_id
                        product['is_returned'] = bool(product.get('returnTicket_id'))
                        if product['is_returned']:
                            returned_count += 1
                    
                    order['products'] = products
                    
                    # Calculate is_return_status based on returned products
                    total_products = len(products)
                    if returned_count == 0:
                        order['is_return_status'] = 'none'
                    elif returned_count == total_products:
                        order['is_return_status'] = 'total'
                    else:
                        order['is_return_status'] = 'partial'
                else:
                    order['products'] = []
                    order['is_return_status'] = 'none'
                    
                split_payment_response = order_split_payment_table.scan(
                    FilterExpression=Attr('orderTicket_id').eq(order_id)
                )
                if 'Items' in split_payment_response and split_payment_response['Items']:
                    order['splitPayments'] = split_payment_response['Items']
                else:
                    order['splitPayments'] = []

            return {
                'statusCode': 200,
                'body': json.dumps(orders, cls=CustomJSONEncoder)
            }
        else:
            return {
                'statusCode': 404,
                'body': json.dumps({'message': 'Orders not found'})
            }
    except (BotoCoreError, ClientError) as error:
        print(error)
        return {
            'statusCode': 500,
            'body': json.dumps({'message': str(error)})
        }
