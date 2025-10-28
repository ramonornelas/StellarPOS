import json
import boto3
from botocore.exceptions import BotoCoreError, ClientError
import os
import base64
from decimal import Decimal

def get_table_name(stage):
    """Get product table name based on the stage"""
    if stage and stage.lower() == 'test':
        return os.getenv('TEST_POS_PRODUCT_TABLE', 'test_POS_product')
    else:
        return os.getenv('POS_PRODUCT_TABLE', 'POS_product')

def get_variant_table_name(stage):
    """Get product variant table name based on the stage"""
    if stage and stage.lower() == 'test':
        return os.getenv('TEST_POS_PRODUCT_VARIANT_TABLE', 'test_POS_product_variant')
    else:
        return os.getenv('POS_PRODUCT_VARIANT_TABLE', 'POS_product_variant')

dynamodb = boto3.resource('dynamodb')

class CustomJSONEncoder(json.JSONEncoder):
    def default(self, obj):
        if isinstance(obj, set):
            return list(obj)
        if isinstance(obj, boto3.dynamodb.types.Binary):
            return base64.b64encode(obj.value).decode('utf-8')
        if isinstance(obj, Decimal):
            return str(obj)
        return super().default(obj)

def lambda_handler(event, context):
    # Detect stage from API Gateway event
    stage = 'prod'  # default
    if 'requestContext' in event and 'stage' in event['requestContext']:
        stage = event['requestContext']['stage']
        if stage == '$default':
            stage = 'prod'

    # Parse query parameters
    query_params = event.get('queryStringParameters') or {}
    with_stock = query_params.get('with_stock', '').lower() == 'true'
    include_variants = query_params.get('include_variants', '').lower() == 'true'

    table_name = get_table_name(stage)
    variant_table_name = get_variant_table_name(stage)
    table = dynamodb.Table(table_name)
    variant_table = dynamodb.Table(variant_table_name)

    try:
        if with_stock:
            # Get products with stock available
            return get_products_with_stock(table, variant_table)
        elif include_variants:
            # Get all products and variants (except deleted ones)
            return get_products_with_variants(table, variant_table)
        else:
            # Original behavior - return all non-deleted products
            response = table.scan()
            products = response['Items']
            # Filter out products where is_deleted is True
            filtered_products = [p for p in products if not p.get('is_deleted', False)]
            return {
                'statusCode': 200,
                'body': json.dumps(filtered_products, cls=CustomJSONEncoder)
            }
    except (BotoCoreError, ClientError) as error:
        print(error)
        return {
            'statusCode': 500,
            'body': json.dumps({'message': str(error)})
        }

def get_products_with_stock(product_table, variant_table):
    """Get products and variants that have stock available (including inactive ones)"""
    try:
        # Get all non-deleted products (including inactive ones)
        product_response = product_table.scan(
            FilterExpression="attribute_not_exists(is_deleted) OR is_deleted = :false_val",
            ExpressionAttributeValues={
                ':false_val': False
            }
        )
        
        # Get all non-deleted variants (including inactive ones)
        variant_response = variant_table.scan(
            FilterExpression="attribute_not_exists(is_deleted) OR is_deleted = :false_val",
            ExpressionAttributeValues={
                ':false_val': False
            }
        )

        items = []
        
        # Process products
        for product in product_response['Items']:
            stock_available = int(product.get('stock_available', 0))
            has_variants = product.get('has_variants', False)
            
            # If product doesn't have variants and has stock, add it
            if not has_variants and stock_available > 0:
                items.append({
                    'product_id': product['id'],
                    'product_variant_id': None,
                    'name': product['name'],
                    'display_order': int(product.get('display_order', 999))
                })
        
        # Process variants
        for variant in variant_response['Items']:
            stock_available = int(variant.get('stock_available', 0))
            
            if stock_available > 0:
                # Find the parent product to get its name
                product_id = variant['product_id']
                parent_product = next((p for p in product_response['Items'] if p['id'] == product_id), None)
                
                if parent_product:
                    # Combine parent product name with variant name
                    full_name = f"{parent_product['name']} — {variant['name']}"
                    
                    items.append({
                        'product_id': variant['product_id'],
                        'product_variant_id': variant['id'],
                        'name': full_name,
                        'display_order': int(variant.get('display_order', 999))
                    })
        
        # Sort by display_order ascending
        items.sort(key=lambda x: x['display_order'])
        
        # Remove display_order from response (internal field)
        for item in items:
            del item['display_order']
        
        return {
            'statusCode': 200,
            'body': json.dumps({
                'status': 'success',
                'items': items,
                'total': len(items)
            }, cls=CustomJSONEncoder)
        }
        
    except Exception as e:
        print(f"Error in get_products_with_stock: {str(e)}")
        raise

def get_products_with_variants(product_table, variant_table):
    """Get all products and their variants in structured format (except deleted ones)
    - Returns products without variants as individual items
    - Returns individual variants for products that have variants (not the parent product)
    - Same response format as with_stock=true but without stock validation
    """
    try:
        # Get all non-deleted products (including inactive ones)
        product_response = product_table.scan(
            FilterExpression="attribute_not_exists(is_deleted) OR is_deleted = :false_val",
            ExpressionAttributeValues={
                ':false_val': False
            }
        )
        
        # Get all non-deleted variants (including inactive ones)
        variant_response = variant_table.scan(
            FilterExpression="attribute_not_exists(is_deleted) OR is_deleted = :false_val",
            ExpressionAttributeValues={
                ':false_val': False
            }
        )

        items = []
        
        # Process products
        for product in product_response['Items']:
            has_variants = product.get('has_variants', False)
            
            # If product doesn't have variants, add it (no stock check)
            if not has_variants:
                items.append({
                    'product_id': product['id'],
                    'product_variant_id': None,
                    'name': product['name'],
                    'display_order': int(product.get('display_order', 999))
                })
        
        # Process variants (no stock check)
        for variant in variant_response['Items']:
            # Find the parent product to get its name
            product_id = variant['product_id']
            parent_product = next((p for p in product_response['Items'] if p['id'] == product_id), None)
            
            if parent_product:
                # Combine parent product name with variant name
                full_name = f"{parent_product['name']} — {variant['name']}"
                
                items.append({
                    'product_id': variant['product_id'],
                    'product_variant_id': variant['id'],
                    'name': full_name,
                    'display_order': int(variant.get('display_order', 999))
                })
        
        # Sort by display_order ascending
        items.sort(key=lambda x: x['display_order'])
        
        # Remove display_order from response (internal field)
        for item in items:
            del item['display_order']
        
        return {
            'statusCode': 200,
            'body': json.dumps({
                'status': 'success',
                'items': items,
                'total': len(items)
            }, cls=CustomJSONEncoder)
        }
        
    except Exception as e:
        print(f"Error in get_products_with_variants: {str(e)}")
        raise