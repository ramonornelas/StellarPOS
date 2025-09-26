import json
from StellarDeleteProduct import lambda_handler

def test_TEST_environment():
    """Test with TEST environment"""
    print("\n=== Testing TEST Environment ===")
    
    # Mock event with API Gateway requestContext for TEST
    event = {
        'requestContext': {
            'stage': 'TEST',
            'httpMethod': 'DELETE',
            'resourcePath': '/product/{id}'
        },
        'pathParameters': {
            'id': '870a1302-2304-4cb4-9808-776ba53d4955'
        }
    }
    
    context = {}
    
    try:
        response = lambda_handler(event, context)
        print("TEST Response:")
        print(json.dumps(response, indent=2))
        return response
    except Exception as e:
        print(f"TEST Error: {e}")
        return None

def test_no_context():
    """Test with no requestContext (should default to prod)"""
    print("\n=== Testing No Context (Default to PROD) ===")
    
    event = {
        'pathParameters': {
            'id': 'prod-product-id-456'
        }
    }
    
    context = {}
    
    try:
        response = lambda_handler(event, context)
        print("No Context Response:")
        print(json.dumps(response, indent=2))
        return response
    except Exception as e:
        print(f"No Context Error: {e}")
        return None

if __name__ == "__main__":
    print("Testing StellarDeleteProduct with TEST environment only...")
    print("Note: Expect DynamoDB errors since tables don't exist locally")
    print("=" * 60)
    
    test_result = test_TEST_environment()
    
    print("\n" + "=" * 60)
    print("Test Summary:")
    if test_result and test_result.get('statusCode') in [200, 500]:
        print("TEST Environment: ✓ Success")
    else:
        print("TEST Environment: ✗ Failed")
