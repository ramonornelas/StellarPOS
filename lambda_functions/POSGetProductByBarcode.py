import json
import boto3
from botocore.exceptions import BotoCoreError, ClientError
import decimal
import os
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

class DecimalEncoder(json.JSONEncoder):
    """Helper class to convert Decimal objects to float for JSON serialization"""
    def default(self, obj):
        if isinstance(obj, decimal.Decimal):
            return float(obj)
        return super(DecimalEncoder, self).default(obj)

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
        if http_method != 'GET':
            return {
                'statusCode': 405,
                'headers': {
                    'Content-Type': 'application/json',
                    'Access-Control-Allow-Origin': '*',
                    'Access-Control-Allow-Methods': 'GET',
                    'Access-Control-Allow-Headers': 'Content-Type'
                },
                'body': json.dumps({
                    'success': False,
                    'error': {
                        'code': 'METHOD_NOT_ALLOWED',
                        'message': 'Only GET method is allowed',
                    }
                })
            }

        # Extract barcode from path parameters
        path_parameters = event.get('pathParameters', {})
        if not path_parameters or 'barcode' not in path_parameters:
            return {
                'statusCode': 400,
                'headers': {
                    'Content-Type': 'application/json',
                    'Access-Control-Allow-Origin': '*'
                },
                'body': json.dumps({
                    'success': False,
                    'error': {
                        'code': 'MISSING_BARCODE',
                        'message': 'Barcode is required in path parameters'
                    }
                })
            }

        barcode = path_parameters['barcode']
        
        print(f"Looking up barcode: {barcode}")

        # Validate and normalize barcode
        validation_result = validate_barcode(barcode)
        if not validation_result['valid']:
            return {
                'statusCode': 400,
                'headers': {
                    'Content-Type': 'application/json',
                    'Access-Control-Allow-Origin': '*'
                },
                'body': json.dumps({
                    'success': False,
                    'error': {
                        'code': 'INVALID_BARCODE_FORMAT',
                        'message': validation_result['message'],
                        'barcode': barcode
                    }
                })
            }
        
        normalized_barcode = validation_result['normalized_barcode']
        print(f"Normalized barcode: {normalized_barcode}")

        # Search for product by barcode
        result = search_product_by_barcode(
            normalized_barcode,
            POS_PRODUCT_TABLE,
            POS_PRODUCT_VARIANT_TABLE
        )

        if result['found']:
            return {
                'statusCode': 200,
                'headers': {
                    'Content-Type': 'application/json',
                    'Access-Control-Allow-Origin': '*'
                },
                'body': json.dumps({
                    'success': True,
                    'product': result['product']
                }, cls=DecimalEncoder)
            }
        else:
            return {
                'statusCode': 404,
                'headers': {
                    'Content-Type': 'application/json',
                    'Access-Control-Allow-Origin': '*'
                },
                'body': json.dumps({
                    'success': False,
                    'error': {
                        'code': 'PRODUCT_NOT_FOUND',
                        'message': f'No product found with barcode: {normalized_barcode}',
                        'barcode': normalized_barcode
                    }
                })
            }

    except (BotoCoreError, ClientError) as error:
        print(f"AWS error: {error}")
        return {
            'statusCode': 500,
            'headers': {
                'Content-Type': 'application/json',
                'Access-Control-Allow-Origin': '*'
            },
            'body': json.dumps({
                'success': False,
                'error': {
                    'code': 'DATABASE_ERROR',
                    'message': 'Error accessing database',
                }
            })
        }
    except Exception as error:
        print(f"Unexpected error: {error}")
        return {
            'statusCode': 500,
            'headers': {
                'Content-Type': 'application/json',
                'Access-Control-Allow-Origin': '*'
            },
            'body': json.dumps({
                'success': False,
                'error': {
                    'code': 'INTERNAL_ERROR',
                    'message': 'An unexpected error occurred',
                }
            })
        }

