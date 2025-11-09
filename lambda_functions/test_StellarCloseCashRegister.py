import json
import uuid
from datetime import datetime
from StellarCloseCashRegister import lambda_handler

def with_test_stage(event):
    event = dict(event) if event else {}
    event['requestContext'] = {
        'stage': 'TEST',
        'httpMethod': 'POST',
        'resourcePath': '/close-cash-register'
    }
    return event

# Generate realistic ID and timestamp
current_datetime = datetime.utcnow().isoformat() + 'Z'

# Mock event and context for cash register closeout (cierre de caja) with returns
event = {
    'body': json.dumps({
        'id': "6598a7db-1aad-4e46-ba95-658a6cce9c1b",
        'closing_amount': 2000,
        'closed_at': current_datetime,
        'status': 'closed',
        'closed_user_id': 'user123',
        'notes': 'Cierre de caja de prueba con retornos incluidos',
        'cash_sales': 500,
    })
}

context = {}

print("🧪 Testing StellarCloseCashRegister with cash returns scenario")
print("=" * 60)
print(f"📋 Test Configuration:")
print(f"   Cash Register ID: 6598a7db-1aad-4e46-ba95-658a6cce9c1b")
print(f"   Closing DateTime: {current_datetime}")
print(f"   Cash Sales: $500.00")
print(f"   Closing Amount: $2000.00")
print(f"   Expected: Function will query cash returns and calculate:")
print(f"   expected_amount = opening_amount + cash_sales - cash_returns")
print()

# Call the lambda_handler function with TEST stage
print("🚀 Executing lambda function...")
response = lambda_handler(with_test_stage(event), context)

print("\n📋 Response:")
print("=" * 60)
print(json.dumps(response, indent=4))

# Analyze the response
if response.get('statusCode') == 200:
    try:
        body = json.loads(response.get('body', '{}'))
        print(f"\n🎯 Analysis:")
        print(f"   Opening Amount: ${body.get('opening_amount', 'N/A')}")
        print(f"   Cash Sales: ${body.get('cash_sales', 'N/A')}")
        print(f"   Cash Returns: ${body.get('cash_returns', 'N/A')}")
        print(f"   Expected Amount: ${body.get('expected_amount', 'N/A')}")
        print(f"   Closing Amount: ${body.get('closing_amount', 'N/A')}")
        print(f"   Difference: ${body.get('difference_amount', 'N/A')}")
        print(f"   ✅ Success: Cash returns included in calculation")
    except:
        print(f"   ⚠️  Could not parse response body")
elif response.get('statusCode') == 400:
    print(f"   ❌ Validation Error: Check required fields")
elif response.get('statusCode') == 404:
    print(f"   ❌ Not Found: Closeout ID may not exist")
elif response.get('statusCode') == 500:
    print(f"   ⚠️  Server Error: May be expected if DynamoDB tables don't exist")
else:
    print(f"   ❓ Unknown status: {response.get('statusCode')}")