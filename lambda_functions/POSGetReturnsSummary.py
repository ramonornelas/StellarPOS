"""
AWS Lambda function for retrieving refund method summaries for daily returns.

Endpoint:
- GET /returns/summary?date={date} - Get refund method breakdown for a specific date

Aggregates returns by refund method for the specified date.
Returns only support single refund methods: cash, card, or transfer.
"""

import json
import boto3
from botocore.exceptions import BotoCoreError, ClientError
import os
from datetime import datetime
from decimal import Decimal
import base64
import re

def get_table_names(stage):
    """Get table names based on the stage"""
    if stage.lower() == 'test':
        return {
            'RETURN_TICKET_TABLE': os.getenv('TEST_RETURN_TICKET_TABLE', 'test_POS_returnTicket')
        }
    else:
        return {
            'RETURN_TICKET_TABLE': os.getenv('RETURN_TICKET_TABLE', 'POS_returnTicket')
        }

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
    try:
        # Detect stage from API Gateway event
        stage = 'prod'  # default
        if 'requestContext' in event and 'stage' in event['requestContext']:
            stage = event['requestContext']['stage']
            if stage == '$default':
                stage = 'prod'
        
        # Get table names based on stage
        tables = get_table_names(stage)
        RETURN_TICKET_TABLE = tables['RETURN_TICKET_TABLE']
        
        print(f"Stage: {stage}")
        print(f"Using table: {RETURN_TICKET_TABLE}")
        
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
        
        # Handle GET /returns/summary endpoint
        return get_returns_summary(event, RETURN_TICKET_TABLE)
        
    except Exception as e:
        print(f"Error: {str(e)}")
        return error_response(500, 'Internal server error')

def get_returns_summary(event, return_ticket_table_name):
    """Get refund method summary for returns on a specific date"""
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
        
        # Get table reference
        return_table = dynamodb.Table(return_ticket_table_name)
        
        # Query returns for the specified date
        returns = get_returns_by_date(return_table, date_param)
        
        # Calculate refund method summaries
        summary = calculate_refund_summary(returns)
        
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
                    'refund_methods': summary['refund_methods']
                }
            }, cls=CustomJSONEncoder)
        }
        
    except Exception as e:
        print(f"Error in get_returns_summary: {str(e)}")
        return error_response(500, f'Error retrieving returns summary: {str(e)}')

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

def get_returns_by_date(return_table, target_date):
    """Get all returns for a specific date using the 'created_datetime' field"""
    try:
        # Use begins_with on created_datetime to match the date (YYYY-MM-DD)
        # This matches the pattern used in POSSubmitReturn.py for ticket number generation
        response = return_table.scan(
            FilterExpression='begins_with(created_datetime, :target_date)',
            ExpressionAttributeValues={
                ':target_date': target_date
            }
        )
        
        returns = response.get('Items', [])
        
        # Handle pagination if needed
        while 'LastEvaluatedKey' in response:
            response = return_table.scan(
                FilterExpression='begins_with(created_datetime, :target_date)',
                ExpressionAttributeValues={
                    ':target_date': target_date
                },
                ExclusiveStartKey=response['LastEvaluatedKey']
            )
            returns.extend(response.get('Items', []))
        
        print(f"Found {len(returns)} returns for date {target_date}")
        return returns
        
    except Exception as e:
        print(f"Error getting returns by date: {str(e)}")
        return []

def calculate_refund_summary(returns):
    """Calculate refund method summary from returns
    
    Transaction counting logic:
    - total_transactions = number of returns (each return = 1 transaction)
    - transaction_count per method = how many times each method was used
    """
    # Initialize refund method counters
    refund_summary = {
        'cash': {'total_amount': 0.0, 'transaction_count': 0},
        'card': {'total_amount': 0.0, 'transaction_count': 0},
        'transfer': {'total_amount': 0.0, 'transaction_count': 0}
    }
    
    # Refund method display names
    refund_display_names = {
        'cash': 'Efectivo',
        'card': 'Tarjeta',
        'transfer': 'Transferencia'
    }
    
    total_amount = 0.0
    total_transactions = 0
    
    for return_item in returns:
        return_total = float(return_item.get('total_amount', 0))
        refund_method = return_item.get('refund_method', '').lower()
        
        # Each return counts as one transaction regardless of refund method
        total_transactions += 1
        total_amount += return_total
        
        if refund_method in refund_summary:
            # Handle single refund method
            refund_summary[refund_method]['total_amount'] += return_total
            refund_summary[refund_method]['transaction_count'] += 1
        
        else:
            # Handle unknown refund methods - log but don't fail
            print(f"Unknown refund method '{refund_method}' in return {return_item.get('id')}")
            continue
    
    # Build response format - only include methods with transactions
    refund_methods = []
    for method, data in refund_summary.items():
        if data['transaction_count'] > 0:
            refund_methods.append({
                'method': method,
                'method_display': refund_display_names[method],
                'total_amount': round(data['total_amount'], 2),
                'transaction_count': int(data['transaction_count'])  # Always integer now
            })
    
    # Sort by total amount descending
    refund_methods.sort(key=lambda x: x['total_amount'], reverse=True)
    
    return {
        'total_amount': round(total_amount, 2),
        'total_transactions': total_transactions,
        'refund_methods': refund_methods
    }

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
