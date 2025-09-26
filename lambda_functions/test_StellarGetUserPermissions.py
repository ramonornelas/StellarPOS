import json
from StellarGetUserPermissions import lambda_handler

def with_stage(event, stage='TEST'):
    event = dict(event) if event else {}
    event['requestContext'] = {
        'stage': stage,
        'httpMethod': 'GET',
        'resourcePath': '/user-permissions'
    }
    return event

# Mock event and context
event = {
    'pathParameters': {
        'userId': '3f418447-bbc3-4906-9c59-7a1c40efa35a'
    }
}

context = {}

# Call the lambda_handler function with TEST stage
response = lambda_handler(with_stage(event), context)

# Print the response
print(json.dumps(response, indent=4))