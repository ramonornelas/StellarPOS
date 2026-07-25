import json
import sys
import os

# Add the lambda_functions directory to the path
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

from POSSubmitReturn import lambda_handler

# Quick test event for POST /returns
test_event = {
    'httpMethod': 'POST',
    'path': '/returns',
    'requestContext': {
        'stage': 'PROD'
    },
    'headers': {
        'Content-Type': 'application/json'
    },
    'body': json.dumps({
        "order_id": "606e8de6-4ad0-43c2-b4a7-539309537599",
        "cash_register_id": "18342745-f0da-40e6-bec0-5cc11324fa6e",
        "products": [
            {
                "id": "4d6b859b-f84d-49ab-a828-a642710720d6",
                "variant_id": "5d0a8fc5-03b1-4f06-bc5e-443aa6e5617c",
                "quantity": 1
            }
        ],
        "refund_method": "cash",
        "notes": "Prueba",
        "user_id": "3f418447-bbc3-4906-9c59-7a1c40efa35a"
    })
}

print("Running quick test for POSSubmitReturn...")
print(json.dumps(test_event, indent=2))

result = lambda_handler(test_event, None)

print("\nStatus Code:", result.get('statusCode'))
try:
    body = json.loads(result.get('body', '{}'))
    print(json.dumps(body, indent=2))
except Exception:
    print(result.get('body'))
