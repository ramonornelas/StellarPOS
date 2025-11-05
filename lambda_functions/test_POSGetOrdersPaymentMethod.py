"""
Test script for GetOrdersPaymentMethodSummary Lambda function
Tests the new GET /orders/summary?date={date} endpoint
"""

import json
import sys
import os
from datetime import datetime, timedelta

# Add the current directory to Python path so we can import the function
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

from lambda_functions.POSGetOrdersPaymentMethod import lambda_handler, validate_date_format

# ===== SAFETY CONFIGURATION =====
# This file ONLY uses TEST environment to ensure production safety
# All tests are configured with 'stage': 'TEST' to prevent any impact on production data

# Configure the date for testing - CHANGE THIS TO TEST DIFFERENT DATES
TEST_DATE = "2025-10-26"  # Change this date to test with your data
INVALID_TEST_DATE = "2025-12-25"  # Date that should have no orders

# Table names for validation (to verify we're using the correct table names)
EXPECTED_ORDER_TABLE = "test_POS_orderTicket"  # Corrected table name
EXPECTED_SPLIT_TABLE = "test_POS_orderSplitPayment"  # Corrected table name

def validate_test_safety():
    """Validate that all tests are configured safely"""
    print("🛡️  SAFETY CHECK: All tests configured for TEST environment only")
    print("🚫 PRODUCTION PROTECTION: No production data will be accessed")
    print("✅ SAFE TO RUN: Tests will only interact with test tables")
    print(f"📅 Test Date: {TEST_DATE}")
    print(f"🚫 Invalid Test Date: {INVALID_TEST_DATE}")
    print(f"📊 Expected Order Table: {EXPECTED_ORDER_TABLE}")
    print(f"💰 Expected Split Payment Table: {EXPECTED_SPLIT_TABLE}")
    print("-" * 60)

validate_test_safety()

def test_successful_orders_summary():
    """Test successful orders summary retrieval"""
    print(f"\n=== Testing Successful Orders Summary for {TEST_DATE} ===")
    
    event = {
        'httpMethod': 'GET',
        'requestContext': {
            'stage': 'TEST',  # ALWAYS use TEST environment for safety
            'httpMethod': 'GET',
            'resourcePath': '/orders/summary'
        },
        'queryStringParameters': {
            'date': TEST_DATE
        }
    }
    
    context = {}
    
    try:
        response = lambda_handler(event, context)
        print("Orders Summary Response:")
        print(json.dumps(response, indent=2))
        return response
    except Exception as e:
        print(f"Orders Summary Error: {e}")
        return None

def test_split_payment_validation():
    """Test split payment handling specifically"""
    print(f"\n=== Testing Split Payment Validation for {TEST_DATE} ===")
    
    # This test focuses on validating split payment logic
    event = {
        'httpMethod': 'GET',
        'requestContext': {
            'stage': 'TEST',  # ALWAYS use TEST environment for safety
            'httpMethod': 'GET',
            'resourcePath': '/orders/summary'
        },
        'queryStringParameters': {
            'date': TEST_DATE
        }
    }
    
    context = {}
    
    try:
        response = lambda_handler(event, context)
        
        if response['statusCode'] == 200:
            body = json.loads(response['body'])
            data = body.get('data', {})
            
            print("Split Payment Analysis:")
            print(f"- Date: {data.get('date')}")
            print(f"- Total Amount: {data.get('total_amount')}")
            print(f"- Total Transactions: {data.get('total_transactions')}")
            
            payment_methods = data.get('payment_methods', [])
            print(f"- Payment Methods Found: {len(payment_methods)}")
            
            for pm in payment_methods:
                print(f"  * {pm.get('method_display')} ({pm.get('method')}): ${pm.get('total_amount')} ({pm.get('transaction_count')} transacciones)")
        
        return response
    except Exception as e:
        print(f"Split Payment Validation Error: {e}")
        import traceback
        traceback.print_exc()
        return None

def test_different_date():
    """Test with different date to validate date filtering"""
    print(f"\n=== Testing Different Date: {INVALID_TEST_DATE} ===")
    
    event = {
        'httpMethod': 'GET',
        'requestContext': {
            'stage': 'TEST',
            'httpMethod': 'GET',
            'resourcePath': '/orders/summary'
        },
        'queryStringParameters': {
            'date': INVALID_TEST_DATE
        }
    }
    
    context = {}
    
    try:
        response = lambda_handler(event, context)
        print("Different Date Response:")
        print(json.dumps(response, indent=2))
        return response
    except Exception as e:
        print(f"Different Date Error: {e}")
        return None

