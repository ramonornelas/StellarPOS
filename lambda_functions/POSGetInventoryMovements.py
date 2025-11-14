"""
AWS Lambda function for retrieving inventory movements with filtering and pagination.

Endpoint:
- GET /inventory/movements - List movements with filtering and pagination

Supports filtering by movement_type, date ranges, user_id, product_search, and run_id.
Includes proper pagination and comprehensive error handling.
"""

import json
import boto3
from botocore.exceptions import BotoCoreError, ClientError
import os
import uuid
from datetime import datetime
from decimal import Decimal
import base64
from urllib.parse import unquote
import unicodedata
import re

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

def normalize_text_for_search(text):
    """
    Normalize text for case-insensitive and accent-insensitive search
    Converts 'Ácido' -> 'acido', 'SHAMPOO' -> 'shampoo', etc.
    """
    if not text:
        return ""
    
    # Convert to lowercase
    text = text.lower()
    
    # Remove accents/diacritics using Unicode normalization
    # NFD = Normal Form Decomposed (separates base characters from accents)
    text = unicodedata.normalize('NFD', text)
    
    # Remove combining characters (accents)
    text = ''.join(char for char in text if unicodedata.category(char) != 'Mn')
    
    # Optional: remove extra whitespace and special characters for cleaner matching
    text = re.sub(r'\s+', ' ', text).strip()
    
    return text

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

    try:
        # Handle GET /inventory/movements endpoint only
        return get_movements_list(event, stage)
        
    except Exception as e:
        print(f"Error: {str(e)}")
        return error_response(500, 'Internal server error')

def get_movements_list(event, stage):
    """Get paginated list of movements with filtering"""
    try:
        # Parse query parameters
        query_params = event.get('queryStringParameters') or {}
        
        # Validate and extract parameters
        filters, validation_errors = validate_list_parameters(query_params)
        if validation_errors:
            return {
                'statusCode': 400,
                'headers': {
                    'Content-Type': 'application/json',
                    'Access-Control-Allow-Origin': '*'
                },
                'body': json.dumps({
                    'status': 'error',
                    'message': 'Invalid query parameters',
                    'errors': validation_errors
                })
            }
        
        # Get table references
        movement_table = dynamodb.Table(get_table_name('movement', stage))
        product_table = dynamodb.Table(get_table_name('product', stage))
        variant_table = dynamodb.Table(get_table_name('variant', stage))
        user_table = dynamodb.Table(get_table_name('user', stage))
        movement_run_table = dynamodb.Table(get_table_name('movement_run', stage))
        
        # Add stage to filters for product search
        filters['stage'] = stage
        
        # Query movements with filters
        movements, total_count = query_movements(movement_table, filters)
        
        # Enrich movements with product, variant, and user data
        enriched_movements = enrich_movements_data(
            movements, product_table, variant_table, user_table, movement_run_table
        )
        
        # Calculate pagination metadata
        page = filters['page']
        limit = filters['limit']
        total_pages = (total_count + limit - 1) // limit
        
        pagination = {
            'current_page': page,
            'total_pages': total_pages,
            'total_count': total_count,
            'page_size': limit,
            'has_next': page < total_pages,
            'has_previous': page > 1
        }
        
        # Prepare filters_applied for response
        filters_applied = {
            'movement_type': filters.get('movement_type'),
            'date_from': filters.get('date_from'),
            'date_to': filters.get('date_to'),
            'user_id': filters.get('user_id'),
            'product_search': filters.get('product_search'),
            'run_id': filters.get('run_id')
        }
        
        return {
            'statusCode': 200,
            'headers': {
                'Content-Type': 'application/json',
                'Access-Control-Allow-Origin': '*'
            },
            'body': json.dumps({
                'status': 'success',
                'data': {
                    'movements': enriched_movements,
                    'pagination': pagination,
                    'filters_applied': filters_applied
                }
            }, cls=CustomJSONEncoder)
        }
        
    except Exception as e:
        print(f"Error in get_movements_list: {str(e)}")
        return error_response(500, f'Error retrieving movements: {str(e)}')



