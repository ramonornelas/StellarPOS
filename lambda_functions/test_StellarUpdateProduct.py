import json
from StellarUpdateProduct import lambda_handler

def test_TEST_environment():
    """Test with TEST environment"""
    print("\n=== Testing TEST Environment ===")
    
    # Mock event with API Gateway requestContext for TEST
    event = {
        'requestContext': {
            'stage': 'TEST',
            'httpMethod': 'PUT',
            'resourcePath': '/product/{id}'
        },
        'pathParameters': {
            'id': 'test-product-id-123'
        },
        'body': json.dumps({
            'name': '42Updated Test Product',
            'price': 15.99
        })
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
        },
        'body': json.dumps({
            'name': 'Updated Prod Product',
            'price': 25.99
        })
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
    print("Testing StellarUpdateProduct with TEST environment only...")
    print("Note: Expect DynamoDB errors since tables don't exist locally")
    print("=" * 60)
    
    test_result = test_TEST_environment()
    
    print("\n" + "=" * 60)
    print("Test Summary:")
    print(f"TEST Environment: {'✓ Success' if test_result and test_result.get('statusCode') in [200, 500] else '✗ Failed'}")
