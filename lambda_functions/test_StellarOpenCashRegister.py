import json
from StellarOpenCashRegister import lambda_handler

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

# Call the lambda_handler function
response = lambda_handler(event, context)

# Print the response
print(json.dumps(response, indent=4))