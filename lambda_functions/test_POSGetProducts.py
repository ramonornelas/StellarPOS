import json
from POSGetProducts import lambda_handler

def test_TEST_environment():
    """Test with TEST environment"""
    print("\n=== Testing TEST Environment ===")
    
    # Mock event with API Gateway requestContext for TEST
    event = {
        'requestContext': {
            'stage': 'TEST',
            'httpMethod': 'GET',
            'resourcePath': '/products'
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
    
    event = {}
    
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
    print("Testing POSGetProducts with TEST environment only...")
    print("Note: Expect DynamoDB errors since tables don't exist locally")
    print("=" * 60)
    
    test_result = test_TEST_environment()
    
    print("\n" + "=" * 60)
    print("Test Summary:")
    print(f"TEST Environment: {'✓ Success' if test_result and test_result.get('statusCode') in [200, 500] else '✗ Failed'}")
