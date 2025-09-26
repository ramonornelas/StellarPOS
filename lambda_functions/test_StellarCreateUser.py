import json
from StellarCreateUser import lambda_handler

def with_test_stage(event):
    event = dict(event) if event else {}
    event['requestContext'] = {
        'stage': 'TEST',
        'httpMethod': 'POST',
        'resourcePath': '/create-user'
    }
    return event

# Mock event and context for user creation
event = {
    'body': json.dumps({
        'username': 'testuser',
        'email': 'testuser@example.com',
        'password': 'TestPassword123!',
        'role': 'cashier',
        'full_name': 'Test User'
    })
}

context = {}

# Call the lambda_handler function with TEST stage
response = lambda_handler(with_test_stage(event), context)

# Print the response
print(json.dumps(response, indent=4))
