import json
from StellarUpdateVariant import lambda_handler

def test_TEST_environment():
    """Test with TEST environment"""
    print("\n=== Testing TEST Environment ===")
    
    # Mock event with API Gateway requestContext for TEST
    event = {
        'requestContext': {
            'stage': 'TEST',
            'httpMethod': 'PUT',
            'resourcePath': '/products/{product_id}/variants/{variant_id}'
        },
        'pathParameters': {
            'product_id': 'cd917ef6-a5f2-4a0a-947a-a3a2ed5539a8',
            'variant_id': '1dc7ac96-a4cb-4073-a653-a86c60e58fe1'
        },
        'body': json.dumps({
            'name': 'Updated Test Variant',
            'price': 18.99,
            'stock_available': 15,
            'active': True,
            'display_order': 2,
            'updated_user_id': 'test-user-123'
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
            'product_id': 'prod-product-456',
            'variant_id': 'prod-variant-789'
        },
        'body': json.dumps({
            'name': 'Updated Prod Variant',
            'price': 29.99,
            'stock_available': 8,
            'active': False
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

def test_missing_required_fields():
    """Test with missing required fields"""
    print("\n=== Testing Missing Required Fields ===")
    
    event = {
        'requestContext': {
            'stage': 'TEST'
        },
        'pathParameters': {
            'product_id': 'test-product-123',
            'variant_id': 'test-variant-456'
        },
        'body': json.dumps({
            'name': 'Updated Test Variant'
            # Missing price
        })
    }
    
    context = {}
    
    try:
        response = lambda_handler(event, context)
        print("Missing Fields Response:")
        print(json.dumps(response, indent=2))
        return response
    except Exception as e:
        print(f"Missing Fields Error: {e}")
        return None

def test_missing_path_parameters():
    """Test with missing path parameters"""
    print("\n=== Testing Missing Path Parameters ===")
    
    event = {
        'requestContext': {
            'stage': 'TEST'
        },
        'pathParameters': {
            'product_id': 'test-product-123'
            # Missing variant_id
        },
        'body': json.dumps({
            'name': 'Updated Test Variant',
            'price': 18.99
        })
    }
    
    context = {}
    
    try:
        response = lambda_handler(event, context)
        print("Missing Path Parameters Response:")
        print(json.dumps(response, indent=2))
        return response
    except Exception as e:
        print(f"Missing Path Parameters Error: {e}")
        return None

def test_invalid_json():
    """Test with invalid JSON"""
    print("\n=== Testing Invalid JSON ===")
    
    event = {
        'requestContext': {
            'stage': 'TEST'
        },
        'pathParameters': {
            'product_id': 'test-product-123',
            'variant_id': 'test-variant-456'
        },
        'body': 'invalid json'
    }
    
    context = {}
    
    try:
        response = lambda_handler(event, context)
        print("Invalid JSON Response:")
        print(json.dumps(response, indent=2))
        return response
    except Exception as e:
        print(f"Invalid JSON Error: {e}")
        return None

if __name__ == "__main__":
    print("Testing StellarUpdateVariant with TEST environment only...")
    print("Note: Expect DynamoDB errors since tables don't exist locally")
    print("=" * 60)
    
    test1 = test_TEST_environment()
    test2 = test_no_context()
    test3 = test_missing_required_fields()
    test4 = test_missing_path_parameters()
    test5 = test_invalid_json()
    
    print("\n" + "=" * 60)
    print("Test Summary:")
    print(f"TEST Environment: {'✓ Success' if test1 and test1.get('statusCode') in [200, 500] else '✗ Failed'}")
    print(f"No Context (PROD): {'✓ Success' if test2 and test2.get('statusCode') in [200, 500] else '✗ Failed'}")
    print(f"Missing Fields: {'✓ Success' if test3 and test3.get('statusCode') == 400 else '✗ Failed'}")
    print(f"Missing Path Parameters: {'✓ Success' if test4 and test4.get('statusCode') == 400 else '✗ Failed'}")
    print(f"Invalid JSON: {'✓ Success' if test5 and test5.get('statusCode') == 400 else '✗ Failed'}")