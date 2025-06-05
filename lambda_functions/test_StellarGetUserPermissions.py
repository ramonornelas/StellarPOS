import json
from StellarGetUserPermissions import lambda_handler

# Mock event and context
event = {
    'pathParameters': {
        'userId': '534c1bee-e799-4a7e-aae1-cc108f808f0e'
    }
}

context = {}

# Call the lambda_handler function
response = lambda_handler(event, context)

# Print the response
print(json.dumps(response, indent=4))