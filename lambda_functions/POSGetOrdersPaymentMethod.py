"""
AWS Lambda function for retrieving payment method summaries for daily orders.

Endpoint:
- GET /orders/summary?date={date} - Get payment method breakdown for a specific date

Aggregates orders by payment method for the specified date, handling split payments specially.
For orders with payment_method = "split", queries the split payment details table to get 
individual amounts per method (cash, card, transfer).
"""

import json
import boto3
from botocore.exceptions import BotoCoreError, ClientError
import os
from datetime import datetime
from decimal import Decimal
import base64
import re

def get_table_name(table_type, stage):
    """Get table name based on the stage and table type"""
    if stage and stage.lower() == 'test':
        table_names = {
            'order': os.getenv('TEST_POS_ORDER_TABLE', 'test_POS_orderTicket'),
            'split_payment': os.getenv('TEST_SPLIT_PAYMENT_TABLE', 'test_POS_orderSplitPayment')
        }
    else:
        table_names = {
            'order': os.getenv('POS_ORDER_TABLE', 'POS_orderTicket'),
            'split_payment': os.getenv('SPLIT_PAYMENT_TABLE', 'POS_orderSplitPayment')
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
        # Handle GET /orders/summary endpoint
        return get_orders_summary(event, stage)
        
    except Exception as e:
        print(f"Error: {str(e)}")
        return error_response(500, 'Internal server error')

def get_orders_summary(event, stage):
    """Get payment method summary for orders on a specific date"""
    try:
        # Parse query parameters
        query_params = event.get('queryStringParameters') or {}
        
        # Validate date parameter
        date_param = query_params.get('date')
        if not date_param:
            return error_response(400, 'Missing date parameter', [
                {'field': 'date', 'reason': 'Date parameter is required'}
            ])
        
        # Validate date format (YYYY-MM-DD)
        if not validate_date_format(date_param):
            return error_response(400, 'Invalid date format. Expected YYYY-MM-DD', [
                {'field': 'date', 'reason': 'Date must be in YYYY-MM-DD format'}
            ])
        
        # Get table references
        order_table = dynamodb.Table(get_table_name('order', stage))
        split_payment_table = dynamodb.Table(get_table_name('split_payment', stage))
        
        # Query orders for the specified date
        orders = get_orders_by_date(order_table, date_param)
        
        # Calculate payment method summaries
        summary = calculate_payment_summary(orders, split_payment_table)
        
        return {
            'statusCode': 200,
            'headers': {
                'Content-Type': 'application/json',
                'Access-Control-Allow-Origin': '*'
            },
            'body': json.dumps({
                'status': 'success',
                'data': {
                    'date': date_param,
                    'total_amount': summary['total_amount'],
                    'total_transactions': summary['total_transactions'],
                    'payment_methods': summary['payment_methods']
                }
            }, cls=CustomJSONEncoder)
        }
        
    except Exception as e:
        print(f"Error in get_orders_summary: {str(e)}")
        return error_response(500, f'Error retrieving orders summary: {str(e)}')

def validate_date_format(date_string):
    """Validate date format (YYYY-MM-DD)"""
    try:
        # Check format with regex
        if not re.match(r'^\d{4}-\d{2}-\d{2}$', date_string):
            return False
        
        # Validate that it's a valid date
        datetime.strptime(date_string, '%Y-%m-%d')
        return True
    except ValueError:
        return False

def get_orders_by_date(order_table, target_date):
    """Get all orders for a specific date using the 'date' field"""
    try:
        # Use the date field for exact date matching (much more efficient)
        response = order_table.scan(
            FilterExpression='#date_field = :target_date',
            ExpressionAttributeNames={
                '#date_field': 'date'  # Use expression name since 'date' is a reserved word
            },
            ExpressionAttributeValues={
                ':target_date': target_date
            }
        )
        
        orders = response.get('Items', [])
        
        # Handle pagination if needed
        while 'LastEvaluatedKey' in response:
            response = order_table.scan(
                FilterExpression='#date_field = :target_date',
                ExpressionAttributeNames={
                    '#date_field': 'date'
                },
                ExpressionAttributeValues={
                    ':target_date': target_date
                },
                ExclusiveStartKey=response['LastEvaluatedKey']
            )
            orders.extend(response.get('Items', []))
        
        print(f"Found {len(orders)} orders for date {target_date}")
        return orders
        
    except Exception as e:
        print(f"Error getting orders by date: {str(e)}")
        return []

def calculate_payment_summary(orders, split_payment_table):
    """Calculate payment method summary from orders
    
    Transaction counting logic:
    - total_transactions = number of orders (each order = 1 transaction)
    - transaction_count per method = how many times each method was used
      * For single payments: 1 per order
      * For split payments: 1 per each method used in the split
    """
    # Initialize payment method counters
    payment_summary = {
        'cash': {'total_amount': 0.0, 'transaction_count': 0},
        'card': {'total_amount': 0.0, 'transaction_count': 0},
        'transfer': {'total_amount': 0.0, 'transaction_count': 0}
    }
    
    # Payment method display names
    payment_display_names = {
        'cash': 'Efectivo',
        'card': 'Tarjeta',
        'transfer': 'Transferencia'
    }
    
    total_amount = 0.0
    total_transactions = 0
    
    for order in orders:
        order_total = float(order.get('total', 0))
        payment_method = order.get('payment_method', '').lower()
        
        # Each order counts as one transaction regardless of payment method
        total_transactions += 1
        total_amount += order_total
        
        if payment_method == 'split':
            # Handle split payments - query split payment details
            print(f"Processing split payment for order {order.get('id')} with total ${order_total}")
            split_amounts = get_split_payment_details(split_payment_table, order['id'])
            
            # Add split amounts to respective payment methods
            # Each method in a split payment counts as 1 full transaction
            for method, amount in split_amounts.items():
                if method in payment_summary:
                    payment_summary[method]['total_amount'] += amount
                    payment_summary[method]['transaction_count'] += 1
            
        elif payment_method in payment_summary:
            # Handle regular single payment method
            payment_summary[payment_method]['total_amount'] += order_total
            payment_summary[payment_method]['transaction_count'] += 1
        
        else:
            # Handle unknown payment methods - log but don't fail
            print(f"Unknown payment method '{payment_method}' in order {order.get('id')}")
            continue
    
    # Build response format - only include methods with transactions
    payment_methods = []
    for method, data in payment_summary.items():
        if data['transaction_count'] > 0:
            payment_methods.append({
                'method': method,
                'method_display': payment_display_names[method],
                'total_amount': round(data['total_amount'], 2),
                'transaction_count': int(data['transaction_count'])  # Always integer now
            })
    
    # Sort by total amount descending
    payment_methods.sort(key=lambda x: x['total_amount'], reverse=True)
    
    return {
        'total_amount': round(total_amount, 2),
        'total_transactions': total_transactions,
        'payment_methods': payment_methods
    }

def get_split_payment_details(split_payment_table, order_id):
    """Get split payment details for an order"""
    try:
        # Query split payment details by orderTicket_id
        response = split_payment_table.scan(
            FilterExpression='orderTicket_id = :orderTicket_id',
            ExpressionAttributeValues={':orderTicket_id': order_id}
        )
        
        split_details = response.get('Items', [])
        print(f"Found {len(split_details)} split payment records for orderTicket_id {order_id}")
        
        # Handle pagination if needed
        while 'LastEvaluatedKey' in response:
            response = split_payment_table.scan(
                FilterExpression='orderTicket_id = :orderTicket_id',
                ExpressionAttributeValues={':orderTicket_id': order_id},
                ExclusiveStartKey=response['LastEvaluatedKey']
            )
            split_details.extend(response.get('Items', []))
        
        # Aggregate amounts by payment method
        split_amounts = {}
        for detail in split_details:
            method = detail.get('payment_method', '').lower()
            amount = float(detail.get('amount', 0))
            print(f"Split payment detail: method='{method}', amount={amount}")
            
            if method in ['cash', 'card', 'transfer']:
                split_amounts[method] = split_amounts.get(method, 0) + amount
        
        print(f"Aggregated split amounts: {split_amounts}")
        
        return split_amounts
        
    except Exception as e:
        print(f"Error getting split payment details for orderTicket_id {order_id}: {str(e)}")
        return {}

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