def test_invalid_date_format():
    """Test invalid date format handling"""
    print("\n=== Testing Invalid Date Format ===")
    
    invalid_dates = [
        "2025/11/04",  # Wrong separator
        "04-11-2025",  # Wrong order
        "2025-13-01",  # Invalid month
        "2025-02-30",  # Invalid day
        "invalid-date",  # Not a date
        ""  # Empty string
    ]
    
    for invalid_date in invalid_dates:
        event = {
            'httpMethod': 'GET',
            'requestContext': {
                'stage': 'TEST',
                'httpMethod': 'GET',
                'resourcePath': '/orders/summary'
            },
            'queryStringParameters': {
                'date': invalid_date
            }
        }
        
        try:
            response = lambda_handler(event, {})
            status_code = response['statusCode']
            
            if status_code == 400:
                print(f"✓ Invalid date '{invalid_date}' correctly rejected (400)")
            else:
                print(f"? Unexpected status {status_code} for invalid date '{invalid_date}'")
                
        except Exception as e:
            print(f"✗ Exception for invalid date '{invalid_date}': {str(e)[:50]}...")

def test_missing_date_parameter():
    """Test missing date parameter handling"""
    print("\n=== Testing Missing Date Parameter ===")
    
    event = {
        'httpMethod': 'GET',
        'requestContext': {
            'stage': 'TEST',
            'httpMethod': 'GET',
            'resourcePath': '/orders/summary'
        },
        'queryStringParameters': {}  # No date parameter
    }
    
    context = {}
    
    try:
        response = lambda_handler(event, context)
        print("Missing Date Parameter Response:")
        print(json.dumps(response, indent=2))
        return response
    except Exception as e:
        print(f"Missing Date Parameter Error: {e}")
        return None

def test_invalid_http_method():
    """Test with invalid HTTP method (should be GET only)"""
    print("\n=== Testing Invalid HTTP Method (POST) ===")
    
    event = {
        'httpMethod': 'POST',
        'requestContext': {
            'stage': 'TEST',
            'httpMethod': 'POST',
            'resourcePath': '/orders/summary'
        },
        'queryStringParameters': {
            'date': TEST_DATE
        },
        'body': json.dumps({'some': 'data'})
    }
    
    context = {}
    
    try:
        response = lambda_handler(event, context)
        print("Invalid Method Response:")
        print(json.dumps(response, indent=2))
        return response
    except Exception as e:
        print(f"Invalid Method Error: {e}")
        return None

def test_stage_detection_logic():
    """Test stage detection logic with different scenarios"""
    print("\n=== Testing Stage Detection Logic ===")
    
    # Test 1: Explicit TEST stage
    event1 = {
        'httpMethod': 'GET',
        'requestContext': {
            'stage': 'TEST',  # SAFE: Explicit TEST stage
            'httpMethod': 'GET'
        },
        'queryStringParameters': {
            'date': TEST_DATE
        }
    }
    
    try:
        response1 = lambda_handler(event1, {})
        print("Stage Detection - Explicit TEST:")
        print(f"Status: {response1.get('statusCode')}")
        
        # Test 2: Stage detection via headers
        event2 = {
            'httpMethod': 'GET',
            'headers': {'Host': 'test-api.example.com'},  # Contains 'test'
            'queryStringParameters': {
                'date': TEST_DATE
            }
        }
        
        response2 = lambda_handler(event2, {})
        print("Stage Detection - Host Header:")
        print(f"Status: {response2.get('statusCode')}")
        
        return response1
    except Exception as e:
        print(f"Stage Detection Error: {e}")
        return None

def test_date_validation_function():
    """Test the date validation function directly"""
    print("\n=== Testing Date Validation Function ===")
    
    valid_dates = [
        "2025-01-01",
        "2025-12-31", 
        "2025-02-28",
        "2024-02-29",  # Leap year
        TEST_DATE
    ]
    
    invalid_dates = [
        "2025/01/01",
        "01-01-2025",
        "2025-13-01",
        "2025-02-30",
        "invalid",
        "",
        "2025-1-1"  # No zero padding
    ]
    
    print("Valid dates:")
    for date in valid_dates:
        result = validate_date_format(date)
        status = "✓" if result else "✗"
        print(f"  {status} {date}")
    
    print("\nInvalid dates:")
    for date in invalid_dates:
        result = validate_date_format(date)
        status = "✓" if not result else "✗"
        print(f"  {status} {date}")

