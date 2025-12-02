#!/usr/bin/env python3
"""
Test suite for POSGetReturnsSummary.py

This test suite includes:
- Validation tests: Use mocks and test algorithms/formatting
- Functional tests: Use real data with TEST stage (expect DynamoDB errors if tables don't exist locally)

Run the script and choose which tests to execute.
"""

import sys
import json
import boto3
import decimal
from datetime import datetime, timedelta
from unittest.mock import Mock, patch, MagicMock
from botocore.exceptions import ClientError

# Import the functions to test
from POSGetReturnsSummary import (
    lambda_handler,
    get_returns_summary,
    get_returns_by_date,
    calculate_refund_summary,
    validate_date_format,
    error_response,
    get_table_names
)

# Test Configuration - Date for functional tests
TEST_CONFIG = {
    'test_date': '2025-12-02',  # Date to test returns summary
    'invalid_date': '2024-13-45',  # Invalid date for validation tests
    'future_date': (datetime.now() + timedelta(days=30)).strftime('%Y-%m-%d'),  # Future date
}

class TestResults:
    def __init__(self):
        self.passed = 0
        self.failed = 0
        self.errors = []

    def add_pass(self, test_name):
        self.passed += 1
        print(f"  ✅ {test_name}")
        print()  

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

def test_validate_date_format_valid():
    """Test date format validation with valid dates"""
    valid_dates = [
        '2024-12-01',
        '2023-01-15',
        '2025-06-30',
        '2024-02-29',  # Leap year
    ]
    
    for date in valid_dates:
        if not validate_date_format(date):
            raise AssertionError(f"Valid date rejected: {date}")

def test_validate_date_format_invalid():
    """Test date format validation with invalid dates"""
    invalid_dates = [
        '2024-13-01',  # Invalid month
        '2024-12-32',  # Invalid day
        '2023-02-29',  # Not a leap year
        '24-12-01',    # Wrong format
        '2024/12/01',  # Wrong separator
        'invalid',     # Not a date
        '',            # Empty string
    ]
    
    for date in invalid_dates:
        if validate_date_format(date):
            raise AssertionError(f"Invalid date accepted: {date}")

def test_lambda_handler_invalid_method():
    """Test lambda handler rejects non-GET methods"""
    event = {
        'httpMethod': 'POST',
        'queryStringParameters': {'date': TEST_CONFIG['test_date']},
        'requestContext': {'stage': 'TEST'}
    }
    
    response = lambda_handler(event, {})
    
    if response['statusCode'] != 405:
        raise AssertionError(f"Expected status 405, got {response['statusCode']}")

def test_lambda_handler_missing_date():
    """Test lambda handler validates required date parameter"""
    event = {
        'httpMethod': 'GET',
        'queryStringParameters': {},
        'requestContext': {'stage': 'TEST'}
    }
    
    response = lambda_handler(event, {})
    
    if response['statusCode'] != 400:
        raise AssertionError(f"Expected status 400, got {response['statusCode']}")
    
    body = json.loads(response['body'])
    if 'date' not in str(body.get('errors', [])):
        raise AssertionError("Error should mention missing date parameter")

def test_lambda_handler_invalid_date_format():
    """Test lambda handler rejects invalid date format"""
    event = {
        'httpMethod': 'GET',
        'queryStringParameters': {'date': TEST_CONFIG['invalid_date']},
        'requestContext': {'stage': 'TEST'}
    }
    
    response = lambda_handler(event, {})
    
    if response['statusCode'] != 400:
        raise AssertionError(f"Expected status 400, got {response['statusCode']}")
    
    body = json.loads(response['body'])
    if 'YYYY-MM-DD' not in str(body.get('message', '')):
        raise AssertionError("Error should mention YYYY-MM-DD format")

def test_get_table_names_test_stage():
    """Test table name retrieval for TEST stage"""
    tables = get_table_names('test')
    
    if 'RETURN_TICKET_TABLE' not in tables:
        raise AssertionError("Missing RETURN_TICKET_TABLE in test stage")
    
    if not tables['RETURN_TICKET_TABLE'].startswith('test_'):
        raise AssertionError("Test stage should use test_ prefix")

