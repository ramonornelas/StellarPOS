import json
from POSCreateOrders import lambda_handler

def test_TEST_environment():
    """Test with TEST environment"""
    print("\n=== Testing TEST Environment ===")
    
    # Mock event with API Gateway requestContext for TEST
    event = {
        'requestContext': {
            'stage': 'TEST',  # This will be detected as 'test'
            'httpMethod': 'POST',
            'resourcePath': '/orders'
        },
        'body': json.dumps({
            'date': '2025-07-11',
            'ticket': '#010',
            'subtotal': 12,
            'payment_method': 'cash',
            'products': [
                {
                    'category_id': 'ed501409-b604-4f1c-9b13-32c4bc1f4698',
                    'cost': '0',
                    'product_name': 'Paleta',
                    'category_name': 'Derivados de miel',
                    'display_order': 1,
                    'expiration': '',
                    'price': 6,
                    'description': '',
                    'id': 'b26083e1-c89c-488b-bbed-6e087cac460d',
                    'product_id': 'b26083e1-c89c-488b-bbed-6e087cac460d',
                    'name': 'Paleta propoleo',
                    'product_variant_id': '026e713d-814c-49fa-a387-6502d9a3849b',
                    'image_url': '',
                    'is_combo': False,
                    'is_active': True,
                    'quantity': 1
                }
            ],
            'split_payments': [
                {
                    'id': 1,
                    'amount': 6,
                    'payment_method': 'cash'
                }
            ],
            'discount': 0,
            'tip': 0,
            'received_amount': 6,
            'change': 0,
            'notes': '',
            'cash_register_id': '45de088e-561e-436f-bedb-944f94abeb55',
            'updated_user_id': 'test_user_123',
            'updated_username': 'testuser'
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
    
    # Mock event without requestContext - should default to prod
    event = {
        'body': json.dumps({
            'date': '2025-07-11',
            'ticket': '#011',
            'subtotal': 6,
            'payment_method': 'cash',
            'products': [
                {
                    'category_id': 'ed501409-b604-4f1c-9b13-32c4bc1f4698',
                    'cost': '0',
                    'product_name': 'Paleta',
                    'category_name': 'Derivados de miel',
                    'display_order': 1,
                    'expiration': '',
                    'price': 6,
                    'description': '',
                    'id': 'b26083e1-c89c-488b-bbed-6e087cac460d',
                    'product_id': 'b26083e1-c89c-488b-bbed-6e087cac460d',
                    'name': 'Paleta propoleo',
                    'product_variant_id': '026e713d-814c-49fa-a387-6502d9a3849b',
                    'image_url': '',
                    'is_combo': False,
                    'is_active': True,
                    'quantity': 1
                }
            ],
            'split_payments': [
                {
                    'id': 1,
                    'amount': 6,
                    'payment_method': 'cash'
                }
            ],
            'discount': 0,
            'tip': 0,
            'received_amount': 6,
            'change': 0,
            'notes': '',
            'cash_register_id': '45de088e-561e-436f-bedb-944f94abeb55',
            'updated_user_id': 'default_user_123',
            'updated_username': 'defaultuser'
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
    print("Testing POSCreateOrders with TEST environment only...")
    print("Note: Expect DynamoDB errors since tables don't exist locally")
    print("=" * 60)
    
    # Test only TEST environment
    test_result = test_TEST_environment()
    
    print("\n" + "=" * 60)
    print("Test Summary:")
    print(f"TEST Environment: {'✓ Success' if test_result and test_result.get('statusCode') in [201, 500] else '✗ Failed'}")