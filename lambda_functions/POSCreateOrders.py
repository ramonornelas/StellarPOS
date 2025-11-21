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
            'POS_PRODUCT_VARIANT_TABLE': os.getenv('TEST_POS_PRODUCT_VARIANT_TABLE', 'test_POS_product_variant'),
            'POS_PRODUCT_COMBO_TABLE': os.getenv('POS_PRODUCT_COMBO_TABLE', 'test_POS_product_combo')
        }
    else:
        return {
            'ORDER_TICKET_TABLE': os.getenv('ORDER_TICKET_TABLE', 'POS_orderTicket'),
            'ORDER_PRODUCT_TABLE': os.getenv('ORDER_PRODUCT_TABLE', 'POS_orderProduct'),
            'SPLIT_PAYMENT_TABLE': os.getenv('SPLIT_PAYMENT_TABLE', 'POS_orderSplitPayment'),
            'INVENTORY_MOVEMENT_TABLE': os.getenv('INVENTORY_MOVEMENT_TABLE', 'inventory_movement'),
            'POS_PRODUCT_TABLE': os.getenv('POS_PRODUCT_TABLE', 'POS_product'),
            'POS_PRODUCT_VARIANT_TABLE': os.getenv('POS_PRODUCT_VARIANT_TABLE', 'POS_product_variant'),
            'POS_PRODUCT_COMBO_TABLE': os.getenv('POS_PRODUCT_COMBO_TABLE', 'POS_product_combo')
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
        POS_PRODUCT_COMBO_TABLE = tables['POS_PRODUCT_COMBO_TABLE']
        
        print(f"Stage: {stage}")
        print(f"Using tables: {ORDER_TICKET_TABLE}, {ORDER_PRODUCT_TABLE}, {POS_PRODUCT_TABLE}, {POS_PRODUCT_VARIANT_TABLE}, {INVENTORY_MOVEMENT_TABLE}, {POS_PRODUCT_COMBO_TABLE}")

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
            inventory_movement_count = 0

            # Add order ticket to transaction
            transaction_items.append({
                'Put': {
                    'TableName': ORDER_TICKET_TABLE,
                    'Item': convert_to_dynamodb_item(new_orderTicket)
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
                        'Item': convert_to_dynamodb_item(create_order_product_record(product_data, new_orderTicket))
                    }
                })

                # Only create inventory movement and stock updates for non-combo products
                # Combos don't have inventory themselves, only their components do
                if not product_data.get('is_combo', False):
                    # Put inventory movement record (same transaction)
                    movement_record = create_inventory_movement_record(product_data, new_orderTicket, None, None, POS_PRODUCT_TABLE, POS_PRODUCT_VARIANT_TABLE)
                    print(f"Created inventory movement record for product {product_data['id']}: {movement_record}")
                    transaction_items.append({
                        'Put': {
                            'TableName': INVENTORY_MOVEMENT_TABLE,
                            'Item': convert_to_dynamodb_item(movement_record)
                        }
                    })
                    inventory_movement_count += 1

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

            # Process combo products and their components
            try:
                # Calculate decrements for all combo components
                combo_decrements, combo_details = calculate_combo_decrements(products, POS_PRODUCT_COMBO_TABLE, POS_PRODUCT_TABLE)
                
                # Apply component decrements to inventory and create movement records
                for component_product_id, decrement_quantity in combo_decrements.items():
                    qty_str = str(decrement_quantity)
                    
                    # Update stock
                    transaction_items.append({
                        'Update': {
                            'TableName': POS_PRODUCT_TABLE,
                            'Key': {'id': {'S': component_product_id}},
                            'UpdateExpression': 'SET stock_available = if_not_exists(stock_available, :zero) - :qty',
                            'ExpressionAttributeValues': {
                                ':zero': {'N': '0'},
                                ':qty': {'N': qty_str}
                            }
                        }
                    })
                    
                    # Create inventory movement record for combo component
                    combo_name = combo_details.get(component_product_id, "Combo desconocido")
                    movement_record = create_combo_inventory_movement_record(
                        component_product_id, 
                        decrement_quantity, 
                        new_orderTicket, 
                        combo_name,
                        POS_PRODUCT_TABLE
                    )
                    print(f"Created inventory movement record for combo component {component_product_id}: {movement_record}")
                    transaction_items.append({
                        'Put': {
                            'TableName': INVENTORY_MOVEMENT_TABLE,
                            'Item': convert_to_dynamodb_item(movement_record)
                        }
                    })
                    inventory_movement_count += 1
                    
            except Exception as combo_error:
                print(f"Error processing combo components: {combo_error}")
                raise combo_error

            # Add split payments to transaction
            if len(split_payments) > 0:
                for split_payment in split_payments:
                    transaction_items.append({
                        'Put': {
                            'TableName': SPLIT_PAYMENT_TABLE,
                            'Item': convert_to_dynamodb_item(create_order_split_payment_record(split_payment, new_orderTicket))
                        }
                    })

            # Log the transaction items for debugging
            print("Transaction Items:", json.dumps(transaction_items, indent=4))
            print(f"Total inventory movement records added: {inventory_movement_count}")

            # Execute the transaction (atomic all-or-none)
            dynamodb_client.transact_write_items(TransactItems=transaction_items)
            print("Transaction executed successfully. Inventory movements should be saved.")

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

def convert_to_dynamodb_item(data):
    """
    Convert Python data types to DynamoDB format
    """
    item = {}
    for key, value in data.items():
        if value is None:
            continue  # Skip None values
        elif isinstance(value, str):
            item[key] = {'S': value}
        elif isinstance(value, (int, float, decimal.Decimal)):
            item[key] = {'N': str(value)}
        elif isinstance(value, bool):
            item[key] = {'BOOL': value}
        else:
            # For any other type, convert to string
            item[key] = {'S': str(value)}
    return item

# Update the group_products function to ensure prices and totals are rounded
def group_products(products):
    grouped_products = {}
    for product in products:
        product_id = product['id']
        product_variant_id = product.get('product_variant_id', 'no_variant')
        price = decimal.Decimal(str(product.get('price', 0))).quantize(TWO_DECIMAL_PLACES)
        quantity = decimal.Decimal(str(product.get('quantity', 1))).quantize(TWO_DECIMAL_PLACES)
        is_combo = product.get('is_combo', False)
        combo_products = product.get('combo_products', [])
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
                'category_name': product.get('category_name', ''),
                'is_combo': is_combo,
                'combo_products': combo_products
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
def create_inventory_movement_record(product_data, new_orderTicket, previous_quantity=None, new_quantity=None, pos_product_table=None, pos_product_variant_table=None):
    # For sales, quantity should be negative to indicate stock reduction
    sale_quantity = -abs(product_data['quantity'])  # Make sure it's negative
    
    # If previous_quantity and new_quantity not provided, calculate them
    if previous_quantity is None or new_quantity is None:
        current_stock = get_current_stock(
            product_data['id'], 
            product_data.get('product_variant_id', 'no_variant'),
            pos_product_table,
            pos_product_variant_table
        )
        previous_quantity = current_stock
        new_quantity = current_stock + sale_quantity  # sale_quantity is negative
    
    return {
        'id': str(uuid.uuid4()),
        'product_id': product_data['id'],
        'product_variant_id': product_data.get('product_variant_id', 'no_variant'),
        'product_name': product_data['name'],
        'movement_type': 'sale',
        'date': new_orderTicket['date'],
        'transactionTicket_id': new_orderTicket['id'],
        'quantity': sale_quantity,
        'previous_quantity': previous_quantity.quantize(TWO_DECIMAL_PLACES),
        'new_quantity': new_quantity.quantize(TWO_DECIMAL_PLACES),
        'product_price': product_data['price'].quantize(TWO_DECIMAL_PLACES),
        'product_cost': product_data.get('cost', decimal.Decimal('0.00')).quantize(TWO_DECIMAL_PLACES),
        'notes': new_orderTicket.get('notes', ''),
        'created_datetime': get_current_datetime(),
        'updated_datetime': get_current_datetime(),
        'user_id': new_orderTicket['updated_user_id'],  # For compatibility with other systems
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

def get_combo_components(combo_product_id, combo_table_name):
    """
    Retrieve combo components from POS_product_combo table
    Returns list of component products with their quantities
    """
    try:
        response = dynamodb_client.query(
            TableName=combo_table_name,
            KeyConditionExpression='product_id = :product_id',
            ExpressionAttributeValues={
                ':product_id': {'S': combo_product_id}
            }
        )
        
        components = []
        for item in response.get('Items', []):
            components.append({
                'included_product_id': item['included_product_id']['S'],
                'included_product_quantity': decimal.Decimal(item['included_product_quantity']['N']).quantize(TWO_DECIMAL_PLACES)
            })
        
        return components
    except Exception as e:
        print(f"Error retrieving combo components for {combo_product_id}: {e}")
        raise e

def validate_combo_components(combo_components, product_table_name):
    """
    Validate that all combo component products exist and are active
    """
    try:
        for component in combo_components:
            response = dynamodb_client.get_item(
                TableName=product_table_name,
                Key={'id': {'S': component['included_product_id']}}
            )
            
            if 'Item' not in response:
                raise ValueError(f"Component product {component['included_product_id']} not found")
            
            # Check if product is active (assuming is_active field exists)
            item = response['Item']
            if 'is_active' in item and item['is_active'].get('BOOL', True) is False:
                raise ValueError(f"Component product {component['included_product_id']} is not active")
        
        return True
    except Exception as e:
        print(f"Error validating combo components: {e}")
        raise e

def get_current_stock(product_id, variant_id=None, pos_product_table=None, pos_product_variant_table=None):
    """
    Get current stock for a product or product variant
    Returns current stock_available as Decimal
    """
    try:
        if variant_id and variant_id != 'no_variant':
            # Get variant stock
            response = dynamodb_client.get_item(
                TableName=pos_product_variant_table,
                Key={'id': {'S': variant_id}},
                ProjectionExpression='stock_available'
            )
            if 'Item' in response and 'stock_available' in response['Item']:
                return decimal.Decimal(response['Item']['stock_available']['N']).quantize(TWO_DECIMAL_PLACES)
        else:
            # Get product stock
            response = dynamodb_client.get_item(
                TableName=pos_product_table,
                Key={'id': {'S': product_id}},
                ProjectionExpression='stock_available'
            )
            if 'Item' in response and 'stock_available' in response['Item']:
                return decimal.Decimal(response['Item']['stock_available']['N']).quantize(TWO_DECIMAL_PLACES)
        
        # Default to 0 if no stock found
        return decimal.Decimal('0.00')
    except Exception as e:
        print(f"Error getting current stock for product {product_id}, variant {variant_id}: {e}")
        return decimal.Decimal('0.00')

def calculate_combo_decrements(products, combo_table_name, product_table_name):
    """
    Calculate inventory decrements for all combo components in the order
    Returns tuple: (decrements_dict, combo_details_dict)
    where combo_details_dict maps component_product_id -> combo_name
    """
    component_decrements = {}
    combo_details = {}  # Maps component_product_id -> combo_name for inventory movements
    
    for product in products:
        # Check if this product is a combo
        is_combo = product.get('is_combo', False)
        if not is_combo:
            continue
            
        combo_quantity = decimal.Decimal(str(product.get('quantity', 1))).quantize(TWO_DECIMAL_PLACES)
        combo_name = product.get('name', f"Combo {product['id']}")
        
        # Try to get combo components from payload first (if available)
        combo_components_from_payload = product.get('combo_products', [])
        combo_components = []
        
        if combo_components_from_payload:
            # Use components from payload
            print(f"Using combo components from payload for combo {product['id']}")
            for component in combo_components_from_payload:
                combo_components.append({
                    'included_product_id': component['product_id'],
                    'included_product_quantity': decimal.Decimal(str(component['quantity_per_combo'])).quantize(TWO_DECIMAL_PLACES)
                })
        else:
            # Fallback: Get combo components from database
            print(f"Fetching combo components from database for combo {product['id']}")
            combo_components = get_combo_components(product['id'], combo_table_name)
        
        if not combo_components:
            print(f"Warning: No components found for combo {product['id']}")
            continue
            
        # Validate components exist and are active (only when fetching from DB)
        if not combo_components_from_payload:
            validate_combo_components(combo_components, product_table_name)
        
        # Calculate decrements for each component
        for component in combo_components:
            included_product_id = component['included_product_id']
            included_quantity = component['included_product_quantity']
            
            # Store combo name for inventory movement records
            combo_details[included_product_id] = combo_name
            
            # Calculate total decrement: combo_quantity × included_product_quantity
            decrement = (combo_quantity * included_quantity).quantize(TWO_DECIMAL_PLACES)
            
            # Aggregate decrements if same component appears in multiple combos
            if included_product_id in component_decrements:
                component_decrements[included_product_id] += decrement
            else:
                component_decrements[included_product_id] = decrement
                
    return component_decrements, combo_details

def create_combo_inventory_movement_record(component_product_id, decrement_quantity, new_orderTicket, combo_product_name, pos_product_table=None):
    """
    Create inventory movement record for combo component
    """
    # Get current stock before decrement
    current_stock = get_current_stock(component_product_id, 'no_variant', pos_product_table, None)
    previous_quantity = current_stock
    new_quantity = current_stock - decrement_quantity  # decrement_quantity is positive, subtract it
    
    return {
        'id': str(uuid.uuid4()),
        'product_id': component_product_id,
        'product_variant_id': 'no_variant',  # Combo components don't have variants for now
        'product_name': f'Vendido en combo: {combo_product_name}',
        'movement_type': 'sale',  # Regular sale, not a special combo type
        'date': new_orderTicket['date'],
        'transactionTicket_id': new_orderTicket['id'],
        'quantity': -decrement_quantity,  # Negative because it's a decrement/sale
        'previous_quantity': previous_quantity.quantize(TWO_DECIMAL_PLACES),
        'new_quantity': new_quantity.quantize(TWO_DECIMAL_PLACES),
        'product_price': decimal.Decimal('0.00'),  # Component doesn't have individual price in combo sale
        'product_cost': decimal.Decimal('0.00'),
        'notes': f'Vendido como componente del combo: {combo_product_name}',
        'created_datetime': get_current_datetime(),
        'updated_datetime': get_current_datetime(),
        'user_id': new_orderTicket['updated_user_id'],  # For compatibility with other systems
        'updated_user_id': new_orderTicket['updated_user_id']
    }