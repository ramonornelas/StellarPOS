"""
AWS Lambda function for retrieving inventory movement run details.

Endpoint:
- GET /inventory/movements/run/{run_id} - Get run details with all movements and summary

Fetches run metadata from inventory_movement_run table, all associated movements
from inventory_movement table, and calculates summary statistics.
Includes proper error handling and stage management.
"""

import json
import boto3
from botocore.exceptions import BotoCoreError, ClientError
import os
import uuid
from datetime import datetime
from decimal import Decimal
import base64

def get_table_name(table_type, stage):
    """Get table name based on the stage and table type"""
    if stage and stage.lower() == 'test':
        table_names = {
            'product': os.getenv('TEST_POS_PRODUCT_TABLE', 'test_POS_product'),
            'variant': os.getenv('TEST_POS_PRODUCT_VARIANT_TABLE', 'test_POS_product_variant'),
            'movement': os.getenv('TEST_INVENTORY_MOVEMENT_TABLE', 'test_inventory_movement'),
            'movement_run': os.getenv('TEST_INVENTORY_MOVEMENT_RUN_TABLE', 'test_inventory_movement_run'),
            'user': os.getenv('TEST_USER_TABLE', 'test_stellar_user')
        }
    else:
        table_names = {
            'product': os.getenv('POS_PRODUCT_TABLE', 'POS_product'),
            'variant': os.getenv('POS_PRODUCT_VARIANT_TABLE', 'POS_product_variant'),
            'movement': os.getenv('INVENTORY_MOVEMENT_TABLE', 'inventory_movement'),
            'movement_run': os.getenv('INVENTORY_MOVEMENT_RUN_TABLE', 'inventory_movement_run'),
            'user': os.getenv('USER_TABLE', 'stellar_user')
        }
    return table_names.get(table_type)

dynamodb = boto3.resource('dynamodb')

class CustomJSONEncoder(json.JSONEncoder):
    def default(self, obj):
        if isinstance(obj, set):
            return list(obj)
        if isinstance(obj, boto3.dynamodb.types.Binary):
            return base64.b64encode(obj.value).decode('utf-8')
        if isinstance(obj, Decimal):
            return float(obj)
        if isinstance(obj, datetime):
            return obj.isoformat() + 'Z'
        return super().default(obj)

def lambda_handler(event, context):
    # Detect HTTP method
    http_method = None
    
    # Check different possible method fields based on API Gateway type
    if 'httpMethod' in event:
        http_method = event['httpMethod']
    elif 'requestContext' in event and 'httpMethod' in event['requestContext']:
        http_method = event['requestContext']['httpMethod']
    elif 'requestContext' in event and 'http' in event['requestContext'] and 'method' in event['requestContext']['http']:
        http_method = event['requestContext']['http']['method']
    
    # Only allow GET method
    if http_method and http_method != 'GET':
        return {
            'statusCode': 405,
            'headers': {
                'Content-Type': 'application/json',
                'Access-Control-Allow-Origin': '*',
                'Access-Control-Allow-Methods': 'GET',
                'Access-Control-Allow-Headers': 'Content-Type'
            },
            'body': json.dumps({
                'status': 'error',
                'message': 'Method not allowed',
                'allowed_method': 'GET',
                'received_method': http_method
            })
        }
    
    # Detect stage from API Gateway event
    stage = 'prod'  # default
    if 'requestContext' in event and 'stage' in event['requestContext']:
        stage = event['requestContext']['stage']
        if stage == '$default':
            stage = 'prod'
    elif 'headers' in event and event['headers']:
        # Fallback: check headers for stage info
        host = event['headers'].get('Host', '')
        if 'test' in host.lower():
            stage = 'test'
    elif 'pathParameters' in event and event['pathParameters']:
        # Fallback: check if path contains stage info
        path = event.get('path', '')
        if '/test/' in path:
            stage = 'test'
    
    print(f"Detected stage: {stage}")

    try:
        # Extract run_id from path parameters
        run_id = extract_run_id(event)
        if not run_id:
            return error_response(400, 'Missing or invalid run_id parameter', [
                {'field': 'run_id', 'reason': 'run_id is required in URL path'}
            ])
        
        # Validate run_id format
        try:
            uuid.UUID(run_id)
        except ValueError:
            return error_response(400, 'Invalid run_id format', [
                {'field': 'run_id', 'reason': 'run_id must be a valid UUID'}
            ])
        
        # Get run details
        return get_run_details(run_id, stage)
        
    except Exception as e:
        print(f"Error: {str(e)}")
        return error_response(500, 'Internal server error')

def extract_run_id(event):
    """Extract run_id from various API Gateway event formats"""
    # Try pathParameters first (REST API format)
    if 'pathParameters' in event and event['pathParameters']:
        run_id = event['pathParameters'].get('run_id')
        if run_id:
            return run_id
    
    # Try resource path parsing (HTTP API format)
    if 'rawPath' in event:
        path = event['rawPath']
        # Expected format: /inventory/movements/run/{run_id}
        path_parts = path.strip('/').split('/')
        if len(path_parts) >= 4 and path_parts[0] == 'inventory' and path_parts[1] == 'movements' and path_parts[2] == 'run':
            return path_parts[3]
    
    # Try regular path parsing
    if 'path' in event:
        path = event['path']
        path_parts = path.strip('/').split('/')
        if len(path_parts) >= 4 and path_parts[0] == 'inventory' and path_parts[1] == 'movements' and path_parts[2] == 'run':
            return path_parts[3]
    
    return None

