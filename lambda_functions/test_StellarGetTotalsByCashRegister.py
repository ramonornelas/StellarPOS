import json
from StellarGetOrderTotalsByCashRegister import lambda_handler  # Updated import

# Mock event and context
event = {
    'pathParameters': {
        'cashRegisterId': '401bf94b-2a46-4f59-b331-5f0ab6648be6'
    }
}

context = {}

# Call the lambda_handler function
response = lambda_handler(event, context)

# Print the response
print(json.dumps(response, indent=4))