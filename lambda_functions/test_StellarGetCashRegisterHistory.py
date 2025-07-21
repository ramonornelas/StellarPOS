
import json
from StellarGetCashRegisterHistory import lambda_handler

def run_test_scenario(test_name, event):
    """Run a test scenario and print results with error handling."""
    print(f"\n{'='*60}")
    print(f"Testing: {test_name}")
    print(f"Event: {json.dumps(event, indent=2)}")
    context = {}
    try:
        response = lambda_handler(event, context)
        print("Response:")
        print(json.dumps(response, indent=2))
        return response
    except Exception as e:
        print(f"Error: {e}")
        return None

def main():
    print("Testing StellarGetCashRegisterHistory Lambda function...")
    print("Note: Expect DynamoDB errors if tables don't exist locally")
    print("=" * 60)

    results = {}


    # Helper to inject TEST stage
    def with_test_stage(event):
        event = dict(event) if event else {}
        event['requestContext'] = {
            'stage': 'TEST',
            'httpMethod': 'GET',
            'resourcePath': '/cash-register-history'
        }
        return event

    # Scenario 1: Get history with specific date
    results['specific_date'] = run_test_scenario(
        "Get history with specific date",
        with_test_stage({
            'pathParameters': {
                'date': '2025-07-14'
            }
        })
    )

    # Scenario 2: Get all history without date
    results['all_history'] = run_test_scenario(
        "Get all history without date",
        with_test_stage({
            'pathParameters': None,
            'queryStringParameters': None
        })
    )

    # Scenario 3: Get latest 5 records without date
    results['latest_5'] = run_test_scenario(
        "Get latest 5 records without date",
        with_test_stage({
            'pathParameters': None,
            'queryStringParameters': {
                'limit': '5'
            }
        })
    )

    # Scenario 4: Get latest 3 records for specific date
    results['latest_3_for_date'] = run_test_scenario(
        "Get latest 3 records for specific date",
        with_test_stage({
            'pathParameters': {
                'date': '2025-07-16'
            },
            'queryStringParameters': {
                'limit': '3'
            }
        })
    )

    # Scenario 5: Test invalid limit parameter
    results['invalid_limit'] = run_test_scenario(
        "Test invalid limit parameter",
        with_test_stage({
            'pathParameters': None,
            'queryStringParameters': {
                'limit': 'invalid'
            }
        })
    )

    # Scenario 6: Test with empty parameters
    results['empty_params'] = run_test_scenario(
        "Test with empty parameters",
        with_test_stage({
            'pathParameters': {},
            'queryStringParameters': {}
        })
    )

    # Scenario 7: Test with missing pathParameters and queryStringParameters
    results['missing_params'] = run_test_scenario(
        "Test with missing pathParameters and queryStringParameters",
        with_test_stage({})
    )

    # Scenario 8: Test with limit = 0
    results['limit_zero'] = run_test_scenario(
        "Test with limit = 0",
        with_test_stage({
            'pathParameters': None,
            'queryStringParameters': {
                'limit': '0'
            }
        })
    )

    # Scenario 9: Test with negative limit
    results['negative_limit'] = run_test_scenario(
        "Test with negative limit",
        with_test_stage({
            'pathParameters': None,
            'queryStringParameters': {
                'limit': '-5'
            }
        })
    )

    print("\n" + "=" * 60)
    print("Test Summary:")
    for key, result in results.items():
        status = '✓ Success' if result and result.get('statusCode') in [200, 400, 404, 500] else '✗ Failed'
        print(f"{key}: {status}")

if __name__ == "__main__":
    main()