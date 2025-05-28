import json
from StellarGetCashRegisterHistory import lambda_handler

# Mock event and context
event = {
    'pathParameters': {
        'date': '2025-05-24'
    }
}

context = {}

# Call the lambda_handler function
response = lambda_handler(event, context)

# Print the response
print(json.dumps(response, indent=4))