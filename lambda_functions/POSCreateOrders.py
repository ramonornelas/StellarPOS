import json
import uuid
import boto3
from botocore.exceptions import BotoCoreError, ClientError
import datetime
import decimal

dynamodb = boto3.resource('dynamodb')
dynamodb_client = boto3.client('dynamodb')
order_ticket_table = dynamodb.Table('POS_orderTicket')
order_product_table = dynamodb.Table('POS_orderProduct')
split_payment_table = dynamodb.Table('POS_orderSplitPayment')
inventory_movement_table = dynamodb.Table('inventory_Movement')
pos_product_table = dynamodb.Table('POS_product')

# Define a constant for two decimal places
TWO_DECIMAL_PLACES = decimal.Decimal('0.01')

def lambda_handler(event, context):
    try:
        if 'body' in event:
            order = json.loads(event['body'])
            subtotal = decimal.Decimal(str(order['subtotal'])).quantize(TWO_DECIMAL_PLACES)
            payment_method = order['payment_method']
            split_payments = order.get('split_payments', [])
            discount = decimal.Decimal(str(order.get('discount', 0))).quantize(TWO_DECIMAL_PLACES)
            tip = decimal.Decimal(str(order.get('tip', 0))).quantize(TWO_DECIMAL_PLACES)
            total = (subtotal - discount).quantize(TWO_DECIMAL_PLACES)
            total_with_tip = (total + tip).quantize(TWO_DECIMAL_PLACES)
            received_amount = decimal.Decimal(str(order.get('received_amount', 0))).quantize(TWO_DECIMAL_PLACES)

            # Create a new order ticket
            new_orderTicket = {
                'id': str(uuid.uuid4()),
                'date': order['date'],
                'ticket': order['ticket'],
                'subtotal': subtotal,
                'discount': discount,
                'total': total,
                'tip': tip,
                'total_with_tip': total_with_tip,
                'received_amount': received_amount,
                'change': decimal.Decimal(str(order.get('change', 0))).quantize(TWO_DECIMAL_PLACES),
                'payment_method': payment_method,
                'customer_id': order.get('customer_id', ''),
                'notes': order.get('notes', ''),
                'cash_register_id': order.get('cash_register_id', ''),
                'created_datetime': get_current_datetime(),
                'updated_datetime': get_current_datetime(),
                'updated_user_id': order.get('updated_user_id', ''),
                'updated_username': order.get('updated_username', '')
            }

            # Prepare the transaction items
            transaction_items = []

            # Add order ticket to transaction
            transaction_items.append({
                'Put': {
                    'TableName': 'POS_orderTicket',
                    'Item': {k: {'S': str(v)} if isinstance(v, str) else {'N': str(v)} for k, v in new_orderTicket.items()}
                }
            })

            # Add products to transaction
            products = order['products']
            grouped_products = group_products(products)
            for product_data in grouped_products.values():
                transaction_items.append({
                    'Put': {
                        'TableName': 'POS_orderProduct',
                        'Item': {k: {'S': str(v)} if isinstance(v, str) else {'N': str(v)} for k, v in create_order_product_record(product_data, new_orderTicket).items()}
                    }
                })
                transaction_items.append({
                    'Put': {
                        'TableName': 'inventory_Movement',
                        'Item': {k: {'S': str(v)} if isinstance(v, str) else {'N': str(v)} for k, v in create_inventory_movement_record(product_data, new_orderTicket).items()}
                    }
                })
                transaction_items.append({
                    'Update': {
                        'TableName': 'POS_product',
                        'Key': {'id': {'S': product_data['id']}},
                        'UpdateExpression': 'SET stock_available = if_not_exists(stock_available, :start) - :quantity',
                        'ExpressionAttributeValues': {
                            ':start': {'N': '0'},
                            ':quantity': {'N': str(product_data['quantity'])}
                        }
                    }
                })

            # Add split payments to transaction
            if len(split_payments) > 0:
                for split_payment in split_payments:
                    transaction_items.append({
                        'Put': {
                            'TableName': 'POS_orderSplitPayment',
                            'Item': {k: {'S': str(v)} if isinstance(v, str) else {'N': str(v)} for k, v in create_order_split_payment_record(split_payment, new_orderTicket).items()}
                        }
                    })

            # Log the transaction items for debugging
            print("Transaction Items:", json.dumps(transaction_items, indent=4))

            # Execute the transaction
            dynamodb_client.transact_write_items(TransactItems=transaction_items)

            return {
                'statusCode': 201,
                'body': json.dumps(new_orderTicket, default=str)  # Use default=str to handle non-serializable types
            }
        else:
            return {
                'statusCode': 400,
                'body': json.dumps('Bad Request: Missing body in event')
            }
    except (BotoCoreError, ClientError) as error:
        print(error)
        return {
            'statusCode': 500,
            'body': json.dumps({'message': str(error)})
        }

