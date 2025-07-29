
import json
import boto3
from botocore.exceptions import BotoCoreError, ClientError
from decimal import Decimal
from boto3.dynamodb.conditions import Attr
import os

dynamodb = boto3.resource('dynamodb')

def get_table_names(stage):
    """Get table names based on the stage"""
    if stage.lower() == 'test':
        return {
            'CASH_REGISTER_CLOSEOUT_TABLE': os.getenv('TEST_CASH_REGISTER_CLOSEOUT_TABLE', 'test_stellar_cashRegisterCloseout')
        }
    else:
        return {
            'CASH_REGISTER_CLOSEOUT_TABLE': os.getenv('CASH_REGISTER_CLOSEOUT_TABLE', 'stellar_cashRegisterCloseout')
        }


class CustomJSONEncoder(json.JSONEncoder):
    def default(self, obj):
        if isinstance(obj, set):
            return list(obj)
        if isinstance(obj, Decimal):
            return str(obj)
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
        CASH_REGISTER_CLOSEOUT_TABLE = tables['CASH_REGISTER_CLOSEOUT_TABLE']
        cash_register_table = dynamodb.Table(CASH_REGISTER_CLOSEOUT_TABLE)

        # Get parameters from path or query string
        path_params = event.get('pathParameters', {}) or {}
        query_params = event.get('queryStringParameters', {}) or {}
        date_to_search = path_params.get('date')
        limit = query_params.get('limit')

        # Convert limit to integer if provided
        if limit:
            try:
                limit = int(limit)
                if limit < 0:
                    return {
                        'statusCode': 400,
                        'body': json.dumps({'message': 'Limit parameter must be a positive number.'})
                    }
            except ValueError:
                return {
                    'statusCode': 400,
                    'body': json.dumps({'message': 'Invalid limit parameter. Must be a number.'})
                }

        if date_to_search:
            filter_expression = Attr('date').eq(date_to_search)
            response = cash_register_table.scan(FilterExpression=filter_expression)
        else:
            response = cash_register_table.scan()

        if 'Items' in response and response['Items']:
            # Sort by opened_at descending (latest first)
            history = sorted(
                response['Items'],
                key=lambda x: x.get('opened_at', ''),
                reverse=True
            )
            # Apply limit if specified
            if limit is not None and limit >= 0:
                history = history[:limit]
            # Convert Decimal values to string for JSON serialization
            for entry in history:
                for key, value in entry.items():
                    if isinstance(value, Decimal):
                        entry[key] = str(value)
            return {
                'statusCode': 200,
                'body': json.dumps(history, cls=CustomJSONEncoder)
            }
        else:
            return {
                'statusCode': 404,
                'body': json.dumps({'message': 'Cash register history not found'})
            }
    except (BotoCoreError, ClientError) as error:
        print(error)
        return {
            'statusCode': 500,
            'body': json.dumps({'message': str(error)})
        }
