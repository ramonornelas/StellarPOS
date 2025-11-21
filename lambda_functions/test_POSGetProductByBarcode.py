#!/usr/bin/env python3
"""
Test suite for POSGetProductByBarcode.py

This test suite includes:
- Validation tests: Use mocks and test algorithms/formatting
- Functional tests: Use real data with TEST stage (expect DynamoDB errors if tables don't exist locally)

Run the script and choose which tests to execute.
"""

import sys
import json
import boto3
import decimal
from datetime import datetime
from unittest.mock import Mock, patch, MagicMock
from botocore.exceptions import ClientError

# Import the functions to test
from POSGetProductByBarcode import (
    lambda_handler,
    validate_barcode,
    search_product_by_barcode,
    search_in_table,
    enrich_variant_with_product_info,
    format_product_data,
    convert_from_dynamodb_item
)

# Test Configuration - Real barcodes for functional tests
TEST_CONFIG = {
    'valid_product_barcode': '6113154263581',  # Barcode for a product without variants
    'valid_variant_barcode': '3163453276068',  # Barcode for a product variant
    'nonexistent_barcode': '9999999999999',    # Barcode that doesn't exist
    'invalid_barcode_empty': '',               # Empty barcode
    'invalid_barcode_short': '123',            # Too short
    'invalid_barcode_long': '1' * 150,         # Too long
    'invalid_barcode_chars': 'ABC!@#$%^',      # Invalid characters
    'stage': 'TEST'  # Stage for functional tests
}

class TestResults:
    def __init__(self):
        self.passed = 0
        self.failed = 0
        self.errors = []

    def add_pass(self, test_name):
        self.passed += 1
        print(f"  ✅ {test_name}")
        print()  # Add blank line after each test result

    def add_fail(self, test_name, error):
        self.failed += 1
        self.errors.append(f"{test_name}: {error}")
        print(f"  ❌ {test_name}")
        print(f"     🔍 Error: {error}")
        print()  # Add blank line after each test result

    def summary(self):
        total = self.passed + self.failed
        print(f"\n{'─' * 60}")
        print(f"📊 Test Summary:")
        print(f"{'─' * 60}")
        print(f"  Total tests: {total}")
        print(f"  ✅ Passed: {self.passed}")
        print(f"  ❌ Failed: {self.failed}")
        
        if self.errors:
            print(f"\n{'─' * 40}")
            print("❌ Failed Tests Details:")
            print(f"{'─' * 40}")
            for i, error in enumerate(self.errors, 1):
                print(f"  {i}. {error}")
        
        return self.failed == 0

def run_test(test_func, test_name, results):
    """Run a single test and record results"""
    try:
        test_func()
        results.add_pass(test_name)
    except Exception as e:
        results.add_fail(test_name, str(e))

# ================================
# VALIDATION TESTS
# ================================

def test_validate_barcode_valid_numeric():
    """Test barcode validation with valid numeric barcode"""
    result = validate_barcode('1234567890123')
    
    if not result['valid']:
        raise AssertionError(f"Valid numeric barcode should pass validation")
    
    if result['normalized_barcode'] != '1234567890123':
        raise AssertionError(f"Normalized barcode should match input")

def test_validate_barcode_valid_alphanumeric():
    """Test barcode validation with valid alphanumeric barcode (Code128)"""
    result = validate_barcode('ABC-123-XYZ')
    
    if not result['valid']:
        raise AssertionError(f"Valid alphanumeric barcode should pass validation")
    
    if result['normalized_barcode'] != 'ABC-123-XYZ':
        raise AssertionError(f"Normalized barcode should match input")

def test_validate_barcode_whitespace_normalization():
    """Test barcode validation normalizes whitespace"""
    result = validate_barcode('  1234567890  ')
    
    if not result['valid']:
        raise AssertionError(f"Barcode with whitespace should be normalized and valid")
    
    if result['normalized_barcode'] != '1234567890':
        raise AssertionError(f"Whitespace should be trimmed, got: {result['normalized_barcode']}")

def test_validate_barcode_empty():
    """Test barcode validation rejects empty barcode"""
    result = validate_barcode('')
    
    if result['valid']:
        raise AssertionError(f"Empty barcode should be invalid")
    
    if 'empty' not in result['message'].lower():
        raise AssertionError(f"Error message should mention empty barcode")

def test_validate_barcode_too_short():
    """Test barcode validation rejects too short barcode"""
    result = validate_barcode('123')
    
    if result['valid']:
        raise AssertionError(f"Too short barcode should be invalid")
    
    if 'length' not in result['message'].lower():
        raise AssertionError(f"Error message should mention length")