def get_current_datetime():
    return datetime.datetime.now().isoformat()

# Update the group_products function to ensure prices and totals are rounded
def group_products(products):
    grouped_products = {}
    for product in products:
        product_id = product['id']
        product_variant_id = product.get('product_variant_id', 'no_variant')
        price = decimal.Decimal(str(product.get('price', 0))).quantize(TWO_DECIMAL_PLACES)
        quantity = decimal.Decimal(str(product.get('quantity', 1))).quantize(TWO_DECIMAL_PLACES)
        key = (product_id, product_variant_id)
        
        if key in grouped_products:
            grouped_products[key]['quantity'] = (grouped_products[key]['quantity'] + quantity).quantize(TWO_DECIMAL_PLACES)
            grouped_products[key]['total'] = (grouped_products[key]['total'] + price * quantity).quantize(TWO_DECIMAL_PLACES)
        else:
            grouped_products[key] = {
                'id': product_id,
                'product_variant_id': product_variant_id,
                'quantity': quantity,
                'total': (price * quantity).quantize(TWO_DECIMAL_PLACES),
                'name': product.get('name', ''),
                'price': price,
                'category_name': product.get('category_name', '')
            }
    return grouped_products

# Ensure quantization in create_order_product_record
def create_order_product_record(product_data, new_orderTicket):
    return {
        'id': str(uuid.uuid4()),
        'orderTicket_id': new_orderTicket['id'],
        'product_id': product_data['id'],
        'product_variant_id': product_data.get('product_variant_id', 'no_variant'),
        'product_name': product_data['name'],
        'product_price': product_data['price'].quantize(TWO_DECIMAL_PLACES),
        'product_category': product_data['category_name'],
        'quantity': product_data['quantity'],
        'total': product_data['total'].quantize(TWO_DECIMAL_PLACES),
        'created_datetime': get_current_datetime(),
        'updated_datetime': get_current_datetime()
    }

# Ensure quantization in create_inventory_movement_record
def create_inventory_movement_record(product_data, new_orderTicket):
    return {
        'id': str(uuid.uuid4()),
        'product_id': product_data['id'],
        'product_variant_id': product_data.get('product_variant_id', 'no_variant'),
        'product_name': product_data['name'],
        'movement_type': 'sale',
        'date': new_orderTicket['date'],
        'transactionTicket_id': new_orderTicket['id'],
        'quantity': product_data['quantity'],
        'product_price': product_data['price'].quantize(TWO_DECIMAL_PLACES),
        'product_cost': product_data.get('cost', decimal.Decimal('0.00')).quantize(TWO_DECIMAL_PLACES),
        'notes': new_orderTicket.get('notes', '')
    }

# Ensure quantization in create_order_split_payment_record
def create_order_split_payment_record(split_payment, new_orderTicket):
    amount = decimal.Decimal(str(split_payment['amount'])).quantize(TWO_DECIMAL_PLACES)
    return {
        'id': str(uuid.uuid4()),
        'orderTicket_id': new_orderTicket['id'],
        'payment_method': split_payment['payment_method'],
        'amount': amount,
        'created_datetime': get_current_datetime(),
        'updated_datetime': get_current_datetime()
    }