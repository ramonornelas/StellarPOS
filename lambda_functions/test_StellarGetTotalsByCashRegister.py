import json
from StellarGetOrderTotalsByCashRegister import lambda_handler  # Updated import

# Mock event and context
event = {
    'pathParameters': {
        'cashRegisterId': 'a8d151cc-c43a-49c8-a81b-bb850b6998a0'  # Changed here
    }
}

context = {}

# Call the lambda_handler function
response = lambda_handler(event, context)

# Print the response
print(json.dumps(response, indent=4))