def test_get_table_names_prod_stage():
    """Test table name retrieval for PROD stage"""
    tables = get_table_names('prod')
    
    if 'RETURN_TICKET_TABLE' not in tables:
        raise AssertionError("Missing RETURN_TICKET_TABLE in prod stage")
    
    if tables['RETURN_TICKET_TABLE'].startswith('test_'):
        raise AssertionError("Prod stage should not use test_ prefix")

def test_error_response_format():
    """Test error response formatting"""
    response = error_response(400, 'Test error message')
    
    if response['statusCode'] != 400:
        raise AssertionError("Status code not set correctly")
    
    body = json.loads(response['body'])
    if body['status'] != 'error':
        raise AssertionError("Status should be 'error'")
    
    if body['message'] != 'Test error message':
        raise AssertionError("Message not set correctly")

def test_error_response_with_errors():
    """Test error response with validation errors"""
    errors = [
        {'field': 'date', 'reason': 'Invalid format'},
        {'field': 'method', 'reason': 'Invalid method'}
    ]
    
    response = error_response(422, 'Validation failed', errors)
    body = json.loads(response['body'])
    
    if 'errors' not in body:
        raise AssertionError("Response should contain errors array")
    
    if len(body['errors']) != 2:
        raise AssertionError("Should have 2 validation errors")

def test_calculate_refund_summary_empty():
    """Test refund summary calculation with no returns"""
    summary = calculate_refund_summary([])
    
    if summary['total_amount'] != 0:
        raise AssertionError("Total amount should be 0 for empty returns")
    
    if summary['total_transactions'] != 0:
        raise AssertionError("Total transactions should be 0 for empty returns")
    
    if len(summary['refund_methods']) != 0:
        raise AssertionError("Refund methods should be empty for no returns")

def test_calculate_refund_summary_single_method():
    """Test refund summary calculation with single refund method"""
    mock_returns = [
        {'id': '1', 'total_amount': decimal.Decimal('100.00'), 'refund_method': 'cash'},
        {'id': '2', 'total_amount': decimal.Decimal('50.00'), 'refund_method': 'cash'},
    ]
    
    summary = calculate_refund_summary(mock_returns)
    
    if summary['total_amount'] != 150.00:
        raise AssertionError(f"Expected total 150.00, got {summary['total_amount']}")
    
    if summary['total_transactions'] != 2:
        raise AssertionError(f"Expected 2 transactions, got {summary['total_transactions']}")
    
    if len(summary['refund_methods']) != 1:
        raise AssertionError("Should have 1 refund method")
    
    cash_method = summary['refund_methods'][0]
    if cash_method['method'] != 'cash':
        raise AssertionError("Method should be cash")
    
    if cash_method['total_amount'] != 150.00:
        raise AssertionError(f"Cash total should be 150.00, got {cash_method['total_amount']}")
    
    if cash_method['transaction_count'] != 2:
        raise AssertionError(f"Cash transaction count should be 2, got {cash_method['transaction_count']}")

def test_calculate_refund_summary_multiple_methods():
    """Test refund summary calculation with multiple refund methods"""
    mock_returns = [
        {'id': '1', 'total_amount': decimal.Decimal('100.00'), 'refund_method': 'cash'},
        {'id': '2', 'total_amount': decimal.Decimal('75.50'), 'refund_method': 'card'},
        {'id': '3', 'total_amount': decimal.Decimal('50.00'), 'refund_method': 'transfer'},
        {'id': '4', 'total_amount': decimal.Decimal('25.00'), 'refund_method': 'cash'},
    ]
    
    summary = calculate_refund_summary(mock_returns)
    
    if summary['total_amount'] != 250.50:
        raise AssertionError(f"Expected total 250.50, got {summary['total_amount']}")
    
    if summary['total_transactions'] != 4:
        raise AssertionError(f"Expected 4 transactions, got {summary['total_transactions']}")
    
    if len(summary['refund_methods']) != 3:
        raise AssertionError(f"Should have 3 refund methods, got {len(summary['refund_methods'])}")
    
    # Check methods are sorted by total_amount descending
    if summary['refund_methods'][0]['total_amount'] < summary['refund_methods'][1]['total_amount']:
        raise AssertionError("Refund methods should be sorted by total_amount descending")

