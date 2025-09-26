import json
from StellarGetUserById import lambda_handler

# Mock event and context
def with_test_stage(event):
    event = dict(event) if event else {}
    event['requestContext'] = {
        'stage': 'TEST',
        'httpMethod': 'GET',
        'resourcePath': '/user'
    }
    return event

# Example user ID for testing
user_id = '3f418447-bbc3-4906-9c59-7a1c40efa35a'

# Mock event
event = {
    'pathParameters': {
        'id': user_id
    }
}

context = {}

# Call the lambda_handler function with TEST stage
response = lambda_handler(with_test_stage(event), context)

# Print the response
print(json.dumps(response, indent=4))
