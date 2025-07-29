import json
from StellarCloseCashRegister import lambda_handler

def with_test_stage(event):
    event = dict(event) if event else {}
    event['requestContext'] = {
        'stage': 'TEST',
        'httpMethod': 'POST',
        'resourcePath': '/close-cash-register'
    }
    return event

# Mock event and context for cash register closeout (cierre de caja)
event = {
    'body': json.dumps({
        'id': '42098aea-e91e-4808-b6e7-5f9b3356bfa5',
        'closing_amount': 2000,
        'closed_at': '2025-01-01T20:00:00Z',
        'status': 'closed',
        'closed_user_id': 'user123',
        'notes': 'Cierre de caja de prueba',
        'cash_sales': 500,
    })
}

context = {}

# Call the lambda_handler function with TEST stage
response = lambda_handler(with_test_stage(event), context)

# Print the response
print(json.dumps(response, indent=4))