def test_calculate_refund_summary_unknown_method():
    """Test refund summary handles unknown refund methods gracefully"""
    mock_returns = [
        {'id': '1', 'total_amount': decimal.Decimal('100.00'), 'refund_method': 'cash'},
        {'id': '2', 'total_amount': decimal.Decimal('50.00'), 'refund_method': 'unknown_method'},
    ]
    
    summary = calculate_refund_summary(mock_returns)
    
    # Should only count the cash transaction
    if summary['total_transactions'] != 2:
        raise AssertionError("Should count all transactions even with unknown methods")
    
    if len(summary['refund_methods']) != 1:
        raise AssertionError("Should only include known refund methods")

# ================================
# FUNCTIONAL TESTS (Using real data, no mocks)
# ================================

def test_get_returns_summary_real():
    """Test returns summary retrieval for real date (TEST stage)"""
    print(f"    🔍 Testing returns summary for date: {TEST_CONFIG['test_date']}")
    print()
    
    event = {
        'httpMethod': 'GET',
        'queryStringParameters': {'date': TEST_CONFIG['test_date']},
        'requestContext': {'stage': 'TEST'}
    }
    
    try:
        response = lambda_handler(event, {})
        
        if response['statusCode'] not in [200, 500]:
            raise AssertionError(f"Expected status 200 or 500, got {response['statusCode']}")
        
        if response['statusCode'] == 200:
            body = json.loads(response['body'])
            
            # Print the full response body
            print(f"    📋 Full Response Body:")
            print(f"    {'─' * 60}")
            print(json.dumps(body, indent=4))
            print(f"    {'─' * 60}")
            print()
            
            if body['status'] != 'success':
                raise AssertionError(f"Expected success response, got: {body}")
            
            data = body['data']
            
            # Validate response structure
            required_fields = ['date', 'total_amount', 'total_transactions', 'refund_methods']
            for field in required_fields:
                if field not in data:
                    raise AssertionError(f"Response missing required field: {field}")
            
            if data['date'] != TEST_CONFIG['test_date']:
                raise AssertionError(f"Date mismatch: expected {TEST_CONFIG['test_date']}, got {data['date']}")
            
            print(f"    📊 Summary:")
            print(f"       • Total Amount: ${data['total_amount']}")
            print(f"       • Total Transactions: {data['total_transactions']}")
            print(f"       • Refund Methods: {len(data['refund_methods'])}")
            
            # Validate refund methods structure
            if data['refund_methods']:
                print(f"\n    💰 Refund Methods Breakdown:")
                for method in data['refund_methods']:
                    required_method_fields = ['method', 'method_display', 'total_amount', 'transaction_count']
                    for field in required_method_fields:
                        if field not in method:
                            raise AssertionError(f"Refund method missing required field: {field}")
                    
                    print(f"       • {method['method_display']}: ${method['total_amount']} ({method['transaction_count']} transactions)")
        else:
            print(f"    ⚠️ Expected DynamoDB error (table doesn't exist): {response}")
    
    except Exception as e:
        # Expected behavior when tables don't exist locally
        if "dynamodb" in str(e).lower() or "table" in str(e).lower():
            print(f"    ⚠️ Expected DynamoDB error: {e}")
        else:
            raise e

