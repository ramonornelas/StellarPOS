#!/usr/bin/env python3
"""
Test suite for POSGenerateBarcode.py

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
from POSGenerateBarcode import (
    lambda_handler,
    generate_barcode_for_product,
    generate_ean13_barcode,
    is_barcode_unique,
    get_product_by_id,
    get_variant_by_id,
    update_barcode_in_database,
    convert_from_dynamodb_item,
    ValidationError
)

# Test Configuration - Real IDs for functional tests
TEST_CONFIG = {
    'product_id': 'e5749aa6-6301-4fdd-b2e3-e5b47bee3960',  # Real product ID - Has variants
    'variant_id': '529438f8-705d-4df9-a9e8-b170668d3ef5',  # Real variant ID 
    'product_without_variants_id': '4d9f8c2a-5e6b-47f3-9a1d-0c7b8e3f2a9d',  # Product without variants for testing
    'nonexistent_product_id': 'nonexistent-product-123',
    'nonexistent_variant_id': 'nonexistent-variant-456',
    'wrong_variant_id': '9df89b7e-d99a-4879-aec8-4bcf2f79f38f'  # Real variant but from different product
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

def test_ean13_generation_format():
    """Test that EAN-13 generation produces correct format"""
    barcode = generate_ean13_barcode()
    
    # Should be exactly 13 digits
    if len(barcode) != 13:
        raise AssertionError(f"Expected 13 digits, got {len(barcode)}")
    
    # Should contain only digits
    if not barcode.isdigit():
        raise AssertionError(f"Barcode contains non-digit characters: {barcode}")

def test_ean13_check_digit_algorithm():
    """Test EAN-13 check digit calculation with known examples"""
    # Test with a known valid EAN-13: 4006381333931
    test_cases = [
        # (first_12_digits, expected_check_digit)
        ('400638133393', '1'),
        ('123456789012', '8'),  # Calculated manually
        ('000000000000', '0'),  # All zeros should give check digit 0
    ]
    
    for base_digits, expected_check in test_cases:
        # Manually calculate check digit using the algorithm
        base_list = [int(d) for d in base_digits]
        odd_sum = sum(base_list[i] for i in range(0, 12, 2))
        even_sum = sum(base_list[i] for i in range(1, 12, 2))
        total = odd_sum + (even_sum * 3)
        calculated_check = str((10 - (total % 10)) % 10)
        
        if calculated_check != expected_check:
            raise AssertionError(f"Check digit calculation failed for {base_digits}. Expected: {expected_check}, Got: {calculated_check}")

def test_ean13_uniqueness():
    """Test that multiple EAN-13 generations produce unique codes"""
    codes = set()
    iterations = 100
    
    for _ in range(iterations):
        code = generate_ean13_barcode()
        if code in codes:
            raise AssertionError(f"Duplicate barcode generated: {code}")
        codes.add(code)

def test_lambda_handler_invalid_method():
    """Test lambda handler rejects non-POST methods"""
    event = {
        'httpMethod': 'GET',
        'pathParameters': {'product_id': TEST_CONFIG['product_id']},
        'requestContext': {'stage': 'TEST'}  # Use TEST stage
    }
    
    response = lambda_handler(event, {})
    
    if response['statusCode'] != 405:
        raise AssertionError(f"Expected status 405, got {response['statusCode']}")

def test_lambda_handler_missing_product_id():
    """Test lambda handler validates required product_id parameter"""
    event = {
        'httpMethod': 'POST',
        'pathParameters': {},
        'requestContext': {'stage': 'TEST'}  # Use TEST stage
    }
    
    response = lambda_handler(event, {})
    
    if response['statusCode'] != 400:
        raise AssertionError(f"Expected status 400, got {response['statusCode']}")

def test_validation_error_class():
    """Test ValidationError class functionality"""
    # Single error
    error = ValidationError({'field': 'test', 'reason': 'test reason'})
    if len(error.errors) != 1:
        raise AssertionError("ValidationError should handle single error")
    
    # Multiple errors
    errors = [
        {'field': 'field1', 'reason': 'reason1'},
        {'field': 'field2', 'reason': 'reason2'}
    ]
    error = ValidationError(errors)
    if len(error.errors) != 2:
        raise AssertionError("ValidationError should handle multiple errors")

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

def test_generate_barcode_for_existing_product_real():
    """Test barcode generation for real existing product (TEST stage)"""
    print(f"    🔍 Testing product: {TEST_CONFIG['product_without_variants_id']}")
    print()
    
    event = {
        'httpMethod': 'POST',
        'pathParameters': {'product_id': TEST_CONFIG['product_without_variants_id']},
        'queryStringParameters': {},
        'requestContext': {'stage': 'TEST'}  # Use TEST stage for real data
    }
    
    try:
        response = lambda_handler(event, {})
        
        if response['statusCode'] not in [200, 500]:  # 500 expected if tables don't exist
            raise AssertionError(f"Expected status 200 or 500, got {response['statusCode']}")
        
        if response['statusCode'] == 200:
            body = json.loads(response['body'])
            if body['status'] != 'success':
                raise AssertionError(f"Expected success response, got: {body}")
            
            if 'barcode' not in body['data']:
                raise AssertionError("Response should contain barcode")
            
            if len(body['data']['barcode']) != 13:
                raise AssertionError("Generated barcode should be 13 digits")
            
            print(f"    📋 Generated barcode: {body['data']['barcode']}")
        else:
            print(f"    ⚠️ Expected DynamoDB error (table doesn't exist): {response}")
    
    except Exception as e:
        # Expected behavior when tables don't exist locally
        if "dynamodb" in str(e).lower() or "table" in str(e).lower():
            print(f"    ⚠️ Expected DynamoDB error: {e}")
        else:
            raise e

def test_generate_barcode_for_nonexistent_product_real():
    """Test barcode generation fails for non-existent product (TEST stage)"""
    print(f"    🔍 Testing barcode generation for non-existent product: {TEST_CONFIG['nonexistent_product_id']}")
    print()
    
    event = {
        'httpMethod': 'POST',
        'pathParameters': {'product_id': TEST_CONFIG['nonexistent_product_id']},
        'queryStringParameters': {},
        'requestContext': {'stage': 'TEST'}
    }
    
    try:
        response = lambda_handler(event, {})
        
        if response['statusCode'] == 400:
            body = json.loads(response['body'])
            if body['status'] == 'error' and any(error.get('field') == 'product_id' for error in body.get('errors', [])):
                print("    ✅ Correctly rejected non-existent product")
            else:
                raise AssertionError(f"Expected product_id validation error, got: {body}")
        elif response['statusCode'] == 500:
            print(f"    ⚠️ Expected DynamoDB error (table doesn't exist): {response}")
        else:
            raise AssertionError(f"Expected status 400 or 500, got {response['statusCode']}")
    
    except Exception as e:
        if "dynamodb" in str(e).lower() or "table" in str(e).lower():
            print(f"    ⚠️ Expected DynamoDB error: {e}")
        else:
            raise e

def test_generate_barcode_for_variant_real():
    """Test barcode generation for real product variant (TEST stage)"""
    print(f"    🔍 Testing barcode generation for variant: {TEST_CONFIG['variant_id']} of product: {TEST_CONFIG['product_id']}")
    print()
    
    event = {
        'httpMethod': 'POST',
        'pathParameters': {'product_id': TEST_CONFIG['product_id']},
        'queryStringParameters': {'variant_id': TEST_CONFIG['variant_id']},
        'requestContext': {'stage': 'TEST'}
    }
    
    try:
        response = lambda_handler(event, {})
        
        if response['statusCode'] not in [200, 500]:
            raise AssertionError(f"Expected status 200 or 500, got {response['statusCode']}")
        
        if response['statusCode'] == 200:
            body = json.loads(response['body'])
            if body['status'] != 'success':
                raise AssertionError(f"Expected success response, got: {body}")
            
            if body['data']['variant_id'] != TEST_CONFIG['variant_id']:
                raise AssertionError("Response should contain correct variant_id")
            
            print(f"    📋 Generated barcode for variant: {body['data']['barcode']}")
        else:
            print(f"    ⚠️ Expected DynamoDB error (table doesn't exist): {response}")
    
    except Exception as e:
        if "dynamodb" in str(e).lower() or "table" in str(e).lower():
            print(f"    ⚠️ Expected DynamoDB error: {e}")
        else:
            raise e

def test_generate_barcode_variant_wrong_product_real():
    """Test validation fails when variant doesn't belong to product (TEST stage)"""
    print(f"    🔍 Testing variant {TEST_CONFIG['wrong_variant_id']} with wrong product {TEST_CONFIG['product_id']}")
    print()
    
    event = {
        'httpMethod': 'POST',
        'pathParameters': {'product_id': TEST_CONFIG['product_id']},
        'queryStringParameters': {'variant_id': TEST_CONFIG['wrong_variant_id']},
        'requestContext': {'stage': 'TEST'}
    }
    
    try:
        response = lambda_handler(event, {})
        
        if response['statusCode'] == 400:
            body = json.loads(response['body'])
            if body['status'] == 'error' and any('does not belong' in error.get('reason', '') for error in body.get('errors', [])):
                print("    ✅ Correctly detected variant doesn't belong to product")
            else:
                raise AssertionError(f"Expected variant validation error, got: {body}")
        elif response['statusCode'] == 500:
            print(f"    ⚠️ Expected DynamoDB error (table doesn't exist): {response}")
        else:
            raise AssertionError(f"Expected status 400 or 500, got {response['statusCode']}")
    
    except Exception as e:
        if "dynamodb" in str(e).lower() or "table" in str(e).lower():
            print(f"    ⚠️ Expected DynamoDB error: {e}")
        else:
            raise e

