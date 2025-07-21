import json
from StellarOpenCashRegister import lambda_handler

def with_test_stage(event):
    event = dict(event) if event else {}
    event['requestContext'] = {
        'stage': 'TEST',
        'httpMethod': 'POST',
        'resourcePath': '/open-cash-register'
    }
    return event

# Mock event and context for cash register closeout creation
event = {
    'body': json.dumps({
        'opening_amount': 1500,
        'opened_at': '2025-01-01T08:00:00Z',
        'status': 'open',
        'opened_user_id': 'user123',
        'date': '2025-01-01',
        'notes': 'Apertura de caja de prueba'
    })
}

context = {}

# Call the lambda_handler function with TEST stage
response = lambda_handler(with_test_stage(event), context)

# Print the response
print(json.dumps(response, indent=4))