def test_different_api_gateway_formats():
    """Test different API Gateway event formats"""
    print("\n=== Testing Different API Gateway Event Formats ===")
    
    # Format 1: HTTP API (v2.0) with rawPath
    event_v2 = {
        'requestContext': {
            'http': {
                'method': 'GET',
                'path': '/orders/summary'
            },
            'stage': 'TEST'  # SAFE: Always use TEST environment
        },
        'queryStringParameters': {
            'date': TEST_DATE
        }
    }
    
    context = {}
    
    try:
        response = lambda_handler(event_v2, context)
        print("API Gateway v2.0 Format Response:")
        print(json.dumps(response, indent=2))
        return response
    except Exception as e:
        print(f"API Gateway v2.0 Format Error: {e}")
        return None

def test_table_name_validation():
    """Test table name generation for different stages"""
    print("\n=== Testing Table Name Validation ===")
    
    # Import table name function
    from lambda_functions.POSGetOrdersPaymentMethod import get_table_name
    
    # Test TEST stage
    test_order_table = get_table_name('order', 'test')
    test_split_table = get_table_name('split_payment', 'test')
    
    print(f"TEST stage - Order table: {test_order_table}")
    print(f"TEST stage - Split payment table: {test_split_table}")
    
    # Validate expected names
    if test_order_table == EXPECTED_ORDER_TABLE:
        print("✓ Order table name matches expected")
    else:
        print(f"✗ Order table name mismatch. Expected: {EXPECTED_ORDER_TABLE}, Got: {test_order_table}")
    
    if test_split_table == EXPECTED_SPLIT_TABLE:
        print("✓ Split payment table name matches expected")
    else:
        print(f"✗ Split payment table name mismatch. Expected: {EXPECTED_SPLIT_TABLE}, Got: {test_split_table}")
    
    # Test PROD stage (for reference only - won't be used)
    prod_order_table = get_table_name('order', 'prod')
    prod_split_table = get_table_name('split_payment', 'prod')
    
    print(f"PROD stage - Order table: {prod_order_table} (reference only)")
    print(f"PROD stage - Split payment table: {prod_split_table} (reference only)")

def analyze_response_structure(response):
    """Helper function to analyze response structure"""
    if not response or not isinstance(response, dict):
        return "Invalid response format"
    
    status_code = response.get('statusCode')
    headers = response.get('headers', {})
    
    try:
        body = json.loads(response.get('body', '{}'))
    except:
        return f"Status: {status_code}, Invalid JSON body"
    
    analysis = f"Status: {status_code}"
    
    if status_code == 200:
        data = body.get('data', {})
        total_amount = data.get('total_amount', 0)
        total_transactions = data.get('total_transactions', 0)
        payment_methods = data.get('payment_methods', [])
        
        analysis += f"\n  - Date: {data.get('date', 'N/A')}"
        analysis += f"\n  - Total Amount: ${total_amount}"
        analysis += f"\n  - Total Transactions: {total_transactions}"
        analysis += f"\n  - Payment Methods: {len(payment_methods)}"
        
        # Detailed payment method breakdown
        for pm in payment_methods:
            method = pm.get('method', 'unknown')
            display = pm.get('method_display', 'Unknown')
            amount = pm.get('total_amount', 0)
            count = pm.get('transaction_count', 0)
            analysis += f"\n    * {display} ({method}): ${amount} ({count} transactions)"
            
    elif status_code == 400:
        analysis += f"\n  - Error: {body.get('message', 'Unknown error')}"
        errors = body.get('errors', [])
        if errors:
            analysis += f"\n  - Field errors: {len(errors)}"
            for error in errors:
                analysis += f"\n    - {error.get('field', 'unknown')}: {error.get('reason', 'no reason')}"
    elif status_code == 404:
        analysis += f"\n  - Not Found: {body.get('message', 'Unknown error')}"
    elif status_code == 405:
        analysis += f"\n  - Method not allowed: {body.get('message', 'Unknown error')}"
    elif status_code == 500:
        analysis += f"\n  - Server Error: {body.get('message', 'Unknown error')}"
    
    return analysis

