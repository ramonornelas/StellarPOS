import json
import boto3
from botocore.exceptions import BotoCoreError, ClientError
from decimal import Decimal
from boto3.dynamodb.conditions import Attr

dynamodb = boto3.resource('dynamodb')
order_ticket_table = dynamodb.Table('POS_orderTicket')
order_product_table = dynamodb.Table('POS_orderProduct')
order_split_payment_table = dynamodb.Table('POS_orderSplitPayment')

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
                    order['products'] = products_response['Items']
                else:
                    order['products'] = []
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