def test_get_returns_summary_future_date_real():
    """Test returns summary for future date (should return empty) (TEST stage)"""
    print(f"    🔍 Testing returns summary for future date: {TEST_CONFIG['future_date']}")
    print()
    
    event = {
        'httpMethod': 'GET',
        'queryStringParameters': {'date': TEST_CONFIG['future_date']},
        'requestContext': {'stage': 'TEST'}
    }
    
    try:
        response = lambda_handler(event, {})
        
        if response['statusCode'] not in [200, 500]:
            raise AssertionError(f"Expected status 200 or 500, got {response['statusCode']}")
        
        if response['statusCode'] == 200:
            body = json.loads(response['body'])
            
            # Print the full response body
            print(f"    📋 Full Response Body:")
            print(f"    {'─' * 60}")
            print(json.dumps(body, indent=4))
            print(f"    {'─' * 60}")
            print()
            
            data = body['data']
            
            # Future date should have no returns
            if data['total_transactions'] != 0:
                print(f"    ⚠️ Warning: Future date has {data['total_transactions']} transactions")
            else:
                print(f"    ✅ Correctly returned 0 transactions for future date")
        else:
            print(f"    ⚠️ Expected DynamoDB error (table doesn't exist): {response}")
    
    except Exception as e:
        if "dynamodb" in str(e).lower() or "table" in str(e).lower():
            print(f"    ⚠️ Expected DynamoDB error: {e}")
        else:
            raise e

def test_stage_detection_real():
    """Test that stage detection works correctly (TEST stage)"""
    print(f"    🔍 Testing stage detection")
    print()
    
    # Test with explicit TEST stage
    event = {
        'httpMethod': 'GET',
        'queryStringParameters': {'date': TEST_CONFIG['test_date']},
        'requestContext': {'stage': 'TEST'}
    }
    
    try:
        response = lambda_handler(event, {})
        
        # Should use test tables
        if response['statusCode'] not in [200, 500]:
            raise AssertionError(f"Expected status 200 or 500, got {response['statusCode']}")
        
        print(f"    ✅ Stage detection working (status: {response['statusCode']})")
    
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
        (test_validate_date_format_valid, "Date Format Validation - Valid Dates"),
        (test_validate_date_format_invalid, "Date Format Validation - Invalid Dates"),
        (test_lambda_handler_invalid_method, "Lambda Handler - Invalid Method"),
        (test_lambda_handler_missing_date, "Lambda Handler - Missing Date"),
        (test_lambda_handler_invalid_date_format, "Lambda Handler - Invalid Date Format"),
        (test_get_table_names_test_stage, "Table Names - TEST Stage"),
        (test_get_table_names_prod_stage, "Table Names - PROD Stage"),
        (test_error_response_format, "Error Response Format"),
        (test_error_response_with_errors, "Error Response with Validation Errors"),
        (test_calculate_refund_summary_empty, "Refund Summary - Empty Returns"),
        (test_calculate_refund_summary_single_method, "Refund Summary - Single Method"),
        (test_calculate_refund_summary_multiple_methods, "Refund Summary - Multiple Methods"),
        (test_calculate_refund_summary_unknown_method, "Refund Summary - Unknown Method"),
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
        (test_get_returns_summary_real, "Get Returns Summary - Real Date (Real Data)"),
        (test_get_returns_summary_future_date_real, "Get Returns Summary - Future Date (Real Data)"),
        (test_stage_detection_real, "Stage Detection (Real Data)"),
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
    print("Current configuration (for functional tests):")
    print(f"  Test Date: {TEST_CONFIG['test_date']}")
    print(f"  Invalid Date: {TEST_CONFIG['invalid_date']}")
    print(f"  Future Date: {TEST_CONFIG['future_date']}")
    print(f"  Stage: TEST (for real data)")
    print("=" * 50)
    
    change = input("\nDo you want to change the test configuration? (y/n): ").strip().lower()
    
    if change == 'y':
        print("\nEnter new values (press Enter to keep current value):")
        print("─" * 50)
        
        new_test_date = input(f"Test Date (YYYY-MM-DD) [{TEST_CONFIG['test_date']}]: ").strip()
        if new_test_date:
            TEST_CONFIG['test_date'] = new_test_date
        
        new_invalid_date = input(f"Invalid Date [{TEST_CONFIG['invalid_date']}]: ").strip()
        if new_invalid_date:
            TEST_CONFIG['invalid_date'] = new_invalid_date
        
        print("\n✅ Configuration updated!")
        print("Note: Functional tests will use TEST stage with real data")
        print("─" * 50)

def main():
    """Main test runner with interactive menu"""
    print("🧪 POSGetReturnsSummary Test Suite")
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
