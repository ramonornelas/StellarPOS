import json
from POSCreateOrders import lambda_handler

# Mock event and context
event = {
  'body': json.dumps({
    'date': '2025-05-25',
    'ticket': '421',
    'subtotal': 100,
    'discount': 10,
    'tip': 9,
    'received_amount': 150,
    'change': 50,
    'payment_method': 'cash',
    'customer_id': 'cust123',
    'notes': 'Test order',
    'updated_user_id': 'user123',
    'updated_username': 'testuser',
    'cash_register_id': 'register_001',
    'products': [
      {'id': 'prod1', 'name': 'Product 1', 'price': 50, 'category_name': 'Category 1'},
      {'id': 'prod2', 'name': 'Product 2', 'price': 50, 'category_name': 'Category 2'}
    ],
    'split_payments': [
      {'payment_method': 'credit_card', 'amount': 100},
      {'payment_method': 'cash', 'amount': 50}
    ]
  })
}

context = {}

# Call the lambda_handler function
response = lambda_handler(event, context)

# Print the response
print(json.dumps(response, indent=4))