def validate_list_parameters(query_params):
    """Validate and parse query parameters for movements list"""
    filters = {}
    errors = []
    
    # Page (default: 1)
    try:
        page = int(query_params.get('page', 1))
        if page < 1:
            errors.append({'field': 'page', 'reason': 'Page must be >= 1'})
        else:
            filters['page'] = page
    except ValueError:
        errors.append({'field': 'page', 'reason': 'Page must be an integer'})
        filters['page'] = 1
    
    # Limit (default: 50, max: 1000)
    try:
        limit = int(query_params.get('limit', 50))
        if limit < 1:
            errors.append({'field': 'limit', 'reason': 'Limit must be >= 1'})
        elif limit > 1000:
            errors.append({'field': 'limit', 'reason': 'Limit must be <= 1000'})
        else:
            filters['limit'] = limit
    except ValueError:
        errors.append({'field': 'limit', 'reason': 'Limit must be an integer'})
        filters['limit'] = 50
    
    # Movement type
    movement_type = query_params.get('movement_type')
    if movement_type:
        if movement_type not in ['addition', 'adjustment', 'count', 'return', 'sale']:
            errors.append({'field': 'movement_type', 'reason': 'Invalid movement type'})
        else:
            filters['movement_type'] = movement_type
    
    # Date from
    date_from = query_params.get('date_from')
    if date_from:
        try:
            datetime.fromisoformat(date_from.replace('Z', '+00:00'))
            filters['date_from'] = date_from
        except ValueError:
            errors.append({'field': 'date_from', 'reason': 'Invalid date format (use ISO 8601)'})
    
    # Date to
    date_to = query_params.get('date_to')
    if date_to:
        try:
            datetime.fromisoformat(date_to.replace('Z', '+00:00'))
            filters['date_to'] = date_to
        except ValueError:
            errors.append({'field': 'date_to', 'reason': 'Invalid date format (use ISO 8601)'})
    
    # User ID
    user_id = query_params.get('user_id')
    if user_id:
        try:
            uuid.UUID(user_id)
            filters['user_id'] = user_id
        except ValueError:
            errors.append({'field': 'user_id', 'reason': 'Invalid user ID format'})
    
    # Product search
    product_search = query_params.get('product_search')
    if product_search:
        # URL decode the search term
        filters['product_search'] = unquote(product_search).strip()
    
    # Run ID
    run_id = query_params.get('run_id')
    if run_id:
        try:
            uuid.UUID(run_id)
            filters['run_id'] = run_id
        except ValueError:
            errors.append({'field': 'run_id', 'reason': 'Invalid run ID format'})
    
    return filters, errors

def query_movements(movement_table, filters):
    """Query movements table with filters and pagination"""
    # Build filter expression
    filter_expressions = []
    expression_values = {}
    expression_names = {}
    
    if filters.get('movement_type'):
        filter_expressions.append('movement_type = :movement_type')
        expression_values[':movement_type'] = filters['movement_type']
    
    if filters.get('date_from'):
        filter_expressions.append('created_datetime >= :date_from')
        expression_values[':date_from'] = filters['date_from']
    
    if filters.get('date_to'):
        filter_expressions.append('created_datetime <= :date_to')
        expression_values[':date_to'] = filters['date_to']
    
    if filters.get('user_id'):
        filter_expressions.append('user_id = :user_id')
        expression_values[':user_id'] = filters['user_id']
    
    if filters.get('run_id'):
        filter_expressions.append('run_id = :run_id')
        expression_values[':run_id'] = filters['run_id']
    
    # Build scan parameters
    scan_params = {}
    if filter_expressions:
        scan_params['FilterExpression'] = ' AND '.join(filter_expressions)
        scan_params['ExpressionAttributeValues'] = expression_values
        if expression_names:
            scan_params['ExpressionAttributeNames'] = expression_names
    
    # Execute scan to get all matching items (for total count)
    all_items = []
    last_evaluated_key = None
    
    while True:
        if last_evaluated_key:
            scan_params['ExclusiveStartKey'] = last_evaluated_key
        
        response = movement_table.scan(**scan_params)
        all_items.extend(response.get('Items', []))
        
        last_evaluated_key = response.get('LastEvaluatedKey')
        if not last_evaluated_key:
            break
    
    # Apply product search filter (requires loading product data)
    if filters.get('product_search'):
        # Need to pass stage for product search filtering
        stage = filters.get('stage', 'prod')
        all_items = filter_by_product_search(all_items, filters['product_search'], stage)
    
    # Sort by created_datetime descending
    all_items.sort(key=lambda x: x.get('created_datetime', ''), reverse=True)
    
    # Apply pagination
    page = filters['page']
    limit = filters['limit']
    start_index = (page - 1) * limit
    end_index = start_index + limit
    
    paginated_items = all_items[start_index:end_index]
    total_count = len(all_items)
    
    return paginated_items, total_count