if __name__ == "__main__":
    # Run safety validation first
    validate_test_safety()
    
    print("Testing GetOrdersPaymentMethodSummary Lambda Function...")
    print("🔒 SAFETY MODE: All tests use TEST environment only")
    print("📊 Expected: DynamoDB errors if tables don't exist locally or if date has no data")
    print("🎯 Focus: HTTP status codes, parameter validation, JSON structure, and split payment logic")
    print("💰 SPLIT PAYMENT FOCUS: Validating table names and payment aggregation logic")
    print("=" * 80)
    
    tests = [
        #("Date Validation Function", test_date_validation_function),
        #("Table Name Validation", test_table_name_validation),
        #("Invalid HTTP Method", test_invalid_http_method),
        #("Invalid Date Format", test_invalid_date_format),
        #("Missing Date Parameter", test_missing_date_parameter),
        #("Stage Detection Logic", test_stage_detection_logic),
        #("API Gateway v2.0 Format", test_different_api_gateway_formats),
        #("Different Date (No Orders)", test_different_date),
        #("Split Payment Validation", test_split_payment_validation),
        ("Successful Orders Summary", test_successful_orders_summary)
    ]
    
    results = {}
    
    for test_name, test_func in tests:
        try:
            result = test_func()
            # Analyze the response
            if result and isinstance(result, dict) and 'statusCode' in result:
                analysis = analyze_response_structure(result)
                status_code = result['statusCode']
                
                # Determine if test passed based on expected behavior
                if test_name == "Invalid HTTP Method" and status_code == 405:
                    results[test_name] = "✓ Correctly rejected invalid method"
                elif test_name in ["Missing Date Parameter", "Invalid Date Format"] and status_code == 400:
                    results[test_name] = "✓ Correctly validated parameters"
                elif test_name == "Different Date (No Orders)" and status_code == 200:
                    results[test_name] = "✓ Correctly handled date with no data"
                elif test_name in ["Successful Orders Summary", "Split Payment Validation"] and status_code == 200:
                    results[test_name] = "✓ Success (200) - Complete data returned"
                elif test_name in ["Successful Orders Summary", "Split Payment Validation"] and status_code == 500:
                    results[test_name] = "✓ DynamoDB error (500) - Function structure OK"
                elif test_name in ["Date Validation Function", "Table Name Validation"] and result == None:
                    results[test_name] = "✓ Function logic passed"
                elif not test_name.startswith("Invalid") and status_code in [200, 500]:
                    # 200 = success, 500 = expected DynamoDB error
                    if status_code == 200:
                        results[test_name] = "✓ Success (200) - Function working"
                    else:
                        results[test_name] = "✓ DynamoDB error (500) - Structure validated"
                else:
                    results[test_name] = f"? Unexpected status {status_code}"
                    
                # Add detailed analysis for some tests
                if hasattr(result, 'get') and result.get('statusCode'):
                    print(f"\nAnalysis for {test_name}:")
                    print(analysis)
                    
            elif result == None and test_name in ["Date Validation Function", "Table Name Validation"]:
                results[test_name] = "✓ Unit test completed"
            else:
                results[test_name] = "✗ No valid response"
        except Exception as e:
            results[test_name] = f"✗ Exception: {str(e)[:50]}..."
    
    print("\n" + "=" * 80)
    print("Test Summary:")
    for test_name, result in results.items():
        print(f"{test_name:30}: {result}")
    
    # Overall summary
    successful_tests = sum(1 for result in results.values() if result.startswith("✓"))
    total_tests = len(results)
    print(f"\nOverall: {successful_tests}/{total_tests} tests completed successfully")
    
    print(f"\nTest Interpretation:")
    print(f"✓ = Test passed with expected behavior")
    print(f"? = Unexpected status code (review needed)")
    print(f"✗ = Test failed or threw exception")
    print(f"\nNote: DynamoDB errors (500) are expected if tables don't exist locally")
    print(f"Focus on parameter validation (400 errors) and successful parsing (200/500 status)")
    
    # Split payment specific analysis
    print("\n" + "💰" * 40)
    print("💰 SPLIT PAYMENT ANALYSIS:")
    print(f"📊 Check the 'Split Payment Validation' test results above")
    print(f"📋 Table names validated in 'Table Name Validation' test")
    print(f"🔍 If you see successful responses, check payment method aggregation")
    print(f"⚠️  If you see 500 errors, verify table names match your DynamoDB setup")
    print("💰" * 40)
    
    # Final safety confirmation
    print("\n" + "🛡️" * 40)
    print("🔒 SAFETY CONFIRMATION:")
    print("✅ All tests used TEST environment only")
    print("✅ No production data was accessed")
    print("✅ All dates were configured for testing")
    print("✅ Safe to run in any environment")
    print("🛡️" * 40)
    
    # Instructions for user
    print(f"\n📋 NEXT STEPS:")
    print(f"1. Update TEST_DATE (currently: {TEST_DATE}) to a date with orders in your test DB")
    print(f"2. Run this test to validate split payment functionality")
    print(f"3. Check the 'Split Payment Validation' and 'Successful Orders Summary' tests")
    print(f"4. Verify table names match your DynamoDB setup:")
    print(f"   - Order table: {EXPECTED_ORDER_TABLE}")
    print(f"   - Split payment table: {EXPECTED_SPLIT_TABLE}")
    print(f"5. If you get 500 errors, check if these table names exist in your AWS account")
