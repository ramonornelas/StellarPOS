import json
import sys
import os

# Add the lambda_functions directory to the path
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

from POSGetOrdersByDate import lambda_handler

# Test event for the TEST stage
test_event = {
    'pathParameters': {
        'date': '2025-12-05'
    },
    'requestContext': {
        'stage': 'TEST'
    }
}

# Test the lambda handler
print("Testing POSGetOrdersByDate Lambda function...")
print(f"Test event: {json.dumps(test_event, indent=2)}")
print("\n" + "="*50 + "\n")

result = lambda_handler(test_event, None)

print(f"Status Code: {result['statusCode']}")
print(f"\nResponse Body:")
response_data = json.loads(result['body'])
print(json.dumps(response_data, indent=2))

# Print summary of return statuses
if isinstance(response_data, list):
    print("\n" + "="*50)
    print("Return Status Summary:")
    for order in response_data:
        ticket = order.get('ticket', 'N/A')
        status = order.get('is_return_status', 'N/A')
        products = order.get('products', [])
        returned = sum(1 for p in products if p.get('is_returned'))
        total = len(products)
        print(f"  {ticket}: {status} ({returned}/{total} products returned)")