def filter_by_product_search(movements, search_term, stage):
    """Filter movements by product name search"""
    if not search_term:
        return movements
    
    # Get unique product and variant IDs from movements
    product_ids = set()
    variant_ids = set()
    
    for movement in movements:
        product_ids.add(movement['product_id'])
        if movement.get('product_variant_id'):
            variant_ids.add(movement['product_variant_id'])
    
    # Get product and variant data
    product_table = dynamodb.Table(get_table_name('product', stage))
    variant_table = dynamodb.Table(get_table_name('variant', stage))
    
    # Build product name lookup
    product_names = {}
    variant_names = {}
    
    # Batch get products
    for product_id in product_ids:
        try:
            response = product_table.get_item(Key={'id': product_id})
            if 'Item' in response:
                # Normalize product name for search
                product_names[product_id] = normalize_text_for_search(
                    response['Item'].get('name', '')
                )
        except:
            continue
    
    # Batch get variants
    for variant_id in variant_ids:
        try:
            response = variant_table.get_item(Key={'id': variant_id})
            if 'Item' in response:
                # Normalize variant name for search
                variant_names[variant_id] = normalize_text_for_search(
                    response['Item'].get('name', '')
                )
        except:
            continue
    
    # Normalize search term
    search_term_normalized = normalize_text_for_search(search_term)
    filtered_movements = []
    
    for movement in movements:
        product_name = product_names.get(movement['product_id'], '')
        variant_name = variant_names.get(movement.get('product_variant_id'), '')
        
        # Check if normalized search term is in normalized product/variant names
        if (search_term_normalized in product_name or 
            search_term_normalized in variant_name):
            filtered_movements.append(movement)
    
    return filtered_movements

def enrich_movements_data(movements, product_table, variant_table, user_table, movement_run_table):
    """Enrich movements with product, variant, user, and run data"""
    enriched = []
    
    # Build lookups for batch efficiency
    product_cache = {}
    variant_cache = {}
    user_cache = {}
    run_cache = {}
    
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
        
        # Get user data
        user_id = movement.get('user_id')
        if user_id and user_id not in user_cache:
            try:
                response = user_table.get_item(Key={'id': user_id})
                user_cache[user_id] = response.get('Item', {})
            except:
                user_cache[user_id] = {}
        
        user = user_cache.get(user_id, {})
        
        # Get run data
        run_id = movement.get('run_id')
        if run_id and run_id not in run_cache:
            try:
                response = movement_run_table.get_item(Key={'id': run_id})
                run_cache[run_id] = response.get('Item', {})
            except:
                run_cache[run_id] = {}
        
        run_data = run_cache.get(run_id, {})
        
        # Calculate required_recount for count movements
        required_recount = None
        if movement.get('movement_type') == 'count':
            quantity = float(movement.get('quantity', 0))
            required_recount = abs(quantity) > 0
        
        # Build enriched movement
        enriched_movement = {
            'id': movement['id'],
            'product_id': movement['product_id'],
            'product_name': product.get('name', 'Unknown Product'),
            'product_variant_id': variant_id,
            'variant_name': variant.get('name') if variant else None,
            'movement_type': movement.get('movement_type'),
            'quantity': float(movement.get('quantity', 0)),
            'previous_quantity': float(movement.get('previous_quantity', 0)),
            'new_quantity': float(movement.get('new_quantity', 0)),
            'notes': movement.get('notes', ''),
            'user_id': user_id,
            'user_name': user.get('name', 'Unknown User'),
            'created_datetime': movement.get('created_datetime'),
            'run_id': run_id,
            'run_type': run_data.get('movement_type', 'manual'),
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