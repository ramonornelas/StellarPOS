import json
from StellarGetCashRegister import lambda_handler

def with_test_stage(event):
    event = dict(event) if event else {}
    event['requestContext'] = {
        'stage': 'TEST',
        'httpMethod': 'GET',
        'resourcePath': '/cash-register'
    }
    return event

# Mock event and context
event = {
    'pathParameters': {
        'cashRegisterId': '8b098aea-e91e-4808-b6e7-5f9b3356bfa5'
    }
}

context = {}

# Call the lambda_handler function with TEST stage
response = lambda_handler(with_test_stage(event), context)

# Print the response
print(json.dumps(response, indent=4))