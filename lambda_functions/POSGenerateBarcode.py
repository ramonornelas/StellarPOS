import json
import uuid
import boto3
from botocore.exceptions import BotoCoreError, ClientError
import datetime
import decimal
import os
import random
import re

def get_table_names(stage):
    """Get table names based on the stage"""
    if stage.lower() == 'test':
        return {
            'POS_PRODUCT_TABLE': os.getenv('TEST_POS_PRODUCT_TABLE', 'test_POS_product'),
            'POS_PRODUCT_VARIANT_TABLE': os.getenv('TEST_POS_PRODUCT_VARIANT_TABLE', 'test_POS_product_variant'),
        }
    else:
        return {
            'POS_PRODUCT_TABLE': os.getenv('POS_PRODUCT_TABLE', 'POS_product'),
            'POS_PRODUCT_VARIANT_TABLE': os.getenv('POS_PRODUCT_VARIANT_TABLE', 'POS_product_variant'),
        }

dynamodb_client = boto3.client('dynamodb')
dynamodb_resource = boto3.resource('dynamodb')

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
        POS_PRODUCT_TABLE = tables['POS_PRODUCT_TABLE']
        POS_PRODUCT_VARIANT_TABLE = tables['POS_PRODUCT_VARIANT_TABLE']
        
        print(f"Stage: {stage}")
        print(f"Using tables: {POS_PRODUCT_TABLE}, {POS_PRODUCT_VARIANT_TABLE}")

        # Check HTTP method
        http_method = event.get('httpMethod') or event.get('requestContext', {}).get('http', {}).get('method')
        if http_method != 'POST':
            return {
                'statusCode': 405,
                'headers': {'Content-Type': 'application/json'},
                'body': json.dumps({
                    'status': 'error',
                    'message': 'Method not allowed',
                    'errors': [{'field': 'method', 'reason': 'Only POST method is allowed'}]
                })
            }

        # Extract product_id from path parameters
        path_parameters = event.get('pathParameters', {})
        if not path_parameters or 'product_id' not in path_parameters:
            return {
                'statusCode': 400,
                'headers': {'Content-Type': 'application/json'},
                'body': json.dumps({
                    'status': 'error',
                    'message': 'Missing required parameter',
                    'errors': [{'field': 'product_id', 'reason': 'Product ID is required in path parameters'}]
                })
            }

        product_id = path_parameters['product_id']
        
        # Extract variant_id from query parameters (optional)
        query_parameters = event.get('queryStringParameters') or {}
        variant_id = query_parameters.get('variant_id')
        
        # Extract overwrite flag from query parameters (optional, default: false)
        overwrite = query_parameters.get('overwrite', 'false').lower() == 'true'

        print(f"Generating barcode for product: {product_id}, variant: {variant_id}, overwrite: {overwrite}")

        # Validate and generate barcode
        result = generate_barcode_for_product(
            product_id=product_id,
            variant_id=variant_id,
            overwrite=overwrite,
            pos_product_table=POS_PRODUCT_TABLE,
            pos_product_variant_table=POS_PRODUCT_VARIANT_TABLE
        )

        return {
            'statusCode': 200,
            'headers': {'Content-Type': 'application/json'},
            'body': json.dumps(result)
        }

    except ValidationError as ve:
        print(f"Validation error: {ve}")
        return {
            'statusCode': 400,
            'headers': {'Content-Type': 'application/json'},
            'body': json.dumps({
                'status': 'error',
                'message': 'Validation failed',
                'errors': ve.errors
            })
        }
    except (BotoCoreError, ClientError) as error:
        print(f"AWS error: {error}")
        return {
            'statusCode': 500,
            'headers': {'Content-Type': 'application/json'},
            'body': json.dumps({
                'status': 'error',
                'message': 'Internal server error',
                'errors': [{'field': 'system', 'reason': str(error)}]
            })
        }
    except Exception as error:
        print(f"Unexpected error: {error}")
        return {
            'statusCode': 500,
            'headers': {'Content-Type': 'application/json'},
            'body': json.dumps({
                'status': 'error',
                'message': 'Unexpected error occurred',
                'errors': [{'field': 'system', 'reason': str(error)}]
            })
        }

