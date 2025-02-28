import json
import uuid
import boto3
from botocore.exceptions import BotoCoreError, ClientError
import datetime
import decimal
from decimal import Decimal

dynamodb = boto3.resource('dynamodb')
product_table = dynamodb.Table('POS_product')
category_table = dynamodb.Table('POS_category')
variant_table = dynamodb.Table('POS_product_variant')  # Add this line to reference the variant table

def lambda_handler(event, context):
    try:
        if 'body' in event:
            products = json.loads(event['body'])

            # Save each product in the table
            for product in products:
                category_id = get_category_id(product.get('category_name', ''))

                # Check if the product already exists
                existing_product = get_existing_product(product['name'])

                if existing_product:
                    # If the product exists and has variants, create a record in POS_product_variant
                    if product.get('has_variants', False):
                        create_variant(existing_product, product, category_id)
                else:
                    # Create a new product
                    new_product = create_product(product, category_id)

                    # If the new product has variants, create a record in POS_product_variant
                    if new_product['has_variants']:
                        create_variant(new_product, product, category_id)

            return {
                'statusCode': 201,
                'body': json.dumps({'message': 'Products uploaded successfully'})
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

def create_product(product, category_id):
    new_product = {
        'id': str(uuid.uuid4()),
        'name': product['name'],
        'description': product.get('description', ''),
        'is_active': product.get('is_active', True),
        'category_id': category_id,
        'category_name': product.get('category_name', ''),
        'has_variants': product.get('has_variants', False),
        'is_combo': product.get('is_combo', False),
        'image_url': product.get('image_url', ''),
        'display_order': product.get('display_order', 0),
        'created_datetime': get_current_datetime(),
        'updated_datetime': get_current_datetime()
    }
    
    # Conditionally add the price field if has_variants is False
    if not product.get('has_variants', False):
        new_product['price'] = decimal.Decimal(str(product['price']))
        new_product['cost'] = decimal.Decimal(str(product['cost']))

    product_table.put_item(Item=new_product)
    return new_product

def create_variant(product, variant_data, category_id):
    variant = {
        'id': str(uuid.uuid4()),
        'product_id': product['id'],
        'product_name': product['name'],
        'name': variant_data.get('variant_name', ''),
        'description': variant_data.get('variant_description', ''),
        'price': decimal.Decimal(str(variant_data['price'])),
        'cost': decimal.Decimal(str(variant_data['cost'])),
        'display_order': variant_data.get('variant_display_order', 0),
        'category_id': category_id,
        'category_name': variant_data.get('category_name', '')
    }

    # Convert float values to Decimal
    for key, value in variant.items():
        if isinstance(value, float):
            variant[key] = Decimal(str(value))

    variant_table.put_item(Item=variant)

def get_existing_product(product_name):
    response = product_table.scan(
        FilterExpression=boto3.dynamodb.conditions.Attr('name').eq(product_name)
    )
    if 'Items' in response and response['Items']:
        return response['Items'][0]
    return None

def get_category_id(category_name):
    if not category_name:
        return ''
    # Assuming 'category_name' is an attribute and 'id' is the primary key
    response = category_table.scan(
        FilterExpression=boto3.dynamodb.conditions.Attr('name').eq(category_name)
    )
    if 'Items' in response and response['Items']:
        return response['Items'][0].get('id', '')
    return ''

def get_current_datetime():
    return datetime.datetime.now().isoformat()