import json
from StellarGetOrderTotalsByCashRegister import lambda_handler

def with_test_stage(event):
    event = dict(event) if event else {}
    event['requestContext'] = {
        'stage': 'TEST',
        'httpMethod': 'GET',
        'resourcePath': '/order-totals-by-cash-register'
    }
    return event

# Mock event and context
event = {
    'pathParameters': {
        'cashRegisterId': '93905b5f-46ea-4a43-9f9d-a298e13ce4bb'
    }
}

context = {}

# Call the lambda_handler function with TEST stage
response = lambda_handler(with_test_stage(event), context)

# Print the response
print(json.dumps(response, indent=4))