class ValidationError(Exception):
    def __init__(self, errors):
        self.errors = errors if isinstance(errors, list) else [errors]
        super().__init__(f"Validation failed: {self.errors}")

def generate_barcode_for_product(product_id, variant_id=None, overwrite=False, pos_product_table=None, pos_product_variant_table=None):
    """
    Generate and assign a barcode to a product or variant
    """
    errors = []
    
    # Validate product exists
    product = get_product_by_id(product_id, pos_product_table)
    if not product:
        errors.append({'field': 'product_id', 'reason': 'Product not found'})
        raise ValidationError(errors)
    
    target_item = product
    target_table = pos_product_table
    target_type = 'product'
    
    # If variant_id is provided, validate variant
    if variant_id:
        variant = get_variant_by_id(variant_id, pos_product_variant_table)
        if not variant:
            errors.append({'field': 'variant_id', 'reason': 'Variant not found'})
            raise ValidationError(errors)
        
        # Check if variant belongs to the product
        if variant.get('product_id') != product_id:
            errors.append({'field': 'variant_id', 'reason': 'Variant does not belong to the specified product'})
            raise ValidationError(errors)
        
        target_item = variant
        target_table = pos_product_variant_table
        target_type = 'variant'
    else:
        # If no variant_id provided, check if product has variants
        # Products with variants should not have barcodes directly
        if check_product_has_variants(product_id, pos_product_variant_table, product):
            errors.append({
                'field': 'product_id', 
                'reason': 'Cannot generate barcode for product that has variants. Generate barcode for specific variant instead.'
            })
            raise ValidationError(errors)
    
    # Check if target already has a barcode
    existing_barcode = target_item.get('barcode')
    if existing_barcode and not overwrite:
        errors.append({
            'field': 'barcode', 
            'reason': f'{target_type.capitalize()} already has a barcode. Use overwrite=true to replace it.'
        })
        raise ValidationError(errors)
    
    # Generate unique barcode
    max_attempts = 50
    for attempt in range(max_attempts):
        new_barcode = generate_ean13_barcode()
        
        # Check if barcode is unique across both products and variants
        if is_barcode_unique(new_barcode, pos_product_table, pos_product_variant_table):
            # Save barcode to database
            update_barcode_in_database(
                item_id=variant_id if variant_id else product_id,
                barcode=new_barcode,
                table_name=target_table
            )
            
            return {
                'status': 'success',
                'message': 'Barcode generated successfully',
                'data': {
                    'product_id': product_id,
                    'variant_id': variant_id,
                    'barcode': new_barcode
                }
            }
    
    # If we couldn't generate a unique barcode after max attempts
    errors.append({'field': 'barcode', 'reason': 'Failed to generate unique barcode after multiple attempts'})
    raise ValidationError(errors)

def get_product_by_id(product_id, table_name):
    """Get product by ID from database"""
    try:
        response = dynamodb_client.get_item(
            TableName=table_name,
            Key={'id': {'S': product_id}}
        )
        
        if 'Item' not in response:
            return None
        
        # Convert DynamoDB item to Python dict
        return convert_from_dynamodb_item(response['Item'])
    except Exception as e:
        print(f"Error getting product {product_id}: {e}")
        return None

def get_variant_by_id(variant_id, table_name):
    """Get variant by ID from database"""
    try:
        response = dynamodb_client.get_item(
            TableName=table_name,
            Key={'id': {'S': variant_id}}
        )
        
        if 'Item' not in response:
            return None
        
        # Convert DynamoDB item to Python dict
        return convert_from_dynamodb_item(response['Item'])
    except Exception as e:
        print(f"Error getting variant {variant_id}: {e}")
        return None

