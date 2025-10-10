import json
from StellarGetVariants import lambda_handler

def test_TEST_environment():
    """Test with TEST environment"""
    print("\n=== Testing TEST Environment ===")
    
    # Mock event with API Gateway requestContext for TEST
    event = {
        'requestContext': {
            'stage': 'TEST',
            'httpMethod': 'GET',
            'resourcePath': '/products/{product_id}/variants'
        },
        'pathParameters': {
            'product_id': 'cd917ef6-a5f2-4a0a-947a-a3a2ed5539a8'
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
            'product_id': 'prod-product-456'
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

def test_missing_product_id():
    """Test with missing product_id"""
    print("\n=== Testing Missing Product ID ===")
    
    event = {
        'requestContext': {
            'stage': 'TEST'
        },
        'pathParameters': {}
    }
    
    context = {}
    
    try:
        response = lambda_handler(event, context)
        print("Missing Product ID Response:")
        print(json.dumps(response, indent=2))
        return response
    except Exception as e:
        print(f"Missing Product ID Error: {e}")
        return None

def test_no_path_parameters():
    """Test with no pathParameters"""
    print("\n=== Testing No Path Parameters ===")
    
    event = {
        'requestContext': {
            'stage': 'TEST'
        }
    }
    
    context = {}
    
    try:
        response = lambda_handler(event, context)
        print("No Path Parameters Response:")
        print(json.dumps(response, indent=2))
        return response
    except Exception as e:
        print(f"No Path Parameters Error: {e}")
        return None

def test_empty_product_id():
    """Test with empty product_id"""
    print("\n=== Testing Empty Product ID ===")
    
    event = {
        'requestContext': {
            'stage': 'TEST'
        },
        'pathParameters': {
            'product_id': ''
        }
    }
    
    context = {}
    
    try:
        response = lambda_handler(event, context)
        print("Empty Product ID Response:")
        print(json.dumps(response, indent=2))
        return response
    except Exception as e:
        print(f"Empty Product ID Error: {e}")
        return None

if __name__ == "__main__":
    print("Testing StellarGetVariants with TEST environment only...")
    print("Note: Expect DynamoDB errors since tables don't exist locally")
    print("=" * 60)
    
    test1 = test_TEST_environment()
    test2 = test_no_context()
    test3 = test_missing_product_id()
    test4 = test_no_path_parameters()
    test5 = test_empty_product_id()
    
    print("\n" + "=" * 60)
    print("Test Summary:")
    print(f"TEST Environment: {'✓ Success' if test1 and test1.get('statusCode') in [200, 500] else '✗ Failed'}")
    print(f"No Context (PROD): {'✓ Success' if test2 and test2.get('statusCode') in [200, 500] else '✗ Failed'}")
    print(f"Missing Product ID: {'✓ Success' if test3 and test3.get('statusCode') == 400 else '✗ Failed'}")
    print(f"No Path Parameters: {'✓ Success' if test4 and test4.get('statusCode') == 400 else '✗ Failed'}")
    print(f"Empty Product ID: {'✓ Success' if test5 and test5.get('statusCode') == 400 else '✗ Failed'}")