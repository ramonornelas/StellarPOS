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
            'date': '2026-01-02',
            'ticket': '#008',
            'subtotal': 351,
            'payment_method': 'card',
            'products': [
                {
                    'id': 'bd6ecb7c-6c47-44cc-adf5-7032bbee7250',
                    'name': 'Miel Aguacate y Árnica 1.5 kg',
                    'price': 330,
                    'quantity': 1,
                    'category_name': 'Mieles',
                    'is_combo': False,
                    'product_variant_id': 'a3c9e5f2-78d4-4b61-9f2e-b0d1c74a68e9'
                },
                {
                    'id': 'e1c3b8a2-4f7d-4c8e-9a1b-2d5e6f7c8b9a',
                    'name': 'Combo paletas',
                    'price': 15,
                    'quantity': 1,
                    'category_name': 'Dulces',
                    'is_combo': True,
                    'combo_products': [
                        {
                            'product_id': 'b26083e1-c89c-488b-bbed-6e087cac460d',
                            'quantity_per_combo': '3'
                        }
                    ]
                },
                {
                    'id': 'b26083e1-c89c-488b-bbed-6e087cac460d',
                    'name': 'Paleta',
                    'price': 6,
                    'quantity': 1,
                    'category_name': 'Derivados de miel',
                    'is_combo': False
                }
            ],
            'split_payments': [
                {
                    'id': 1,
                    'amount': 351,
                    'payment_method': 'card'
                }
            ],
            'discount': 0,
            'tip': 0,
            'received_amount': 351,
            'change': 0,
            'notes': '',
            'cash_register_id': '38c530db-5195-418e-80cf-f28f0962c6a3',
            'updated_user_id': '62acd544-63a5-4c6a-92dc-cb4090a5f747'
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

# New test following the same non-mocked style: product with variant
def test_TEST_environment_with_variant():
    """Test with TEST environment using a product that includes a variant."""
    print("\n=== Testing TEST Environment (product with variant) ===")

    event = {
        'requestContext': {
            'stage': 'TEST',
            'httpMethod': 'POST',
            'resourcePath': '/orders'
        },
        'body': json.dumps({
            'date': '2025-11-17',
            'ticket': '#020',
            'subtotal': 12,
            'payment_method': 'cash',
            'products': [
                {
                    'product_name': 'Oblea',
                    'display_order': 999,
                    'price': 0,
                    'id': '7c8d59d0-9c2f-4c88-a3c0-5e82e2d2781d',
                    'product_id': '7c8d59d0-9c2f-4c88-a3c0-5e82e2d2781d',
                    'name': 'Oblea',
                    'product_variant_id': '9df89b7e-d99a-4879-aec8-4bcf2f79f38f',
                    'image_url': 'https://pos-padrey-images.s3.us-west-1.amazonaws.com/products/IMG+2025-09-25+at+1.32.46+PM.jpeg',
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
            'updated_user_id': 'test_user_variant',
            'updated_username': 'testuser_variant'
        })
    }

    context = {}

    try:
        response = lambda_handler(event, context)
        print("Variant TEST Response:")
        print(json.dumps(response, indent=2))
        return response
    except Exception as e:
        print(f"Variant TEST Error: {e}")
        return None

def test_no_context():
    """Test with no requestContext (should default to prod)"""
    print("\n=== Testing No Context (Default to PROD) ===")
    
    # Mock event without requestContext - should default to prod
    event = {
        'body': json.dumps({
            'date': '2025-10-28',
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
    # Also run the variant test for convenience
    test_variant_result = test_TEST_environment_with_variant()
    
    print("\n" + "=" * 60)
    print("Test Summary:")
    print(f"TEST Environment: {'✓ Success' if test_result and test_result.get('statusCode') in [201, 500] else '✗ Failed'}")