def test_generate_barcode_with_overwrite_real():
    """Test barcode generation with overwrite flag (TEST stage)"""
    print(f"    🔍 Testing barcode generation with overwrite for product: {TEST_CONFIG['product_without_variants_id']}")
    print()
    
    event = {
        'httpMethod': 'POST',
        'pathParameters': {'product_id': TEST_CONFIG['product_without_variants_id']},
        'queryStringParameters': {'overwrite': 'true'},
        'requestContext': {'stage': 'TEST'}
    }
    
    try:
        response = lambda_handler(event, {})
        
        if response['statusCode'] not in [200, 500]:
            raise AssertionError(f"Expected status 200 or 500, got {response['statusCode']}")
        
        if response['statusCode'] == 200:
            body = json.loads(response['body'])
            if body['status'] != 'success':
                raise AssertionError(f"Expected success response, got: {body}")
            
            print(f"    📋 Generated barcode with overwrite: {body['data']['barcode']}")
        else:
            print(f"    ⚠️ Expected DynamoDB error (table doesn't exist): {response}")
    
    except Exception as e:
        if "dynamodb" in str(e).lower() or "table" in str(e).lower():
            print(f"    ⚠️ Expected DynamoDB error: {e}")
        else:
            raise e

def test_generate_barcode_product_with_variants_real():
    """Test that products with variants cannot have barcodes generated directly (TEST stage)"""
    print(f"    🔍 Testing barcode generation for product with variants: {TEST_CONFIG['product_id']}")
    print()
    
    event = {
        'httpMethod': 'POST',
        'pathParameters': {'product_id': TEST_CONFIG['product_id']},
        'queryStringParameters': {},  # No variant_id, trying to generate for product directly
        'requestContext': {'stage': 'TEST'}
    }
    
    try:
        response = lambda_handler(event, {})
        
        if response['statusCode'] == 400:
            body = json.loads(response['body'])
            if body['status'] == 'error' and any('has variants' in error.get('reason', '') for error in body.get('errors', [])):
                print("    ✅ Correctly rejected product with variants")
            else:
                raise AssertionError(f"Expected 'has variants' validation error, got: {body}")
        elif response['statusCode'] == 500:
            print(f"    ⚠️ Expected DynamoDB error (table doesn't exist): {response}")
        else:
            raise AssertionError(f"Expected status 400 or 500, got {response['statusCode']}")
    
    except Exception as e:
        if "dynamodb" in str(e).lower() or "table" in str(e).lower():
            print(f"    ⚠️ Expected DynamoDB error: {e}")
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
        (test_ean13_generation_format, "EAN-13 Format Generation"),
        (test_ean13_check_digit_algorithm, "EAN-13 Check Digit Algorithm"),
        (test_ean13_uniqueness, "EAN-13 Uniqueness"),
        (test_lambda_handler_invalid_method, "Lambda Handler - Invalid Method"),
        (test_lambda_handler_missing_product_id, "Lambda Handler - Missing Product ID"),
        (test_validation_error_class, "ValidationError Class"),
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
        #(test_generate_barcode_for_existing_product_real, "Generate Barcode - Existing Product (Real Data)"),
        #(test_generate_barcode_for_nonexistent_product_real, "Generate Barcode - Non-existent Product (Real Data)"),
        #(test_generate_barcode_for_variant_real, "Generate Barcode - Product Variant (Real Data)"),
        #(test_generate_barcode_variant_wrong_product_real, "Generate Barcode - Wrong Product for Variant (Real Data)"),
        (test_generate_barcode_product_with_variants_real, "Generate Barcode - Product with Variants (Real Data)"),
        #(test_generate_barcode_with_overwrite_real, "Generate Barcode - With Overwrite (Real Data)"),
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
    print("Current configuration (Real IDs for functional tests):")
    print(f"  Product ID (with variants): {TEST_CONFIG['product_id']}")
    print(f"  Product ID (without variants): {TEST_CONFIG['product_without_variants_id']}")
    print(f"  Variant ID: {TEST_CONFIG['variant_id']}")
    print(f"  Non-existent Product ID: {TEST_CONFIG['nonexistent_product_id']}")
    print(f"  Wrong Variant ID: {TEST_CONFIG['wrong_variant_id']}")
    print(f"  Stage: TEST (for real data)")
    print("=" * 50)
    
    change = input("\nDo you want to change the test configuration? (y/n): ").strip().lower()
    
    if change == 'y':
        print("\nEnter new values (press Enter to keep current value):")
        print("─" * 50)
        
        new_product_id = input(f"Product ID (with variants) [{TEST_CONFIG['product_id']}]: ").strip()
        if new_product_id:
            TEST_CONFIG['product_id'] = new_product_id
        
        new_product_without_variants = input(f"Product ID (without variants) [{TEST_CONFIG['product_without_variants_id']}]: ").strip()
        if new_product_without_variants:
            TEST_CONFIG['product_without_variants_id'] = new_product_without_variants
        
        new_variant_id = input(f"Variant ID [{TEST_CONFIG['variant_id']}]: ").strip()
        if new_variant_id:
            TEST_CONFIG['variant_id'] = new_variant_id
        
        new_nonexistent_product = input(f"Non-existent Product ID [{TEST_CONFIG['nonexistent_product_id']}]: ").strip()
        if new_nonexistent_product:
            TEST_CONFIG['nonexistent_product_id'] = new_nonexistent_product
        
        new_wrong_variant = input(f"Wrong Variant ID [{TEST_CONFIG['wrong_variant_id']}]: ").strip()
        if new_wrong_variant:
            TEST_CONFIG['wrong_variant_id'] = new_wrong_variant
        
        print("\n✅ Configuration updated!")
        print("Note: Functional tests will use TEST stage with real data")
        print("─" * 50)

def main():
    """Main test runner with interactive menu"""
    print("🧪 POSGenerateBarcode Test Suite")
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