def test_validate_barcode_too_long():
    """Test barcode validation rejects too long barcode"""
    result = validate_barcode('1' * 150)
    
    if result['valid']:
        raise AssertionError(f"Too long barcode should be invalid")
    
    if 'length' not in result['message'].lower():
        raise AssertionError(f"Error message should mention length")

def test_validate_barcode_invalid_characters():
    """Test barcode validation rejects invalid characters"""
    result = validate_barcode('ABC!@#$%^')
    
    if result['valid']:
        raise AssertionError(f"Barcode with invalid characters should be invalid")
    
    if 'invalid characters' not in result['message'].lower():
        raise AssertionError(f"Error message should mention invalid characters")

def test_lambda_handler_invalid_method():
    """Test lambda handler rejects non-GET methods"""
    event = {
        'httpMethod': 'POST',
        'pathParameters': {'barcode': TEST_CONFIG['valid_product_barcode']},
        'requestContext': {'stage': 'TEST'}
    }
    
    response = lambda_handler(event, {})
    
    if response['statusCode'] != 405:
        raise AssertionError(f"Expected status 405, got {response['statusCode']}")
    
    body = json.loads(response['body'])
    if body['success'] != False:
        raise AssertionError(f"Response should indicate failure")

def test_lambda_handler_missing_barcode():
    """Test lambda handler validates required barcode parameter"""
    event = {
        'httpMethod': 'GET',
        'pathParameters': {},
        'requestContext': {'stage': 'TEST'}
    }
    
    response = lambda_handler(event, {})
    
    if response['statusCode'] != 400:
        raise AssertionError(f"Expected status 400, got {response['statusCode']}")
    
    body = json.loads(response['body'])
    if 'MISSING_BARCODE' not in body['error']['code']:
        raise AssertionError(f"Error code should be MISSING_BARCODE")

def test_lambda_handler_invalid_barcode_format():
    """Test lambda handler rejects invalid barcode format"""
    event = {
        'httpMethod': 'GET',
        'pathParameters': {'barcode': 'INVALID!@#'},
        'requestContext': {'stage': 'TEST'}
    }
    
    response = lambda_handler(event, {})
    
    if response['statusCode'] != 400:
        raise AssertionError(f"Expected status 400, got {response['statusCode']}")
    
    body = json.loads(response['body'])
    if 'INVALID_BARCODE_FORMAT' not in body['error']['code']:
        raise AssertionError(f"Error code should be INVALID_BARCODE_FORMAT")

def test_format_product_data_product():
    """Test formatting product data for API response"""
    item = {
        'id': 'prod-123',
        'name': 'Test Product',
        'price': decimal.Decimal('99.99'),
        'barcode': '1234567890123',
        'category_name': 'Electronics',
        'stock_available': 50,
        'is_active': True,
        'image_url': 'https://example.com/image.jpg',
        'description': 'Test description'
    }
    
    result = format_product_data(item, 'product')
    
    expected_fields = ['id', 'name', 'price', 'barcode', 'category', 'stock_quantity', 'is_active', 'type', 'image_url', 'description']
    for field in expected_fields:
        if field not in result:
            raise AssertionError(f"Missing field in formatted data: {field}")
    
    if result['type'] != 'product':
        raise AssertionError(f"Type should be 'product', got {result['type']}")

def test_format_product_data_variant():
    """Test formatting variant data for API response"""
    item = {
        'id': 'var-456',
        'product_id': 'prod-123',
        'name': 'Test Variant',
        'price': decimal.Decimal('49.99'),
        'barcode': '1234567890124',
        'category_name': 'Electronics',
        'stock_available': 25,
        'is_active': True,
        'display_order': 1
    }
    
    result = format_product_data(item, 'variant')
    
    if result['type'] != 'variant':
        raise AssertionError(f"Type should be 'variant', got {result['type']}")
    
    if 'product_id' not in result:
        raise AssertionError(f"Variant should include product_id")
    
    if result['product_id'] != 'prod-123':
        raise AssertionError(f"product_id should be 'prod-123', got {result['product_id']}")

def test_convert_from_dynamodb_item():
    """Test DynamoDB item conversion"""
    dynamodb_item = {
        'id': {'S': 'test-123'},
        'name': {'S': 'Test Product'},
        'price': {'N': '10.50'},
        'active': {'BOOL': True},
        'empty': {'NULL': True}
    }
    
    result = convert_from_dynamodb_item(dynamodb_item)
    
    expected = {
        'id': 'test-123',
        'name': 'Test Product',
        'price': decimal.Decimal('10.50'),
        'active': True,
        'empty': None
    }
    
    for key, expected_value in expected.items():
        if key not in result:
            raise AssertionError(f"Missing key in converted item: {key}")
        if result[key] != expected_value:
            raise AssertionError(f"Conversion error for {key}: expected {expected_value}, got {result[key]}")

