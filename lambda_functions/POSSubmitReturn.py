"""
AWS Lambda function for processing product returns and updating inventory.

Endpoint:
- POST /returns - Process a product return, update inventory, and create return records

Validates request body, verifies products are in the original order, updates inventory,
creates return ticket and product records, and logs inventory movements.
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
            'order': os.getenv('TEST_POS_ORDER_TABLE', 'test_POS_orderTicket'),
            'order_product': os.getenv('TEST_POS_ORDER_PRODUCT_TABLE', 'test_POS_orderProduct'),
            'product': os.getenv('TEST_POS_PRODUCT_TABLE', 'test_POS_product'),
            'variant': os.getenv('TEST_POS_PRODUCT_VARIANT_TABLE', 'test_POS_product_variant'),
            'return_ticket': os.getenv('TEST_POS_RETURN_TICKET_TABLE', 'test_POS_returnTicket'),
            'return_product': os.getenv('TEST_POS_RETURN_PRODUCT_TABLE', 'test_POS_returnProduct'),
            'movement': os.getenv('TEST_INVENTORY_MOVEMENT_TABLE', 'test_inventory_movement'),
            'user': os.getenv('TEST_USER_TABLE', 'test_stellar_user')
        }
    else:
        table_names = {
            'order': os.getenv('POS_ORDER_TABLE', 'POS_orderTicket'),
            'order_product': os.getenv('POS_ORDER_PRODUCT_TABLE', 'POS_orderProduct'),
            'product': os.getenv('POS_PRODUCT_TABLE', 'POS_product'),
            'variant': os.getenv('POS_PRODUCT_VARIANT_TABLE', 'POS_product_variant'),
            'return_ticket': os.getenv('POS_RETURN_TICKET_TABLE', 'POS_returnTicket'),
            'return_product': os.getenv('POS_RETURN_PRODUCT_TABLE', 'POS_returnProduct'),
            'movement': os.getenv('INVENTORY_MOVEMENT_TABLE', 'inventory_movement'),
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

def generate_consecutive_ticket_number(return_ticket_table, current_datetime, stage):
    """
    Generate consecutive ticket number for the day in format #R001, #R002, etc.
    
    Args:
        return_ticket_table: DynamoDB table reference
        current_datetime: Current datetime string in ISO format
        stage: Environment stage (test/prod)
    
    Returns:
        str: Consecutive ticket number (e.g., "#R001")
    """
    try:
        # Extract date from datetime (YYYY-MM-DD)
        current_date = current_datetime.split('T')[0]
        
        # Query all return tickets created today
        # Note: DynamoDB doesn't have a direct date filter, so we scan and filter
        response = return_ticket_table.scan(
            FilterExpression='begins_with(created_datetime, :date)',
            ExpressionAttributeValues={':date': current_date}
        )
        
        tickets_today = response.get('Items', [])
        
        # Handle pagination if there are many returns
        while 'LastEvaluatedKey' in response:
            response = return_ticket_table.scan(
                FilterExpression='begins_with(created_datetime, :date)',
                ExpressionAttributeValues={':date': current_date},
                ExclusiveStartKey=response['LastEvaluatedKey']
            )
            tickets_today.extend(response.get('Items', []))
        
        # Find the highest ticket number for today
        max_number = 0
        for ticket in tickets_today:
            ticket_num = ticket.get('ticket', '')
            if ticket_num and ticket_num.startswith('#R'):
                try:
                    # Extract number from format #R001
                    num = int(ticket_num[2:])
                    max_number = max(max_number, num)
                except (ValueError, IndexError):
                    continue
        
        # Generate next consecutive number
        next_number = max_number + 1
        ticket_number = f"#R{next_number:03d}"  # Format as #R001, #R002, etc.
        
        print(f"Generated ticket number: {ticket_number} (found {len(tickets_today)} tickets today)")
        return ticket_number
        
    except Exception as e:
        print(f"Error generating ticket number: {str(e)}")
        # Fallback to timestamp-based ticket if generation fails
        timestamp = datetime.utcnow().strftime('%Y%m%d%H%M%S')
        return f"#R{timestamp}"

def validate_no_duplicate_returns(order_product_table, return_products, order_id):
    """
    Validate that products being returned haven't been returned before.
    
    Args:
        order_product_table: DynamoDB table reference
        return_products: List of products to return (each with 'id' and optional 'variant_id')
        order_id: Original order ID
    
    Returns:
        list: Validation errors if duplicates found, empty list otherwise
    """
    errors = []
    
    try:
        # Get all order products for this order
        response = order_product_table.scan(
            FilterExpression='orderTicket_id = :order_id',
            ExpressionAttributeValues={':order_id': order_id}
        )
        
        order_products = response.get('Items', [])
        
        # Handle pagination
        while 'LastEvaluatedKey' in response:
            response = order_product_table.scan(
                FilterExpression='orderTicket_id = :order_id',
                ExpressionAttributeValues={':order_id': order_id},
                ExclusiveStartKey=response['LastEvaluatedKey']
            )
            order_products.extend(response.get('Items', []))
        
        # Check each product being returned
        for i, return_product in enumerate(return_products):
            product_id = return_product['id']
            return_variant_id = return_product.get('variant_id')
            
            # Normalize variant ID
            normalized_return_variant = normalize_variant_id(product_id, return_variant_id)
            
            # Find matching order product
            for order_product in order_products:
                order_product_id = order_product.get('product_id')
                order_variant_id = order_product.get('product_variant_id')
                
                # Normalize order variant ID
                normalized_order_variant = normalize_variant_id(order_product_id, order_variant_id)
                
                # Check if this is the matching product
                if order_product_id == product_id and normalized_order_variant == normalized_return_variant:
                    # Check if this product was already returned
                    existing_return_ticket_id = order_product.get('returnTicket_id')
                    
                    if existing_return_ticket_id:
                        # Product was already returned - this is a duplicate
                        existing_return_date = order_product.get('returnTicket_date', 'Unknown')
                        existing_return_ticket = order_product.get('returnTicket_ticket', 'Unknown')
                        
                        variant_msg = f" (Variant: {normalized_return_variant})" if normalized_return_variant else ""
                        
                        errors.append({
                            'field': f'products[{i}]',
                            'reason': (
                                f'Product {product_id}{variant_msg} has already been returned. '
                                f'Original return: Ticket {existing_return_ticket}, '
                                f'Date: {existing_return_date}, '
                                f'Return ID: {existing_return_ticket_id}'
                            )
                        })
                    break
        
        return errors
        
    except Exception as e:
        print(f"Error validating duplicate returns: {str(e)}")
        # Return empty errors to allow process to continue if validation fails
        # The business logic validation will catch other issues
        return []

def update_order_products_with_return_info(order_product_table, order_id, return_products, 
                                          return_ticket_id, return_date, ticket_number):
    """
    Update POS_orderProduct records to mark products as returned.
    
    Args:
        order_product_table: DynamoDB table reference
        order_id: Original order ID
        return_products: List of returned products (each with 'id' and optional 'variant_id')
        return_ticket_id: ID of the return ticket
        return_date: Date of the return (ISO format datetime string)
        ticket_number: Consecutive ticket number (e.g., "#R001")
    
    Returns:
        bool: True if successful, False otherwise
    """
    try:
        print(f"Updating order products with return info - Order: {order_id}, Ticket: {ticket_number}")
        
        # Get all order products for this order
        response = order_product_table.scan(
            FilterExpression='orderTicket_id = :order_id',
            ExpressionAttributeValues={':order_id': order_id}
        )
        
        order_products = response.get('Items', [])
        
        # Handle pagination
        while 'LastEvaluatedKey' in response:
            response = order_product_table.scan(
                FilterExpression='orderTicket_id = :order_id',
                ExpressionAttributeValues={':order_id': order_id},
                ExclusiveStartKey=response['LastEvaluatedKey']
            )
            order_products.extend(response.get('Items', []))
        
        if not order_products:
            print(f"WARNING: No order products found for order {order_id}")
            return False
        
        # Update each returned product
        updates_made = 0
        for idx, return_product in enumerate(return_products):
            # return_product here is a record from POS_returnProduct table
            # which has 'product_id' and 'product_variant_id' fields
            product_id = return_product.get('product_id')
            return_variant_id = return_product.get('product_variant_id')
            
            if not product_id:
                print(f"WARNING: return_product missing product_id")
                continue
            
            # Normalize variant ID
            normalized_return_variant = normalize_variant_id(product_id, return_variant_id)
            
            # Find matching order product record
            found_match = False
            for order_product in order_products:
                order_product_id = order_product.get('product_id')
                order_variant_id = order_product.get('product_variant_id')
                order_product_record_id = order_product.get('id')
                
                # Normalize order variant ID
                normalized_order_variant = normalize_variant_id(order_product_id, order_variant_id)
                
                # Check if this is the matching product
                if order_product_id == product_id and normalized_order_variant == normalized_return_variant:
                    found_match = True
                    # Update this order product record with return information
                    try:
                        
                        order_product_table.update_item(
                            Key={'id': order_product_record_id},
                            UpdateExpression=(
                                'SET returnTicket_id = :return_id, '
                                'returnTicket_date = :return_date, '
                                'returnTicket_ticket = :ticket_number, '
                                'updated_datetime = :updated_datetime'
                            ),
                            ExpressionAttributeValues={
                                ':return_id': return_ticket_id,
                                ':return_date': return_date,
                                ':ticket_number': ticket_number,
                                ':updated_datetime': return_date
                            }
                        )
                        updates_made += 1
                    except Exception as update_error:
                        print(f"ERROR updating order product {order_product_record_id}: {str(update_error)}")
                        return False
                    
                    break
            
            if not found_match:
                print(f"WARNING: No matching order product found for product {product_id}")
        
        print(f"Updated {updates_made} order products with return info")
        return True
        
    except Exception as e:
        print(f"ERROR updating order products with return info: {str(e)}")
        return False


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
    
    # Only allow POST method
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
                'status': 'error',
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
        # Handle POST /returns endpoint
        return process_return(event, stage)
        
    except Exception as e:
        print(f"Error: {str(e)}")
        return error_response(500, 'Internal server error')

def process_return(event, stage):
    """Process a product return and update inventory"""
    try:
        # Parse request body
        if not event.get('body'):
            return error_response(422, 'Request body is required', [
                {'field': 'body', 'reason': 'Request body cannot be empty'}
            ])
        
        try:
            body = json.loads(event['body'])
        except json.JSONDecodeError as e:
            return error_response(422, 'Invalid JSON format', [
                {'field': 'body', 'reason': f'JSON decode error: {str(e)}'}
            ])
        
        # Validate request body
        validation_errors = validate_return_request(body)
        if validation_errors:
            return error_response(422, 'Invalid request data', validation_errors)
        
        # Get table references
        order_table = dynamodb.Table(get_table_name('order', stage))
        order_product_table = dynamodb.Table(get_table_name('order_product', stage))
        product_table = dynamodb.Table(get_table_name('product', stage))
        variant_table = dynamodb.Table(get_table_name('variant', stage))
        return_ticket_table = dynamodb.Table(get_table_name('return_ticket', stage))
        return_product_table = dynamodb.Table(get_table_name('return_product', stage))
        movement_table = dynamodb.Table(get_table_name('movement', stage))
        
        # Verify order exists
        order = get_order(order_table, body['order_id'])
        if not order:
            return error_response(400, 'Order not found', [
                {'field': 'order_id', 'reason': f'Order {body["order_id"]} does not exist'}
            ])
        
        # Get original order products
        order_products = get_order_products(order_product_table, body['order_id'])
        
        # Validate that all returned products are in the original order
        # This supports partial returns (some products), full returns (all products), 
        # or mixed quantity returns (less quantity than originally ordered)
        validation_errors = validate_products_in_order(body['products'], order_products)
        if validation_errors:
            return error_response(400, 'Invalid return products', validation_errors)
        
        # Validate that products haven't been returned before (prevent duplicate returns)
        duplicate_errors = validate_no_duplicate_returns(order_product_table, body['products'], body['order_id'])
        if duplicate_errors:
            return error_response(400, 'Duplicate return detected', duplicate_errors)
        
        # Get current timestamp
        current_datetime = datetime.utcnow().isoformat() + 'Z'
        
        # Generate consecutive ticket number for the day
        ticket_number = generate_consecutive_ticket_number(return_ticket_table, current_datetime, stage)
        
        # Create return ticket
        return_ticket_id = str(uuid.uuid4())
        return_ticket = {
            'id': return_ticket_id,
            'order_id': body['order_id'],
            'refund_method': body['refund_method'],
            'notes': body.get('notes', ''),
            'cash_register_id': body.get('cash_register_id', ''),  # From payload - current cashier processing return
            'ticket': ticket_number,  # Add consecutive ticket number
            'created_datetime': current_datetime,
            'updated_datetime': current_datetime,
            'updated_user_id': body.get('user_id', 'system')
        }
        
        # Process each returned product
        return_products = []
        inventory_updates = []
        total_return_amount = Decimal('0')
        
        for return_product in body['products']:
            # Find the original product in the order
            original_product = None
            for p in order_products:
                order_product_id = p['product_id']
                order_variant_id = p.get('product_variant_id')
                
                # Normalize variant IDs using the same logic as validation
                normalized_order_variant = normalize_variant_id(order_product_id, order_variant_id)
                normalized_return_variant = normalize_variant_id(return_product['id'], return_product.get('variant_id'))
                
                # Check for match using normalized variants
                if order_product_id == return_product['id'] and normalized_order_variant == normalized_return_variant:
                    original_product = p
                    break
            
            if not original_product:
                continue  # This should have been caught in validation
            
            # Get product details
            product_details = get_product_details(
                product_table, variant_table, 
                return_product['id'], return_product.get('variant_id')
            )
            
            quantity = Decimal(str(return_product['quantity']))
            # Try 'price' first, then 'product_price' as fallback
            product_price = Decimal(str(original_product.get('price', original_product.get('product_price', 0))))
            total_product_return = quantity * product_price
            total_return_amount += total_product_return
            
            # Create return product record
            return_product_record = {
                'id': str(uuid.uuid4()),
                'returnTicket_id': return_ticket_id,
                'product_id': return_product['id'],
                'product_variant_id': return_product.get('variant_id'),
                'product_name': product_details['product_name'],
                'quantity': quantity,
                'product_price': product_price,
                'total': total_product_return,
                'created_datetime': current_datetime,
                'updated_datetime': current_datetime,
                'updated_user_id': body.get('user_id', 'system')
            }
            return_products.append(return_product_record)
            
            # Prepare inventory update
            inventory_update = {
                'product_id': return_product['id'],
                'product_variant_id': return_product.get('variant_id'),
                'quantity': quantity,
                'product_name': product_details['product_name'],
                'current_stock': product_details['current_stock']
            }
            inventory_updates.append(inventory_update)
        
        # Update return ticket with total amount
        return_ticket['total_amount'] = total_return_amount
        
        # Execute all database operations
        success = execute_return_transaction(
            return_ticket_table, return_product_table, product_table, variant_table, movement_table,
            order_product_table, return_ticket, return_products, inventory_updates, 
            body['order_id'], ticket_number, current_datetime, body.get('user_id', 'system')
        )
        
        if not success:
            return error_response(500, 'Failed to process return transaction')
        
        return {
            'statusCode': 200,
            'headers': {
                'Content-Type': 'application/json',
                'Access-Control-Allow-Origin': '*'
            },
            'body': json.dumps({
                'status': 'success',
                'message': 'Return processed successfully',
                'data': {
                    'return_ticket_id': return_ticket_id,
                    'total_amount': float(total_return_amount),
                    'products_returned': len(return_products)
                }
            }, cls=CustomJSONEncoder)
        }
        
    except Exception as e:
        print(f"Error in process_return: {str(e)}")
        return error_response(500, f'Error processing return: {str(e)}')

def validate_return_request(body):
    """Validate the return request body"""
    errors = []
    
    # Required fields
    if not body.get('order_id'):
        errors.append({'field': 'order_id', 'reason': 'Order ID is required'})
    
    if not body.get('products'):
        errors.append({'field': 'products', 'reason': 'Products list is required'})
    elif not isinstance(body['products'], list) or len(body['products']) == 0:
        errors.append({'field': 'products', 'reason': 'Products list must be a non-empty array'})
    
    if not body.get('refund_method'):
        errors.append({'field': 'refund_method', 'reason': 'Refund method is required'})
    elif body['refund_method'] not in ['cash', 'card', 'transfer']:
        errors.append({'field': 'refund_method', 'reason': 'Refund method must be cash, card, or transfer'})
    
    if not body.get('cash_register_id'):
        errors.append({'field': 'cash_register_id', 'reason': 'Cash register ID is required'})
    
    # Validate products
    if body.get('products') and isinstance(body['products'], list):
        for i, product in enumerate(body['products']):
            if not product.get('id'):
                errors.append({'field': f'products[{i}].id', 'reason': 'Product ID is required'})
            
            if not product.get('quantity'):
                errors.append({'field': f'products[{i}].quantity', 'reason': 'Quantity is required'})
            else:
                try:
                    quantity = float(product['quantity'])
                    if quantity <= 0:
                        errors.append({'field': f'products[{i}].quantity', 'reason': 'Quantity must be greater than 0'})
                except (ValueError, TypeError):
                    errors.append({'field': f'products[{i}].quantity', 'reason': 'Quantity must be a valid number'})
    
    return errors

def get_order(order_table, order_id):
    """Get order details"""
    try:
        response = order_table.get_item(Key={'id': order_id})
        return response.get('Item')
    except Exception as e:
        print(f"Error getting order {order_id}: {str(e)}")
        return None

def get_order_products(order_product_table, order_id):
    """Get products from the original order"""
    try:
        response = order_product_table.scan(
            FilterExpression='orderTicket_id = :order_id',
            ExpressionAttributeValues={':order_id': order_id}
        )
        
        products = response.get('Items', [])
        
        # Handle pagination
        while 'LastEvaluatedKey' in response:
            response = order_product_table.scan(
                FilterExpression='orderTicket_id = :order_id',
                ExpressionAttributeValues={':order_id': order_id},
                ExclusiveStartKey=response['LastEvaluatedKey']
            )
            products.extend(response.get('Items', []))
        
        return products
        
    except Exception as e:
        print(f"Error getting order products for order {order_id}: {str(e)}")
        return []

def normalize_variant_id(product_id, variant_id):
    """
    Normalize variant ID to handle different representation patterns:
    1. Empty/None variant_id -> None (no variant)
    2. variant_id equals product_id -> None (no variant)
    3. variant_id equals "no_variant" -> None (no variant)
    4. Any other variant_id -> keep as is (has variant)
    """
    if not variant_id:
        return None
    
    if variant_id == product_id:
        return None
    
    if variant_id.lower() in ['no_variant', 'no-variant', 'novariant']:
        return None
    
    return variant_id

def validate_products_in_order(return_products, order_products):
    """Validate that all returned products are in the original order"""
    errors = []
    
    for i, return_product in enumerate(return_products):
        product_id = return_product['id']
        return_variant_id = return_product.get('variant_id')
        quantity = float(return_product['quantity'])
        
        # Normalize the return product variant ID
        normalized_return_variant = normalize_variant_id(product_id, return_variant_id)
        
        # Find matching product in order
        matching_product = None
        for p in order_products:
            order_product_id = p['product_id']
            order_variant_id = p.get('product_variant_id')
            
            # Normalize the order product variant ID
            normalized_order_variant = normalize_variant_id(order_product_id, order_variant_id)
            
            # Check for match using normalized variants
            if order_product_id == product_id and normalized_order_variant == normalized_return_variant:
                matching_product = p
                break
        
        if not matching_product:
            variant_msg = f" with variant {normalized_return_variant}" if normalized_return_variant else ""
            errors.append({
                'field': f'products[{i}]', 
                'reason': f'Product {product_id}{variant_msg} was not found in the original order'
            })
        else:
            # Check if return quantity doesn't exceed ordered quantity
            ordered_quantity = float(matching_product.get('quantity', 0))
            if quantity > ordered_quantity:
                errors.append({
                    'field': f'products[{i}].quantity', 
                    'reason': f'Return quantity ({quantity}) exceeds ordered quantity ({ordered_quantity})'
                })
    
    return errors

def get_product_details(product_table, variant_table, product_id, variant_id=None):
    """Get product and variant details"""
    try:
        # Get product details
        product_response = product_table.get_item(Key={'id': product_id})
        product = product_response.get('Item')
        
        if not product:
            print(f"Warning: Product {product_id} not found in product table")
            # Still return basic info so return can proceed
            return {
                'product_name': f'Product {product_id[:8]}... (Not Found)',
                'current_stock': 0
            }
        
        product_name = product.get('name', 'Unknown Product')
        current_stock = float(product.get('stock_available', 0))
        
        # Get variant details if applicable
        if variant_id:
            variant_response = variant_table.get_item(Key={'id': variant_id})
            variant = variant_response.get('Item')
            
            if variant:
                variant_name = variant.get('name', 'Unknown Variant')
                product_name = f"{product_name} - {variant_name}"
                current_stock = float(variant.get('stock_available', 0))
            else:
                print(f"Warning: Variant {variant_id} not found in variant table")
                product_name = f"{product_name} - Variant {variant_id[:8]}... (Not Found)"
                current_stock = 0
        
        return {
            'product_name': product_name,
            'current_stock': current_stock
        }
        
    except Exception as e:
        print(f"Error getting product details for {product_id}: {str(e)}")
        return {
            'product_name': f'Product {product_id[:8]}... (Error)',
            'current_stock': 0
        }

def execute_return_transaction(return_ticket_table, return_product_table, product_table, variant_table, 
                             movement_table, order_product_table, return_ticket, return_products, inventory_updates, 
                             order_id, ticket_number, current_datetime, user_id):
    """Execute all database operations for the return transaction"""
    try:
        # Create return ticket
        return_ticket_table.put_item(Item=return_ticket)
        print(f"Created return ticket: {return_ticket['id']} with ticket number: {ticket_number}")
        
        # Create return product records
        for return_product in return_products:
            return_product_table.put_item(Item=return_product)
            print(f"Created return product record: {return_product['id']}")
        
        # Update inventory and create movement records
        for update in inventory_updates:
            product_id = update['product_id']
            variant_id = update['product_variant_id']
            quantity = update['quantity']
            
            # Update product or variant stock
            try:
                if variant_id:
                    # Update variant stock
                    variant_table.update_item(
                        Key={'id': variant_id},
                        UpdateExpression='SET stock_available = stock_available + :qty, updated_datetime = :datetime, updated_user_id = :user_id',
                        ExpressionAttributeValues={
                            ':qty': quantity,
                            ':datetime': current_datetime,
                            ':user_id': user_id
                        }
                    )
                    print(f"Updated variant {variant_id} stock by +{quantity}")
                else:
                    # Update product stock
                    product_table.update_item(
                        Key={'id': product_id},
                        UpdateExpression='SET stock_available = stock_available + :qty, updated_datetime = :datetime, updated_user_id = :user_id',
                        ExpressionAttributeValues={
                            ':qty': quantity,
                            ':datetime': current_datetime,
                            ':user_id': user_id
                        }
                    )
                    print(f"Updated product {product_id} stock by +{quantity}")
            except Exception as stock_error:
                print(f"Warning: Could not update stock for {'variant' if variant_id else 'product'} {variant_id or product_id}: {str(stock_error)}")
                # Continue processing - don't fail the entire return for stock update issues
            
            # Create inventory movement record
            movement_record = {
                'id': str(uuid.uuid4()),
                'product_id': product_id,
                'product_variant_id': variant_id,
                'quantity': quantity,
                'previous_quantity': Decimal(str(update['current_stock'])),
                'new_quantity': Decimal(str(update['current_stock'])) + quantity,
                'movement_type': 'return',
                'notes': f"Product return - Return Ticket: {ticket_number}",
                'user_id': user_id,
                'created_datetime': current_datetime,
                'updated_datetime': current_datetime,
                'updated_user_id': user_id
            }
            
            movement_table.put_item(Item=movement_record)
            print(f"Created inventory movement record: {movement_record['id']}")
        
        # Update order products to mark them as returned
        update_success = update_order_products_with_return_info(
            order_product_table, order_id, return_products, 
            return_ticket['id'], current_datetime, ticket_number
        )
        
        if not update_success:
            print("Warning: Failed to update order products with return info")
            # Don't fail the entire transaction, but log the warning
        
        return True
        
    except Exception as e:
        print(f"Error executing return transaction: {str(e)}")
        return False

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