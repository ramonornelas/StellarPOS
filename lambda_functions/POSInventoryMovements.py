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
            'movement_run': os.getenv('TEST_INVENTORY_MOVEMENT_RUN_TABLE', 'test_inventory_movement_run')
        }
    else:
        table_names = {
            'product': os.getenv('POS_PRODUCT_TABLE', 'POS_product'),
            'variant': os.getenv('POS_PRODUCT_VARIANT_TABLE', 'POS_product_variant'),
            'movement': os.getenv('INVENTORY_MOVEMENT_TABLE', 'inventory_movement'),
            'movement_run': os.getenv('INVENTORY_MOVEMENT_RUN_TABLE', 'inventory_movement_run')
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
    # Detect HTTP method from different possible locations in the event
    http_method = None
    
    # Check different possible method fields based on API Gateway type
    if 'httpMethod' in event:
        http_method = event['httpMethod']
    elif 'requestContext' in event and 'httpMethod' in event['requestContext']:
        http_method = event['requestContext']['httpMethod']
    elif 'requestContext' in event and 'http' in event['requestContext'] and 'method' in event['requestContext']['http']:
        http_method = event['requestContext']['http']['method']
    
    # Only allow POST method (if method detection works)
    if http_method and http_method != 'POST':
        return {
            'statusCode': 405,
            'headers': {
                'Content-Type': 'application/json',
                'Access-Control-Allow-Origin': '*',
                'Access-Control-Allow-Methods': 'POST',
                'Access-Control-Allow-Headers': 'Content-Type'
            },
            'body': json.dumps({
                'message': 'Method not allowed',
                'allowed_method': 'POST',
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
        # Parse request body
        body = json.loads(event.get('body', '{}'))
        
        # Validate required fields
        validation_error = validate_request(body)
        if validation_error:
            return {
                'statusCode': 400,
                'headers': {
                    'Content-Type': 'application/json',
                    'Access-Control-Allow-Origin': '*'
                },
                'body': json.dumps({'message': validation_error})
            }
        
        # Process inventory movement
        return process_inventory_movement(body, stage)
        
    except json.JSONDecodeError:
        return {
            'statusCode': 400,
            'headers': {
                'Content-Type': 'application/json',
                'Access-Control-Allow-Origin': '*'
            },
            'body': json.dumps({'message': 'Invalid JSON in request body'})
        }
    except Exception as e:
        print(f"Error: {str(e)}")
        return {
            'statusCode': 500,
            'headers': {
                'Content-Type': 'application/json',
                'Access-Control-Allow-Origin': '*'
            },
            'body': json.dumps({'message': 'Internal server error'})
        }

def validate_request(body):
    """Validate request body"""
    if 'movement_type' not in body:
        return 'movement_type is required'
    
    if body['movement_type'] not in ['addition', 'adjustment', 'count']:
        return 'movement_type must be one of: addition, adjustment, count'
    
    if 'items' not in body or not isinstance(body['items'], list) or len(body['items']) == 0:
        return 'items array is required and must not be empty'
    
    if 'user_id' not in body:
        return 'user_id is required'
    
    for i, item in enumerate(body['items']):
        if 'product_id' not in item:
            return f'product_id is required for item {i}'
        
        if 'quantity' not in item:
            return f'quantity is required for item {i}'
        
        try:
            float(item['quantity'])
        except (ValueError, TypeError):
            return f'quantity must be a number for item {i}'
    
    return None

def process_inventory_movement(body, stage):
    """Process the inventory movement request"""
    movement_type = body['movement_type']
    apply = body.get('apply', False)  # Default to false for safety
    user_id = body['user_id']
    notes = body.get('notes', '')
    items = body['items']
    
    # Generate run ID
    run_id = str(uuid.uuid4())
    created_datetime = datetime.utcnow()
    
    # Get table references
    product_table = dynamodb.Table(get_table_name('product', stage))
    variant_table = dynamodb.Table(get_table_name('variant', stage))
    movement_table = dynamodb.Table(get_table_name('movement', stage))
    movement_run_table = dynamodb.Table(get_table_name('movement_run', stage))
    
    try:
        # Validate items and prepare movement data
        validated_items, validation_errors = validate_and_prepare_items(
            items, product_table, variant_table, movement_type
        )
        
        if validation_errors:
            # Create error run record
            movement_run_table.put_item(Item={
                'id': run_id,
                'created_datetime': created_datetime.isoformat() + 'Z',
                'apply': apply,
                'movement_type': movement_type,
                'items_count': len(items),
                'user_id': user_id,
                'status': 'error',
                'error_count': len(validation_errors),
                'message': 'Validation failed'
            })
            
            return {
                'statusCode': 400,
                'headers': {
                    'Content-Type': 'application/json',
                    'Access-Control-Allow-Origin': '*'
                },
                'body': json.dumps({
                    'status': 'error',
                    'applied': False,
                    'run_id': run_id,
                    'message': 'One or more inventory movements failed. No changes were applied.',
                    'errors': validation_errors
                }, cls=CustomJSONEncoder)
            }
        
        if not apply:
            # Validation/dry-run mode
            return handle_validation_mode(
                validated_items, movement_type, run_id, created_datetime, 
                user_id, movement_run_table
            )
        else:
            # Apply mode - execute the movements
            return handle_apply_mode(
                validated_items, movement_type, notes, run_id, created_datetime,
                user_id, product_table, variant_table, movement_table, movement_run_table
            )
            
    except Exception as e:
        # Create error run record
        try:
            movement_run_table.put_item(Item={
                'id': run_id,
                'created_datetime': created_datetime.isoformat() + 'Z',
                'apply': apply,
                'movement_type': movement_type,
                'items_count': len(items),
                'user_id': user_id,
                'status': 'error',
                'error_count': 1,
                'message': f'Internal error: {str(e)}'
            })
        except:
            pass
            
        raise e

def validate_and_prepare_items(items, product_table, variant_table, movement_type):
    """Validate items and prepare movement data"""
    validated_items = []
    errors = []
    
    for item in items:
        product_id = item['product_id']
        variant_id = item.get('product_variant_id')
        quantity = Decimal(str(item['quantity']))
        
        try:
            # Get product
            product_response = product_table.get_item(Key={'id': product_id})
            if 'Item' not in product_response:
                errors.append({'product_id': product_id, 'reason': 'Product not found'})
                continue
                
            product = product_response['Item']
            if product.get('is_deleted', False):
                errors.append({'product_id': product_id, 'reason': 'Product deleted'})
                continue
            
            # Handle variant if specified
            variant = None
            if variant_id:
                variant_response = variant_table.get_item(Key={'id': variant_id})
                if 'Item' not in variant_response:
                    errors.append({'product_variant_id': variant_id, 'reason': 'Variant not found'})
                    continue
                    
                variant = variant_response['Item']
                if variant.get('is_deleted', False):
                    errors.append({'product_variant_id': variant_id, 'reason': 'Variant deleted'})
                    continue
                    
                if variant['product_id'] != product_id:
                    errors.append({'product_variant_id': variant_id, 'reason': 'Variant does not belong to specified product'})
                    continue
            
            # Get current stock
            if variant:
                current_stock = Decimal(str(variant.get('stock_available', 0)))
            else:
                current_stock = Decimal(str(product.get('stock_available', 0)))
            
            # Calculate new stock and movement quantity based on movement type
            # Note: For count movements, the input 'quantity' represents the actual count,
            # but the movement record should store the delta as 'quantity'
            if movement_type == 'count':
                new_stock = quantity  # quantity is the actual count
                movement_quantity = new_stock - current_stock  # delta between previous and new
            else:  # addition or adjustment
                movement_quantity = quantity  # quantity is the delta
                new_stock = current_stock + quantity
            
            # Validate new stock is not negative
            if new_stock < 0:
                errors.append({
                    'product_id': product_id,
                    'product_variant_id': variant_id,
                    'reason': f'Resulting stock would be negative: {new_stock}'
                })
                continue
            
            # For count movements, only create movement record if there's an actual change
            if movement_type == 'count' and movement_quantity == 0:
                # Skip creating movement record for zero delta count movements
                continue
            
            validated_items.append({
                'product_id': product_id,
                'product_variant_id': variant_id,
                'product': product,
                'variant': variant,
                'quantity': movement_quantity,  # delta for count, input value for addition/adjustment
                'previous_quantity': current_stock,
                'new_quantity': new_stock
            })
            
        except Exception as e:
            errors.append({
                'product_id': product_id, 
                'product_variant_id': variant_id,
                'reason': f'Processing error: {str(e)}'
            })
    
    return validated_items, errors

def handle_validation_mode(validated_items, movement_type, run_id, created_datetime, user_id, movement_run_table):
    """Handle validation/dry-run mode"""
    # Create validation run record
    movement_run_table.put_item(Item={
        'id': run_id,
        'created_datetime': created_datetime.isoformat() + 'Z',
        'apply': False,
        'movement_type': movement_type,
        'items_count': len(validated_items),
        'user_id': user_id,
        'status': 'validation_only',
        'error_count': 0,
        'message': 'Validation completed successfully'
    })
    
    if movement_type == 'count':
        # For count operations, return needs_recount list
        needs_recount = []
        for item in validated_items:
            if item['previous_quantity'] != item['new_quantity']:
                product_name = item['product']['name']
                if item['variant']:
                    product_name += f" — {item['variant']['name']}"
                    
                recount_item = {
                    'product_id': item['product_id'],
                    'label': product_name
                }
                
                # Include product_variant_id if it exists
                if item['product_variant_id']:
                    recount_item['product_variant_id'] = item['product_variant_id']
                    
                needs_recount.append(recount_item)
        
        return {
            'statusCode': 200,
            'headers': {
                'Content-Type': 'application/json',
                'Access-Control-Allow-Origin': '*'
            },
            'body': json.dumps({
                'status': 'success',
                'applied': False,
                'run_id': run_id,
                'movement_type': movement_type,
                'needs_recount': needs_recount,
                'message': f'Recount required for {len(needs_recount)} product(s)'
            }, cls=CustomJSONEncoder)
        }
    else:
        # For addition/adjustment, return simulation
        simulation = []
        for item in validated_items:
            simulation.append({
                'product_id': item['product_id'],
                'product_variant_id': item['product_variant_id'],
                'previous_quantity': float(item['previous_quantity']),
                'new_quantity': float(item['new_quantity'])
            })
        
        return {
            'statusCode': 200,
            'headers': {
                'Content-Type': 'application/json',
                'Access-Control-Allow-Origin': '*'
            },
            'body': json.dumps({
                'status': 'success',
                'applied': False,
                'run_id': run_id,
                'movement_type': movement_type,
                'simulation': simulation,
                'message': 'Validation completed successfully'
            }, cls=CustomJSONEncoder)
        }

def handle_apply_mode(validated_items, movement_type, notes, run_id, created_datetime, 
                     user_id, product_table, variant_table, movement_table, movement_run_table):
    """Handle apply mode - execute the movements transactionally"""
    
    movements = []
    
    try:
        # Execute movements using DynamoDB transactions for atomicity
        # Group operations by batches (max 25 items per transaction)
        batch_size = 25
        for i in range(0, len(validated_items), batch_size):
            batch = validated_items[i:i + batch_size]
            
            # Prepare transaction items for this batch
            transact_items = []
            
            for item in batch:
                # Create movement record
                movement_id = str(uuid.uuid4())
                movement = {
                    'id': movement_id,
                    'product_id': item['product_id'],
                    'product_variant_id': item['product_variant_id'],
                    'movement_type': movement_type,
                    'quantity': item['quantity'],
                    'previous_quantity': item['previous_quantity'],
                    'new_quantity': item['new_quantity'],
                    'notes': notes,
                    'user_id': user_id,
                    'created_datetime': created_datetime.isoformat() + 'Z',
                    'updated_datetime': created_datetime.isoformat() + 'Z',
                    'run_id': run_id
                }
                
                # Add to movements list for response
                movements.append(movement)
                
                # Add movement record creation to transaction
                transact_items.append({
                    'Put': {
                        'TableName': movement_table.name,
                        'Item': movement
                    }
                })
                
                # Add stock update to transaction
                if item['product_variant_id']:
                    # Update variant stock
                    transact_items.append({
                        'Update': {
                            'TableName': variant_table.name,
                            'Key': {'id': item['product_variant_id']},
                            'UpdateExpression': 'SET stock_available = :new_stock',
                            'ExpressionAttributeValues': {':new_stock': item['new_quantity']},
                            'ConditionExpression': 'attribute_exists(id)'  # Ensure item still exists
                        }
                    })
                else:
                    # Update product stock
                    transact_items.append({
                        'Update': {
                            'TableName': product_table.name,
                            'Key': {'id': item['product_id']},
                            'UpdateExpression': 'SET stock_available = :new_stock',
                            'ExpressionAttributeValues': {':new_stock': item['new_quantity']},
                            'ConditionExpression': 'attribute_exists(id)'  # Ensure item still exists
                        }
                    })
            
            # Execute transaction for this batch
            try:
                dynamodb.meta.client.transact_write_items(TransactItems=transact_items)
            except ClientError as e:
                if e.response['Error']['Code'] == 'TransactionCanceledException':
                    # Handle transaction cancellation (e.g., condition failed)
                    raise Exception(f"Transaction failed: {e.response['Error']['Message']}")
                else:
                    raise
        
        # Create success run record
        movement_run_table.put_item(Item={
            'id': run_id,
            'created_datetime': created_datetime.isoformat() + 'Z',
            'apply': True,
            'movement_type': movement_type,
            'items_count': len(validated_items),
            'user_id': user_id,
            'status': 'success',
            'error_count': 0,
            'message': 'Inventory updated successfully'
        })
        
        return {
            'statusCode': 200,
            'headers': {
                'Content-Type': 'application/json',
                'Access-Control-Allow-Origin': '*'
            },
            'body': json.dumps({
                'status': 'success',
                'applied': True,
                'run_id': run_id,
                'message': 'Inventory updated successfully.',
                'movements': movements
            }, cls=CustomJSONEncoder)
        }
        
    except Exception as e:
        # Create error run record
        movement_run_table.put_item(Item={
            'id': run_id,
            'created_datetime': created_datetime.isoformat() + 'Z',
            'apply': True,
            'movement_type': movement_type,
            'items_count': len(validated_items),
            'user_id': user_id,
            'status': 'error',
            'error_count': 1,
            'message': f'Transaction failed: {str(e)}'
        })
        
        return {
            'statusCode': 500,
            'headers': {
                'Content-Type': 'application/json',
                'Access-Control-Allow-Origin': '*'
            },
            'body': json.dumps({
                'status': 'error',
                'applied': False,
                'run_id': run_id,
                'message': f'Transaction failed: {str(e)}'
            }, cls=CustomJSONEncoder)
        }