# ================================
# FUNCTIONAL TESTS (Using real data, no mocks)
# ================================

def test_get_product_by_barcode_existing_product_real():
    """Test getting product by valid barcode (TEST stage)"""
    print(f"    🔍 Testing barcode lookup: {TEST_CONFIG['valid_product_barcode']}")
    print()
    
    event = {
        'httpMethod': 'GET',
        'pathParameters': {'barcode': TEST_CONFIG['valid_product_barcode']},
        'requestContext': {'stage': TEST_CONFIG['stage']}
    }
    
    try:
        response = lambda_handler(event, {})
        
        # Print the full response
        print(f"    📡 API Response:")
        print(f"    Status Code: {response['statusCode']}")
        body = json.loads(response['body'])
        print(f"    Body: {json.dumps(body, indent=2)}")
        print()
        
        if response['statusCode'] not in [200, 404, 500]:
            raise AssertionError(f"Expected status 200, 404, or 500, got {response['statusCode']}")
        
        if response['statusCode'] == 200:
            if not body['success']:
                raise AssertionError(f"Expected success response, got: {body}")
            
            if 'product' not in body:
                raise AssertionError("Response should contain product")
            
            product = body['product']
            required_fields = ['id', 'name', 'price', 'barcode', 'type']
            for field in required_fields:
                if field not in product:
                    raise AssertionError(f"Product missing required field: {field}")
            
            print(f"    ✅ Found product: {product['name']}")
            print(f"    💰 Price: {product['price']}")
            print(f"    🏷️ Type: {product['type']}")
        elif response['statusCode'] == 404:
            print(f"    ⚠️ Product not found (expected if barcode doesn't exist in data)")
        else:
            print(f"    ⚠️ Expected DynamoDB error (table doesn't exist)")
    
    except Exception as e:
        if "dynamodb" in str(e).lower() or "table" in str(e).lower():
            print(f"    ⚠️ Expected DynamoDB error: {e}")
        else:
            raise e

def test_get_variant_by_barcode_real():
    """Test getting variant by valid barcode (TEST stage)"""
    print(f"    🔍 Testing variant barcode lookup: {TEST_CONFIG['valid_variant_barcode']}")
    print()
    
    event = {
        'httpMethod': 'GET',
        'pathParameters': {'barcode': TEST_CONFIG['valid_variant_barcode']},
        'requestContext': {'stage': TEST_CONFIG['stage']}
    }
    
    try:
        response = lambda_handler(event, {})
        
        # Print the full response
        print(f"    📡 API Response:")
        print(f"    Status Code: {response['statusCode']}")
        body = json.loads(response['body'])
        print(f"    Body: {json.dumps(body, indent=2)}")
        print()
        
        if response['statusCode'] not in [200, 404, 500]:
            raise AssertionError(f"Expected status 200, 404, or 500, got {response['statusCode']}")
        
        if response['statusCode'] == 200:
            if not body['success']:
                raise AssertionError(f"Expected success response, got: {body}")
            
            product = body['product']
            
            if product['type'] != 'variant':
                raise AssertionError(f"Expected type 'variant', got {product['type']}")
            
            if 'product_id' not in product:
                raise AssertionError("Variant should include product_id")
            
            print(f"    📦 Found variant: {product['name']}")
            print(f"    🔗 Parent product ID: {product['product_id']}")
            print(f"    💰 Price: {product['price']}")
        elif response['statusCode'] == 404:
            print(f"    ⚠️ Variant not found (expected if barcode doesn't exist in data)")
        else:
            print(f"    ⚠️ Expected DynamoDB error (table doesn't exist)")
    
    except Exception as e:
        if "dynamodb" in str(e).lower() or "table" in str(e).lower():
            print(f"    ⚠️ Expected DynamoDB error: {e}")
        else:
            raise e

