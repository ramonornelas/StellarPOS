import json
from POSGetOrdersByDate import lambda_handler

# Mock event and context
event = {
    'pathParameters': {
        'date': '2025-01-01'  # Replace with the date you want to test
    }
}

context = {}

# Call the lambda_handler function
response = lambda_handler(event, context)

# Print the response
print(json.dumps(response, indent=4))