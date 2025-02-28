import json
from POSCreateProductsBulk import lambda_handler

# Mock event and context
event = {
    'body': json.dumps([
        {
            'name': 'Product 1',
            'price': 50.0,
            'description': 'Description for Product 1'
        },
        {
            'name': 'Product 2',
            'price': 75.5,
            'description': 'Description for Product 2'
        }
    ])
}

context = {}

# Call the lambda_handler function
response = lambda_handler(event, context)

# Print the response
print(json.dumps(response, indent=4))