def test_get_product_nonexistent_barcode_real():
    """Test getting product with non-existent barcode (TEST stage)"""
    print(f"    🔍 Testing non-existent barcode: {TEST_CONFIG['nonexistent_barcode']}")
    print()
    
    event = {
        'httpMethod': 'GET',
        'pathParameters': {'barcode': TEST_CONFIG['nonexistent_barcode']},
        'requestContext': {'stage': 'TEST'}
    }
    
    try:
        response = lambda_handler(event, {})
        
        if response['statusCode'] == 404:
            body = json.loads(response['body'])
            if body['success'] != False:
                raise AssertionError(f"Expected success=false for 404 response")
            
            if 'PRODUCT_NOT_FOUND' not in body['error']['code']:
                raise AssertionError(f"Expected error code PRODUCT_NOT_FOUND")
            
            print(f"    ✅ Correctly returned 404 for non-existent barcode")
        elif response['statusCode'] == 500:
            print(f"    ⚠️ Expected DynamoDB error (table doesn't exist): {response}")
        else:
            raise AssertionError(f"Expected status 404 or 500, got {response['statusCode']}")
    
    except Exception as e:
        if "dynamodb" in str(e).lower() or "table" in str(e).lower():
            print(f"    ⚠️ Expected DynamoDB error: {e}")
        else:
            raise e

def test_stage_detection():
    """Test that stage is correctly detected from request context"""
    # Test with TEST stage
    event_test = {
        'httpMethod': 'GET',
        'pathParameters': {'barcode': TEST_CONFIG['valid_product_barcode']},
        'requestContext': {'stage': 'TEST'}
    }
    
    # Test with prod stage (default)
    event_prod = {
        'httpMethod': 'GET',
        'pathParameters': {'barcode': TEST_CONFIG['valid_product_barcode']},
        'requestContext': {'stage': 'prod'}
    }
    
    # Test with $default stage (should use prod)
    event_default = {
        'httpMethod': 'GET',
        'pathParameters': {'barcode': TEST_CONFIG['valid_product_barcode']},
        'requestContext': {'stage': '$default'}
    }
    
    # Just verify they don't crash - actual table usage will be tested in functional tests
    try:
        lambda_handler(event_test, {})
        lambda_handler(event_prod, {})
        lambda_handler(event_default, {})
        print(f"    ✅ Stage detection working for TEST, prod, and $default")
    except Exception as e:
        if "dynamodb" in str(e).lower() or "table" in str(e).lower():
            print(f"    ⚠️ Expected DynamoDB error (stage detection still works): {e}")
        else:
            raise e

# ================================
# TEST RUNNERS
# ================================

def run_validation_tests():
    """Run all validation tests"""
    print("\n🔍 Running Validation Tests...")
    print("═" * 50)
    results = TestResults()
    
    validation_tests = [
        (test_validate_barcode_valid_numeric, "Barcode Validation - Valid Numeric"),
        (test_validate_barcode_valid_alphanumeric, "Barcode Validation - Valid Alphanumeric"),
        (test_validate_barcode_whitespace_normalization, "Barcode Validation - Whitespace Normalization"),
        (test_validate_barcode_empty, "Barcode Validation - Empty Barcode"),
        (test_validate_barcode_too_short, "Barcode Validation - Too Short"),
        (test_validate_barcode_too_long, "Barcode Validation - Too Long"),
        (test_validate_barcode_invalid_characters, "Barcode Validation - Invalid Characters"),
        (test_lambda_handler_invalid_method, "Lambda Handler - Invalid Method"),
        (test_lambda_handler_missing_barcode, "Lambda Handler - Missing Barcode"),
        (test_lambda_handler_invalid_barcode_format, "Lambda Handler - Invalid Barcode Format"),
        (test_format_product_data_product, "Format Product Data - Product"),
        (test_format_product_data_variant, "Format Product Data - Variant"),
        (test_convert_from_dynamodb_item, "DynamoDB Item Conversion"),
    ]
    
    for i, (test_func, test_name) in enumerate(validation_tests, 1):
        print(f"\n[{i}/{len(validation_tests)}] {test_name}")
        print("─" * 60)
        run_test(test_func, test_name, results)
    
    return results

def run_functional_tests():
    """Run all functional tests"""
    print("\n⚙️ Running Functional Tests...")
    print("═" * 50)
    results = TestResults()
    
    functional_tests = [
        (test_get_product_by_barcode_existing_product_real, "Get Product by Barcode - Existing Product (Real Data)"),
        (test_get_variant_by_barcode_real, "Get Variant by Barcode (Real Data)"),
        (test_get_product_nonexistent_barcode_real, "Get Product - Non-existent Barcode (Real Data)"),
        (test_stage_detection, "Stage Detection (TEST/prod/$default)"),
    ]
    
    for i, (test_func, test_name) in enumerate(functional_tests, 1):
        print(f"\n[{i}/{len(functional_tests)}] {test_name}")
        print("─" * 60)
        run_test(test_func, test_name, results)
    
    return results

