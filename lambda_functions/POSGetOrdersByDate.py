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
            'SPLIT_PAYMENT_TABLE': os.getenv('TEST_SPLIT_PAYMENT_TABLE', 'test_POS_orderSplitPayment'),
            'RETURN_PRODUCT_TABLE': os.getenv('TEST_RETURN_PRODUCT_TABLE', 'test_POS_returnProduct'),
            'RETURN_TICKET_TABLE': os.getenv('TEST_RETURN_TICKET_TABLE', 'test_POS_returnTicket')
        }
    else:
        return {
            'ORDER_TICKET_TABLE': os.getenv('ORDER_TICKET_TABLE', 'POS_orderTicket'),
            'ORDER_PRODUCT_TABLE': os.getenv('ORDER_PRODUCT_TABLE', 'POS_orderProduct'),
            'SPLIT_PAYMENT_TABLE': os.getenv('SPLIT_PAYMENT_TABLE', 'POS_orderSplitPayment'),
            'RETURN_PRODUCT_TABLE': os.getenv('RETURN_PRODUCT_TABLE', 'POS_returnProduct'),
            'RETURN_TICKET_TABLE': os.getenv('RETURN_TICKET_TABLE', 'POS_returnTicket')
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
        return_product_table = dynamodb.Table(tables['RETURN_PRODUCT_TABLE'])
        return_ticket_table = dynamodb.Table(tables['RETURN_TICKET_TABLE'])

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
                    
                    # Track total quantities for return_status calculation
                    total_ordered_quantity = Decimal('0')
                    total_returned_quantity = Decimal('0')
                    
                    for product in products:
                        product_id = product.get('product_id')
                        product_variant_id = product.get('product_variant_id')
                        product_quantity = Decimal(str(product.get('quantity', 0)))
                        quantity_returned = Decimal(str(product.get('quantity_returned', 0)))
                        
                        total_ordered_quantity += product_quantity
                        total_returned_quantity += quantity_returned
                        
                        # Add quantity_returned to product (default to 0)
                        product['quantity_returned'] = str(quantity_returned)
                        
                        # Determine is_returned based on quantity_returned > 0
                        product['is_returned'] = quantity_returned > 0
                        
                        # Get returns list for this product if it has been returned
                        if quantity_returned > 0:
                            # Query POS_returnProduct for returns related to this order and product
                            returns_response = return_product_table.scan(
                                FilterExpression=Attr('orderTicket_id').eq(order_id) & Attr('product_id').eq(product_id)
                            )
                            
                            return_products = returns_response.get('Items', [])
                            
                            # Filter by variant using normalization
                            # 'no_variant', None, empty string all mean "no variant"
                            def normalize_variant(v):
                                if not v or v.lower() in ['no_variant', 'no-variant', 'novariant']:
                                    return None
                                return v
                            
                            normalized_product_variant = normalize_variant(product_variant_id)
                            return_products = [rp for rp in return_products 
                                if normalize_variant(rp.get('product_variant_id')) == normalized_product_variant]
                            
                            # Build returns array with return ticket details
                            returns_list = []
                            for return_product in return_products:
                                return_ticket_id = return_product.get('returnTicket_id')
                                
                                # Get return ticket details
                                if return_ticket_id:
                                    try:
                                        ticket_response = return_ticket_table.get_item(Key={'id': return_ticket_id})
                                        return_ticket = ticket_response.get('Item', {})
                                        
                                        return_entry = {
                                            'returnTicket_id': return_ticket_id,
                                            'quantity': str(return_product.get('quantity', 0)),
                                            'return_date': return_ticket.get('created_datetime', '').split('T')[0],
                                            'returnTicket_ticket': return_ticket.get('ticket', '')
                                        }
                                        returns_list.append(return_entry)
                                    except Exception as e:
                                        print(f"Error getting return ticket {return_ticket_id}: {str(e)}")
                            
                            product['returns'] = returns_list
                        else:
                            product['returns'] = []
                    
                    order['products'] = products
                    
                    # Calculate return_status based on total quantities
                    if total_returned_quantity == 0:
                        order['return_status'] = 'none'
                    elif total_returned_quantity >= total_ordered_quantity:
                        order['return_status'] = 'total'
                    else:
                        order['return_status'] = 'partial'
                else:
                    order['products'] = []
                    order['return_status'] = 'none'
                    
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
