import json
import uuid
import boto3
from botocore.exceptions import BotoCoreError, ClientError
import datetime
import decimal
import os

def get_table_names(stage):
    """Get table names based on the stage"""
    if stage.lower() == 'test':
        return {
            'ORDER_TICKET_TABLE': os.getenv('TEST_ORDER_TICKET_TABLE', 'test_POS_orderTicket'),
            'ORDER_PRODUCT_TABLE': os.getenv('TEST_ORDER_PRODUCT_TABLE', 'test_POS_orderProduct'),
            'SPLIT_PAYMENT_TABLE': os.getenv('TEST_SPLIT_PAYMENT_TABLE', 'test_POS_orderSplitPayment'),
            'INVENTORY_MOVEMENT_TABLE': os.getenv('TEST_INVENTORY_MOVEMENT_TABLE', 'test_inventory_movement'),
            'POS_PRODUCT_TABLE': os.getenv('TEST_POS_PRODUCT_TABLE', 'test_POS_product'),
            'POS_PRODUCT_VARIANT_TABLE': os.getenv('TEST_POS_PRODUCT_VARIANT_TABLE', 'test_POS_product_variant')
        }
    else:
        return {
            'ORDER_TICKET_TABLE': os.getenv('ORDER_TICKET_TABLE', 'POS_orderTicket'),
            'ORDER_PRODUCT_TABLE': os.getenv('ORDER_PRODUCT_TABLE', 'POS_orderProduct'),
            'SPLIT_PAYMENT_TABLE': os.getenv('SPLIT_PAYMENT_TABLE', 'POS_orderSplitPayment'),
            'INVENTORY_MOVEMENT_TABLE': os.getenv('INVENTORY_MOVEMENT_TABLE', 'inventory_movement'),
            'POS_PRODUCT_TABLE': os.getenv('POS_PRODUCT_TABLE', 'POS_product'),
            'POS_PRODUCT_VARIANT_TABLE': os.getenv('POS_PRODUCT_VARIANT_TABLE', 'POS_product_variant')
        }

dynamodb_client = boto3.client('dynamodb')

# Define a constant for two decimal places
TWO_DECIMAL_PLACES = decimal.Decimal('0.01')

def lambda_handler(event, context):
    try:
        # Detect stage from API Gateway event
        stage = 'prod'  # default
        if 'requestContext' in event and 'stage' in event['requestContext']:
            stage = event['requestContext']['stage']
            if stage == '$default':
                stage = 'prod'
        
        # Get table names based on stage
        tables = get_table_names(stage)
        ORDER_TICKET_TABLE = tables['ORDER_TICKET_TABLE']
        ORDER_PRODUCT_TABLE = tables['ORDER_PRODUCT_TABLE']
        SPLIT_PAYMENT_TABLE = tables['SPLIT_PAYMENT_TABLE']
        INVENTORY_MOVEMENT_TABLE = tables['INVENTORY_MOVEMENT_TABLE']
        POS_PRODUCT_TABLE = tables['POS_PRODUCT_TABLE']
        POS_PRODUCT_VARIANT_TABLE = tables['POS_PRODUCT_VARIANT_TABLE']
        
        print(f"Stage: {stage}")
        print(f"Using tables: {ORDER_TICKET_TABLE}, {ORDER_PRODUCT_TABLE}, {POS_PRODUCT_TABLE}, {POS_PRODUCT_VARIANT_TABLE}, {INVENTORY_MOVEMENT_TABLE}")

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
            
            # Extract updated_user_id from the request data
            updated_user_id = order.get('updated_user_id', '')

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
                'updated_user_id': updated_user_id
            }

            # Prepare the transaction items
            transaction_items = []

            # Add order ticket to transaction
            transaction_items.append({
                'Put': {
                    'TableName': ORDER_TICKET_TABLE,
                    'Item': {k: {'S': str(v)} if isinstance(v, str) else {'N': str(v)} for k, v in new_orderTicket.items()}
                }
            })

            # Add products to transaction
            products = order['products']
            grouped_products = group_products(products)
            for product_data in grouped_products.values():
                # Put order product
                transaction_items.append({
                    'Put': {
                        'TableName': ORDER_PRODUCT_TABLE,
                        'Item': {k: {'S': str(v)} if isinstance(v, str) else {'N': str(v)} for k, v in create_order_product_record(product_data, new_orderTicket).items()}
                    }
                })

                # Put inventory movement record (same transaction)
                transaction_items.append({
                    'Put': {
                        'TableName': INVENTORY_MOVEMENT_TABLE,
                        'Item': {k: {'S': str(v)} if isinstance(v, str) else {'N': str(v)} for k, v in create_inventory_movement_record(product_data, new_orderTicket).items()}
                    }
                })

                # Decrement stock: only variant if variant present; otherwise product stock
                product_variant_id = product_data.get('product_variant_id', 'no_variant')
                qty_str = str(product_data['quantity'])
                if product_variant_id and product_variant_id != 'no_variant':
                    # Decrement only the variant stock_available (allow negative)
                    transaction_items.append({
                        'Update': {
                            'TableName': POS_PRODUCT_VARIANT_TABLE,
                            'Key': {'id': {'S': product_variant_id}},
                            'UpdateExpression': 'SET stock_available = if_not_exists(stock_available, :zero) - :qty',
                            'ExpressionAttributeValues': {
                                ':zero': {'N': '0'},
                                ':qty': {'N': qty_str}
                            }
                        }
                    })
                else:
                    # Decrement product stock_available when there is no variant (allow negative)
                    transaction_items.append({
                        'Update': {
                            'TableName': POS_PRODUCT_TABLE,
                            'Key': {'id': {'S': product_data['id']}},
                            'UpdateExpression': 'SET stock_available = if_not_exists(stock_available, :zero) - :qty',
                            'ExpressionAttributeValues': {
                                ':zero': {'N': '0'},
                                ':qty': {'N': qty_str}
                            }
                        }
                    })

            # Add split payments to transaction
            if len(split_payments) > 0:
                for split_payment in split_payments:
                    transaction_items.append({
                        'Put': {
                            'TableName': SPLIT_PAYMENT_TABLE,
                            'Item': {k: {'S': str(v)} if isinstance(v, str) else {'N': str(v)} for k, v in create_order_split_payment_record(split_payment, new_orderTicket).items()}
                        }
                    })

            # Log the transaction items for debugging
            print("Transaction Items:", json.dumps(transaction_items, indent=4))

            # Execute the transaction (atomic all-or-none)
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
        'updated_datetime': get_current_datetime(),
        'updated_user_id': new_orderTicket['updated_user_id']
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
        'notes': new_orderTicket.get('notes', ''),
        'created_datetime': get_current_datetime(),
        'updated_datetime': get_current_datetime(),
        'updated_user_id': new_orderTicket['updated_user_id']
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
        'updated_datetime': get_current_datetime(),
        'updated_user_id': new_orderTicket['updated_user_id']
    }