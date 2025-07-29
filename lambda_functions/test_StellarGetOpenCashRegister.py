import json
from StellarGetOpenCashRegister import lambda_handler

def with_test_stage(event):
    event = dict(event) if event else {}
    event['requestContext'] = {
        'stage': 'TEST',
        'httpMethod': 'GET',
        'resourcePath': '/open-cash-register'
    }
    return event

# Mock event and context (no parameters required to get the open cash register)
event = {}

context = {}

# Call the lambda_handler function with TEST stage
response = lambda_handler(with_test_stage(event), context)

# Print the response
print(json.dumps(response, indent=4))