def get_run_details(run_id, stage):
    """Get complete run details with movements and summary"""
    try:
        
        # Validate run_id format
        try:
            uuid.UUID(run_id)
        except ValueError:
            return error_response(400, 'Invalid run_id format', [
                {'field': 'run_id', 'reason': 'run_id must be a valid UUID'}
            ])
        
        # Get table references
        movement_table = dynamodb.Table(get_table_name('movement', stage))
        movement_run_table = dynamodb.Table(get_table_name('movement_run', stage))
        product_table = dynamodb.Table(get_table_name('product', stage))
        variant_table = dynamodb.Table(get_table_name('variant', stage))
        user_table = dynamodb.Table(get_table_name('user', stage))
        
        # Get run info
        run_info = get_run_info(movement_run_table, user_table, run_id)
        if not run_info:
            return error_response(404, 'Run not found', [
                {'field': 'run_id', 'reason': f'No run found with id {run_id}'}
            ])
        
        # Get all movements for this run
        movements = get_movements_for_run(movement_table, run_id)
        
        # Enrich movements with product and variant data
        enriched_movements = enrich_movements_data(
            movements, product_table, variant_table
        )
        
        return {
            'statusCode': 200,
            'headers': {
                'Content-Type': 'application/json',
                'Access-Control-Allow-Origin': '*'
            },
            'body': json.dumps({
                'status': 'success',
                'data': {
                    'run_info': run_info,
                    'movements': enriched_movements
                }
            }, cls=CustomJSONEncoder)
        }
        
    except Exception as e:
        print(f"Error in get_run_details: {str(e)}")
        return error_response(500, f'Error retrieving run details: {str(e)}')



def get_run_info(movement_run_table, user_table, run_id):
    """Get run information from movement_run table"""
    try:
        response = movement_run_table.get_item(Key={'id': run_id})
        
        if 'Item' not in response:
            return None
        
        run_item = response['Item']
        
        # Get user information
        user_name = 'Unknown User'
        user_id = run_item.get('user_id')
        
        if user_id:
            try:
                user_response = user_table.get_item(Key={'id': user_id})
                
                if 'Item' in user_response:
                    user_item = user_response['Item']
                    
                    # Try different possible name fields, starting with username
                    user_name = (user_item.get('username') or 
                               user_item.get('name') or 
                               user_item.get('display_name') or 
                               user_item.get('full_name') or 
                               'Unknown User')
                    
            except Exception as e:
                print(f"Error looking up user {user_id}: {str(e)}")
                pass  # Use default if user lookup fails
        
        return {
            'id': run_item['id'],
            'created_datetime': run_item.get('created_datetime'),
            'movement_type': run_item.get('movement_type'),
            'user_id': user_id,
            'user_name': user_name,
            'items_count': int(run_item.get('items_count', 0)),
            'status': run_item.get('status', 'unknown'),
            'message': run_item.get('message', '')
        }
        
    except Exception as e:
        print(f"Error getting run info: {str(e)}")
        return None

def get_movements_for_run(movement_table, run_id):
    """Get all movements for a specific run"""
    try:
        # Query using GSI on run_id if available, otherwise scan with filter
        response = movement_table.scan(
            FilterExpression='run_id = :run_id',
            ExpressionAttributeValues={':run_id': run_id}
        )
        
        movements = response.get('Items', [])
        
        # Handle pagination if needed
        while 'LastEvaluatedKey' in response:
            response = movement_table.scan(
                FilterExpression='run_id = :run_id',
                ExpressionAttributeValues={':run_id': run_id},
                ExclusiveStartKey=response['LastEvaluatedKey']
            )
            movements.extend(response.get('Items', []))
        
        # Sort by created_datetime
        movements.sort(key=lambda x: x.get('created_datetime', ''))
        
        return movements
        
    except Exception as e:
        print(f"Error getting movements for run: {str(e)}")
        return []

def enrich_movements_data(movements, product_table, variant_table):
    """Enrich movements with product and variant data"""
    enriched = []
    
    # Build lookups for batch efficiency
    product_cache = {}
    variant_cache = {}
    
    for movement in movements:
        # Get product data
        product_id = movement['product_id']
        if product_id not in product_cache:
            try:
                response = product_table.get_item(Key={'id': product_id})
                product_cache[product_id] = response.get('Item', {})
            except:
                product_cache[product_id] = {}
        
        product = product_cache[product_id]
        
        # Get variant data if applicable
        variant_id = movement.get('product_variant_id')
        variant = None
        if variant_id:
            if variant_id not in variant_cache:
                try:
                    response = variant_table.get_item(Key={'id': variant_id})
                    variant_cache[variant_id] = response.get('Item', {})
                except:
                    variant_cache[variant_id] = {}
            variant = variant_cache[variant_id]
        
        # Calculate required_recount for count movements
        required_recount = None
        movement_type = movement.get('movement_type')
        quantity = float(movement.get('quantity', 0))
        
        if movement_type == 'count':
            # For count movements, check if there's a discrepancy
            discrepancy = abs(quantity)  # quantity represents the difference found
            required_recount = discrepancy > 0
        
        # Build enriched movement with required fields
        enriched_movement = {
            'id': movement['id'],
            'product_name': product.get('name', 'Unknown Product'),
            'variant_name': variant.get('name') if variant else None,
            'movement_type': movement_type,
            'quantity': quantity,
            'previous_quantity': float(movement.get('previous_quantity', 0)),
            'new_quantity': float(movement.get('new_quantity', 0)),
            'required_recount': required_recount
        }
        
        enriched.append(enriched_movement)
    
    return enriched


def error_response(status_code, message, errors=None):
    """Generate error response"""
    response_body = {
        'status': 'error',
        'message': message
    }
    
    if errors:
        response_body['errors'] = errors
    
    return {
        'statusCode': status_code,
        'headers': {
            'Content-Type': 'application/json',
            'Access-Control-Allow-Origin': '*'
        },
        'body': json.dumps(response_body)
    }
