import json
from StellarGetOrderTotalsByDate import lambda_handler

def with_test_stage(event):
    event = dict(event) if event else {}
    event['requestContext'] = {
        'stage': 'TEST',
        'httpMethod': 'GET',
        'resourcePath': '/order-totals-by-date'
    }
    return event

# Mock event and context
event = {
    'pathParameters': {
        'date': '2025-07-18'  # Replace with the date you want to test
    }
}

context = {}

# Call the lambda_handler function with TEST stage
response = lambda_handler(with_test_stage(event), context)

# Print the response
print(json.dumps(response, indent=4))