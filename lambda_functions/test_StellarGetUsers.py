import json
from StellarGetUsers import lambda_handler

def with_test_stage(event=None):
    event = dict(event) if event else {}
    event['requestContext'] = {
        'stage': 'TEST',
        'httpMethod': 'GET',
        'resourcePath': '/get-users'
    }
    return event

# Mock event and context for getting users
event = {}
context = {}

# Call the lambda_handler function with TEST stage
response = lambda_handler(with_test_stage(event), context)

# Print the response
print(json.dumps(response, indent=4))
