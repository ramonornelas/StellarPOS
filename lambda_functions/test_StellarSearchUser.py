import json
from StellarSearchUser import lambda_handler

def with_test_stage(event):
    event = dict(event) if event else {}
    event['requestContext'] = {
        'stage': 'TEST',
        'httpMethod': 'POST',
        'resourcePath': '/search-user'
    }
    return event

# Mock event and context for user search
search_event = {
    'body': json.dumps({
        'username': 'test_admin@orionscaled.com'  # Replace with a valid test username
    })
}

context = {}

# Call the lambda_handler function with TEST stage
response = lambda_handler(with_test_stage(search_event), context)

# Print the response
print(json.dumps(response, indent=4))