def validate_barcode(barcode):
    """
    Validate and normalize barcode format.
    Supports common retail barcode standards (UPC-A, EAN-13, Code128).
    """
    if not barcode:
        return {
            'valid': False,
            'message': 'Barcode cannot be empty'
        }
    
    # Remove whitespace
    normalized = barcode.strip()
    
    # Check if barcode contains only digits (for UPC-A and EAN-13)
    # or alphanumeric characters (for Code128)
    if not re.match(r'^[0-9A-Za-z\-]+$', normalized):
        return {
            'valid': False,
            'message': 'Barcode contains invalid characters. Expected alphanumeric characters and hyphens only.'
        }
    
    # Check length (common barcode lengths: 8, 12, 13, or variable for Code128)
    barcode_length = len(normalized)
    if barcode_length < 8 or barcode_length > 128:
        return {
            'valid': False,
            'message': f'Barcode length is invalid. Expected 8-128 characters, got {barcode_length}.'
        }
    
    return {
        'valid': True,
        'normalized_barcode': normalized
    }

def search_product_by_barcode(barcode, product_table_name, variant_table_name):
    """
    Search for a product or variant by barcode.
    First searches the product table, then the variant table.
    """
    # Search in products table first
    product_result = search_in_table(barcode, product_table_name, 'product')
    if product_result['found']:
        return product_result
    
    # If not found in products, search in variants table
    variant_result = search_in_table(barcode, variant_table_name, 'variant')
    if variant_result['found']:
        # Get the parent product information for the variant
        variant_result = enrich_variant_with_product_info(
            variant_result['product'],
            product_table_name
        )
    
    return variant_result

def search_in_table(barcode, table_name, item_type):
    """
    Search for an item by barcode in a specific DynamoDB table.
    """
    try:
        print(f"Searching in {table_name} for barcode: {barcode}")
        
        response = dynamodb_client.scan(
            TableName=table_name,
            FilterExpression='barcode = :barcode',
            ExpressionAttributeValues={
                ':barcode': {'S': barcode}
            },
            Limit=100
        )
        
        if response.get('Items') and len(response['Items']) > 0:
            item = convert_from_dynamodb_item(response['Items'][0])
            
            # Check if item is deleted
            if item.get('is_deleted', False):
                print(f"Item found but is deleted: {item.get('id')}")
                return {'found': False}
            
            # Format the product/variant data
            product_data = format_product_data(item, item_type)
            
            print(f"Found {item_type}: {product_data.get('id')}")
            return {
                'found': True,
                'product': product_data
            }
        
        print(f"No item found in {table_name}")
        return {'found': False}
        
    except Exception as e:
        print(f"Error searching in {table_name}: {e}")
        raise e

def enrich_variant_with_product_info(variant_data, product_table_name):
    """
    Enrich variant data with parent product information.
    """
    try:
        product_id = variant_data.get('product_id')
        if not product_id:
            return {
                'found': True,
                'product': variant_data
            }
        
        # Get parent product
        response = dynamodb_client.get_item(
            TableName=product_table_name,
            Key={'id': {'S': product_id}}
        )
        
        if 'Item' in response:
            parent_product = convert_from_dynamodb_item(response['Item'])
            
            # Add parent product information to variant
            variant_data['product_name'] = parent_product.get('name', '')
            variant_data['category'] = parent_product.get('category_name', '')
            variant_data['image_url'] = parent_product.get('image_url', '')
            
        return {
            'found': True,
            'product': variant_data
        }
        
    except Exception as e:
        print(f"Error enriching variant with product info: {e}")
        # Return variant data even if we couldn't get parent product info
        return {
            'found': True,
            'product': variant_data
        }

def format_product_data(item, item_type):
    """
    Format product or variant data for API response.
    """
    formatted = {
        'id': item.get('id', ''),
        'name': item.get('name', ''),
        'price': item.get('price', 0),
        'barcode': item.get('barcode', ''),
        'category': item.get('category_name', ''),
        'stock_quantity': item.get('stock_available', 0),
        'is_active': item.get('is_active', True),
        'type': item_type,
    }
    
    # Add variant-specific fields
    if item_type == 'variant':
        formatted['product_id'] = item.get('product_id', '')
        formatted['display_order'] = item.get('display_order', 0)
    
    # Add optional fields if they exist
    if 'image_url' in item:
        formatted['image_url'] = item['image_url']
    
    if 'description' in item:
        formatted['description'] = item['description']
    
    return formatted

def convert_from_dynamodb_item(dynamodb_item):
    """
    Convert DynamoDB item format to Python dict.
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
