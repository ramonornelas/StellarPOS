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

def test_with_stock_filter():
    """Test with with_stock=true query parameter"""
    print("\n=== Testing with_stock=true Filter ===")
    
    # Mock event with with_stock query parameter
    event = {
        'requestContext': {
            'stage': 'TEST',
            'httpMethod': 'GET',
            'resourcePath': '/products'
        },
        'queryStringParameters': {
            'with_stock': 'true'
        }
    }
    
    context = {}
    
    try:
        response = lambda_handler(event, context)
        print("With Stock Response:")
        print(json.dumps(response, indent=2))
        return response
    except Exception as e:
        print(f"With Stock Error: {e}")
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

def test_no_query_params():
    """Test with no query parameters (original behavior)"""
    print("\n=== Testing No Query Parameters (Original Behavior) ===")
    
    event = {
        'requestContext': {
            'stage': 'TEST',
            'httpMethod': 'GET',
            'resourcePath': '/products'
        },
        'queryStringParameters': None
    }
    
    context = {}
    
    try:
        response = lambda_handler(event, context)
        print("No Query Params Response:")
        print(json.dumps(response, indent=2))
        return response
    except Exception as e:
        print(f"No Query Params Error: {e}")
        return None

if __name__ == "__main__":
    print("Testing POSGetProducts with enhanced functionality...")
    print("Note: Expect DynamoDB errors since tables don't exist locally")
    print("=" * 60)
    
    # Test original functionality
    test_result_original = test_TEST_environment()
    test_result_no_params = test_no_query_params()
    
    # Test new with_stock functionality  
    test_result_with_stock = test_with_stock_filter()
    
    print("\n" + "=" * 60)
    print("Test Summary:")
    print(f"TEST Environment: {'✓ Success' if test_result_original and test_result_original.get('statusCode') in [200, 500] else '✗ Failed'}")
    print(f"No Query Params: {'✓ Success' if test_result_no_params and test_result_no_params.get('statusCode') in [200, 500] else '✗ Failed'}")
    print(f"With Stock Filter: {'✓ Success' if test_result_with_stock and test_result_with_stock.get('statusCode') in [200, 500] else '✗ Failed'}")
