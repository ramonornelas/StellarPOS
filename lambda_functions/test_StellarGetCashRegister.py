import json
from StellarGetCashRegister import lambda_handler

# Mock event and context
event = {
    'pathParameters': {
        'cashRegisterId': '25b3af89-e9c5-4a13-a820-e36822e22650'
    }
}

context = {}

# Call the lambda_handler function
response = lambda_handler(event, context)

# Print the response
print(json.dumps(response, indent=4))