import json
from StellarLogin import lambda_handler

def with_test_stage(event):
    event = dict(event) if event else {}
    event['requestContext'] = {
        'stage': 'TEST',
        'httpMethod': 'POST',
        'resourcePath': '/login'
    }
    return event

# Mock event and context for login
# Replace 'testuser' and 'testpassword' with valid test credentials
login_event = {
    'body': json.dumps({
        'username': 'test_admin@orionscaled.com',
        'password': '4dmin42'
    })
}

context = {}

# Call the lambda_handler function with TEST stage
response = lambda_handler(with_test_stage(login_event), context)

# Print the response
print(json.dumps(response, indent=4))
