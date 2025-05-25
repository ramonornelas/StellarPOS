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
        cash_register_id = event['pathParameters']['cashRegisterId']

        filter_expression = Attr('cash_register_id').eq(cash_register_id)

        response = order_ticket_table.scan(FilterExpression=filter_expression)

        if 'Items' in response and response['Items']:
            orders = response['Items']
            total_sales = Decimal('0')
            total_products = 0
            total_split_payments = 0
            payment_method_totals = {}

            for order in orders:
                order_id = order['id']

                # Sum order total (assuming 'total' field exists in order)
                order_total = Decimal(str(order.get('total', '0')))
                total_sales += order_total

                # Count products
                products_response = order_product_table.scan(
                    FilterExpression=Attr('orderTicket_id').eq(order_id)
                )
                if 'Items' in products_response and products_response['Items']:
                    total_products += len(products_response['Items'])

                # Check for split payments
                split_payment_response = order_split_payment_table.scan(
                    FilterExpression=Attr('orderTicket_id').eq(order_id)
                )
                split_payments = split_payment_response.get('Items', [])
                if split_payments:
                    total_split_payments += len(split_payments)
                    for sp in split_payments:
                        method = sp.get('payment_method', 'Unknown')
                        amount = Decimal(str(sp.get('amount', '0')))
                        if method not in payment_method_totals:
                            payment_method_totals[method] = Decimal('0')
                        payment_method_totals[method] += amount
                else:
                    # No split payments, use order's paymentMethod
                    method = order.get('payment_method', 'Unknown')
                    if method not in payment_method_totals:
                        payment_method_totals[method] = Decimal('0')
                    payment_method_totals[method] += order_total

            # Convert Decimal values to string for JSON serialization
            payment_method_totals = {k: str(v) for k, v in payment_method_totals.items()}

            totals = {
                'totalSales': str(total_sales),
                'totalProducts': total_products,
                'totalSplitPayments': total_split_payments,
                'paymentMethodTotals': payment_method_totals
            }

            return {
                'statusCode': 200,
                'body': json.dumps(totals, cls=CustomJSONEncoder)
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
