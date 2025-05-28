import json
from StellarCloseCashRegister import lambda_handler

# Mock event and context for cash register closeout (cierre de caja)
event = {
    'body': json.dumps({
        'id': '50b01460-4241-4ca6-b004-bfc291571081',
        'closing_amount': 2000,
        'closed_at': '2025-01-01T20:00:00Z',
        'status': 'closed',
        'closed_user_id': 'user123',
        'notes': 'Cierre de caja de prueba',
        'cash_sales': 500,
    })
}

context = {}

# Call the lambda_handler function
response = lambda_handler(event, context)

# Print the response
print(json.dumps(response, indent=4))