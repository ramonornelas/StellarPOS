import json
from StellarGetCashRegisterHistory import lambda_handler

def test_scenario(test_name, event):
    """Helper function to test a scenario"""
    print(f"\n{'='*50}")
    print(f"Testing: {test_name}")
    print(f"{'='*50}")
    print(f"Event: {json.dumps(event, indent=2)}")
    
    context = {}
    response = lambda_handler(event, context)
    
    print(f"Response: {json.dumps(response, indent=2)}")
    return response

# Test Scenario 1: Get history with specific date
test_scenario(
    "Get history with specific date",
    {
        'pathParameters': {
            'date': '2025-07-14'
        }
    }
)

# Test Scenario 2: Get all history without date
test_scenario(
    "Get all history without date",
    {
        'pathParameters': None,
        'queryStringParameters': None
    }
)

# Test Scenario 3: Get latest 5 records without date
test_scenario(
    "Get latest 5 records without date",
    {
        'pathParameters': None,
        'queryStringParameters': {
            'limit': '5'
        }
    }
)

# Test Scenario 4: Get latest 3 records for specific date
test_scenario(
    "Get latest 3 records for specific date",
    {
        'pathParameters': {
            'date': '2025-07-16'
        },
        'queryStringParameters': {
            'limit': '3'
        }
    }
)

# Test Scenario 5: Test invalid limit parameter
test_scenario(
    "Test invalid limit parameter",
    {
        'pathParameters': None,
        'queryStringParameters': {
            'limit': 'invalid'
        }
    }
)

# Test Scenario 6: Test with empty parameters
test_scenario(
    "Test with empty parameters",
    {
        'pathParameters': {},
        'queryStringParameters': {}
    }
)

# Test Scenario 7: Test with missing pathParameters and queryStringParameters
test_scenario(
    "Test with missing pathParameters and queryStringParameters",
    {}
)

# Test Scenario 8: Test with limit = 0
test_scenario(
    "Test with limit = 0",
    {
        'pathParameters': None,
        'queryStringParameters': {
            'limit': '0'
        }
    }
)

# Test Scenario 9: Test with negative limit
test_scenario(
    "Test with negative limit",
    {
        'pathParameters': None,
        'queryStringParameters': {
            'limit': '-5'
        }
    }
)

print(f"\n{'='*50}")
print("All test scenarios completed!")
print(f"{'='*50}")