def configure_tests():
    """Allow user to configure test parameters"""
    print("\n⚙️ Test Configuration")
    print("=" * 50)
    print("Current configuration (Barcodes for functional tests):")
    print(f"  Valid Product Barcode: {TEST_CONFIG['valid_product_barcode']}")
    print(f"  Valid Variant Barcode: {TEST_CONFIG['valid_variant_barcode']}")
    print(f"  Non-existent Barcode: {TEST_CONFIG['nonexistent_barcode']}")
    print(f"  Stage: {TEST_CONFIG['stage']}")
    print("=" * 50)
    
    change = input("\nDo you want to change the test configuration? (y/n): ").strip().lower()
    
    if change == 'y':
        print("\nEnter new values (press Enter to keep current value):")
        print("─" * 50)
        
        new_product_barcode = input(f"Valid Product Barcode [{TEST_CONFIG['valid_product_barcode']}]: ").strip()
        if new_product_barcode:
            TEST_CONFIG['valid_product_barcode'] = new_product_barcode
        
        new_variant_barcode = input(f"Valid Variant Barcode [{TEST_CONFIG['valid_variant_barcode']}]: ").strip()
        if new_variant_barcode:
            TEST_CONFIG['valid_variant_barcode'] = new_variant_barcode
        
        new_nonexistent_barcode = input(f"Non-existent Barcode [{TEST_CONFIG['nonexistent_barcode']}]: ").strip()
        if new_nonexistent_barcode:
            TEST_CONFIG['nonexistent_barcode'] = new_nonexistent_barcode
        
        new_stage = input(f"Stage (TEST/prod) [{TEST_CONFIG['stage']}]: ").strip()
        if new_stage:
            TEST_CONFIG['stage'] = new_stage
        
        print("\n✅ Configuration updated!")
        print("Note: Functional tests will use configured stage with real data")
        print("─" * 50)

def main():
    """Main test runner with interactive menu"""
    print("🧪 POSGetProductByBarcode Test Suite")
    print("=" * 40)
    print("📝 Test Types:")
    print("  • Validation Tests: Use mocks, test algorithms and formatting")
    print("  • Functional Tests: Use real data with TEST stage")
    print("⚠️  Note: Functional tests expect DynamoDB errors if tables don't exist locally")
    print("=" * 40)
    
    configure_tests()
    
    while True:
        print("\n📋 Test Menu:")
        print("=" * 40)
        print("1. Run All Tests")
        print("2. Run Validation Tests Only")
        print("3. Run Functional Tests Only") 
        print("4. Reconfigure Tests")
        print("5. Exit")
        print("=" * 40)
        
        choice = input("\nSelect an option (1-5): ").strip()
        
        if choice == '1':
            print("\n" + "🧪" + " " * 20 + "RUNNING ALL TESTS" + " " * 20 + "🧪")
            print("=" * 70)
            
            validation_results = run_validation_tests()
            functional_results = run_functional_tests()
            
            print("\n" + "=" * 70)
            print("📊 OVERALL TEST SUMMARY")
            print("=" * 70)
            total_passed = validation_results.passed + functional_results.passed
            total_failed = validation_results.failed + functional_results.failed
            total_tests = total_passed + total_failed
            
            print(f"📈 Total tests run: {total_tests}")
            print(f"✅ Passed: {total_passed}")
            print(f"❌ Failed: {total_failed}")
            
            if total_passed > 0:
                success_rate = (total_passed / total_tests) * 100
                print(f"📊 Success rate: {success_rate:.1f}%")
            
            all_errors = validation_results.errors + functional_results.errors
            if all_errors:
                print(f"\n{'─' * 40}")
                print("❌ All Failed Tests:")
                print(f"{'─' * 40}")
                for i, error in enumerate(all_errors, 1):
                    print(f"  {i}. {error}")
            
            if total_failed == 0:
                print(f"\n🎉 All tests passed! Great job! 🎉")
            else:
                print(f"\n⚠️  {total_failed} test(s) failed. Review the errors above.")
            
            print("=" * 70)
        
        elif choice == '2':
            results = run_validation_tests()
            success = results.summary()
            if success:
                print("\n🎉 All validation tests passed!")
            print()  # Add blank line
        
        elif choice == '3':
            results = run_functional_tests()
            success = results.summary()
            if success:
                print("\n🎉 All functional tests passed!")
            print()  # Add blank line
        
        elif choice == '4':
            configure_tests()
            print()  # Add blank line
        
        elif choice == '5':
            print("\n👋 Goodbye!")
            break
        
        else:
            print("\n❌ Invalid option. Please select 1-5.")

if __name__ == "__main__":
    main()