def check_product_has_variants(product_id, variant_table_name, product_item=None):
    """
    Check if a product has any variants
    First checks the has_variants field in the product, then scans variants table if needed
    Returns True if the product has variants, False otherwise
    """
    # If product item is provided, check the has_variants field first
    if product_item:
        has_variants_field = product_item.get('has_variants')
        
        # If has_variants is explicitly True, no need to check variants table
        if has_variants_field is True:
            print(f"Product {product_id} has has_variants=True, skipping variants table check")
            return True
        
        # If has_variants is explicitly False, no need to check variants table
        if has_variants_field is False:
            print(f"Product {product_id} has has_variants=False, no variants exist")
            return False
        
        # If has_variants field doesn't exist or is None, continue to variants table check
        print(f"Product {product_id} has no has_variants field, checking variants table")
    
    # Fallback: Check variants table directly using scan
    try:
        print(f"Scanning table {variant_table_name} for product_id: {product_id}")
        
        response = dynamodb_client.scan(
            TableName=variant_table_name,
            FilterExpression='product_id = :product_id',
            ExpressionAttributeValues={
                ':product_id': {'S': product_id}
            },
            Limit=10
        )

        print(f"Scan response: {response}")
        print(f"Scanned variants for product {product_id}, found {len(response.get('Items', []))} in {variant_table_name} items")
        
        return len(response.get('Items', [])) > 0
    except Exception as e:
        print(f"Error scanning for variants of product {product_id}: {e}")
        return False

def generate_ean13_barcode():
    """
    Generate a valid EAN-13 barcode
    Format: 12 digits + 1 check digit = 13 digits total
    """
    # Generate 12 random digits
    base_digits = [random.randint(0, 9) for _ in range(12)]
    
    # Calculate check digit using EAN-13 algorithm
    odd_sum = sum(base_digits[i] for i in range(0, 12, 2)) 
    even_sum = sum(base_digits[i] for i in range(1, 12, 2))

    total = odd_sum + (even_sum * 3)
    check_digit = (10 - (total % 10)) % 10
    
    # Combine all digits
    all_digits = base_digits + [check_digit]
    
    return ''.join(map(str, all_digits))

def is_barcode_unique(barcode, product_table, variant_table):
    """
    Check if barcode is unique across both products and variants tables
    """
    try:
        # Check products table
        product_response = dynamodb_client.scan(
            TableName=product_table,
            FilterExpression='barcode = :barcode',
            ExpressionAttributeValues={
                ':barcode': {'S': barcode}
            },
            Limit=1
        )
        
        if product_response.get('Items'):
            return False
        
        # Check variants table
        variant_response = dynamodb_client.scan(
            TableName=variant_table,
            FilterExpression='barcode = :barcode',
            ExpressionAttributeValues={
                ':barcode': {'S': barcode}
            },
            Limit=1
        )
        
        if variant_response.get('Items'):
            return False
        
        return True
    except Exception as e:
        print(f"Error checking barcode uniqueness for {barcode}: {e}")
        # In case of error, assume not unique to be safe
        return False

def update_barcode_in_database(item_id, barcode, table_name):
    """
    Update the barcode field for a product or variant
    """
    try:
        response = dynamodb_client.update_item(
            TableName=table_name,
            Key={'id': {'S': item_id}},
            UpdateExpression='SET barcode = :barcode, updated_datetime = :updated_datetime',
            ExpressionAttributeValues={
                ':barcode': {'S': barcode},
                ':updated_datetime': {'S': get_current_datetime()}
            },
            ReturnValues='UPDATED_NEW'
        )
        
        return response
    except Exception as e:
        print(f"Error updating barcode for {item_id}: {e}")
        raise e

def convert_from_dynamodb_item(dynamodb_item):
    """
    Convert DynamoDB item format to Python dict
    """
    result = {}
    for key, value in dynamodb_item.items():
        if 'S' in value:
            result[key] = value['S']
        elif 'N' in value:
            result[key] = decimal.Decimal(value['N'])
        elif 'BOOL' in value:
            result[key] = value['BOOL']
        elif 'NULL' in value:
            result[key] = None
        else:
            # For any other type, convert to string representation
            result[key] = str(value)
    return result

def get_current_datetime():
    """Get current datetime in ISO format"""
    return datetime.datetime.now().isoformat()
