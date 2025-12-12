import json
import sys
import os

# Add the lambda_functions directory to the path
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

from POSGetReturnsByDate import lambda_handler

# Test event for the TEST stage
test_event = {
    'pathParameters': {
        'date': '2025-12-02'
    },
    'requestContext': {
        'stage': 'TEST'
    }
}

# Test the lambda handler
print("Testing POSGetReturnsByDate Lambda function...")
print(f"Test event: {json.dumps(test_event, indent=2)}")
print("\n" + "="*50 + "\n")

result = lambda_handler(test_event, None)

print(f"Status Code: {result['statusCode']}")
print(f"\nResponse Body:")
print(json.dumps(json.loads(result['body']), indent=2))
