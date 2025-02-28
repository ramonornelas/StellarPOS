import json
import uuid
import boto3
from botocore.exceptions import BotoCoreError, ClientError
import datetime
import decimal

dynamodb = boto3.resource('dynamodb')
order_ticket_table = dynamodb.Table('POS_orderTicket')
order_product_table = dynamodb.Table('POS_orderProduct')
split_payment_table = dynamodb.Table('POS_orderSplitPayment')

def lambda_handler(event, context):
    try:
        if 'body' in event:
            order = json.loads(event['body'])
            subtotal = decimal.Decimal(str(order['subtotal']))
            payment_method = order['payment_method']
            split_payments = order.get('split_payments', [])
            discount = decimal.Decimal(str(order.get('discount', 0)))
            tip = decimal.Decimal(str(order.get('tip', 0)))
            total = subtotal - discount
            total_with_tip = total + tip

            # Create a new order ticket
            new_orderTicket = {
                'id': str(uuid.uuid4()),
                'date': order['date'],
                'ticket': order['ticket'],
                'subtotal': decimal.Decimal(str(order.get('subtotal', 0))),
                'discount': decimal.Decimal(str(order.get('discount', 0))),
                'total': total,
                'tip': decimal.Decimal(str(tip)),
                'total_with_tip': total_with_tip,
                'payment_method': payment_method,
                'customer_id': order.get('customer_id', ''),
                'notes': order.get('notes', ''),
                'created_datetime': get_current_datetime(),
                'updated_datetime': get_current_datetime(),
                'updated_user_id': order.get('updated_user_id', ''),
                'updated_username': order.get('updated_username', '')
            }

            # Save the order ticket
            order_ticket_table.put_item(Item=new_orderTicket)

            # Save each product in the order
            products = order['products']
            create_order_product(products, new_orderTicket)            

            # Save the split payment
            if len(split_payments) > 0:
                create_order_split_payment(split_payments, new_orderTicket)  

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

def create_order_product(products, new_orderTicket):
    grouped_products = {}

    # Group products by ID
    for product in products:
        product_id = product['id']
        product_variant_id = product.get('product_variant_id', 'no_variant')
        price = decimal.Decimal(str(product.get('price', 0)))
        key = (product_id, product_variant_id)
        
        if key in grouped_products:
            grouped_products[key]['quantity'] += 1
            grouped_products[key]['total'] += price
        else:
            grouped_products[key] = {
                'id': product_id,
                'product_variant_id': product_variant_id,
                'quantity': 1,
                'total': price,
                'name': product.get('name', ''),
                'price': price,
                'category_name': product.get('category_name', '')
            }

    # Create records from grouped data
    for product_id, product_data in grouped_products.items():
        create_order_product_record(product_data, new_orderTicket)

def create_order_split_payment(split_payments, new_orderTicket):
    for split_payment in split_payments:
        amount = decimal.Decimal(str(split_payment['amount']))
        new_split_payment = {
            'id': str(uuid.uuid4()),
            'orderTicket_id': new_orderTicket['id'],
            'payment_method': split_payment['payment_method'],
            'amount': amount,
            'created_datetime': get_current_datetime(),
            'updated_datetime': get_current_datetime()
        }
        # Save the split payment
        split_payment_table.put_item(Item=new_split_payment)

def create_order_product_record(product_data, new_orderTicket):
    # Function to create a record in the database
    print(f"Creating record for product ID {product_data['id']} with quantity {product_data['quantity']} and total {product_data['total']}")
    # Save each product in the order
    new_orderProduct = {
        'id': str(uuid.uuid4()),
        'orderTicket_id': new_orderTicket['id'],
        'product_id': product_data['id'],
        'product_variant_id': product_data.get('product_variant_id', 'no_variant'),
        'product_name': product_data['name'],
        'product_price': product_data['price'],
        'product_category': product_data['category_name'],
        'quantity': product_data['quantity'],
        'total': product_data['total'],
        'created_datetime': get_current_datetime(),
        'updated_datetime': get_current_datetime()
    }
    order_product_table.put_item(Item=new_orderProduct)
