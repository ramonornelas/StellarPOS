import json
from StellarGetOrderTotalsByDate import lambda_handler  # Updated import

# Mock event and context
event = {
    'pathParameters': {
        'date': '2025-05-25'  # Replace with the date you want to test
    }
}

context = {}

# Call the lambda_handler function
response = lambda_handler(event, context)

# Print the response
print(json.dumps(response, indent=4))