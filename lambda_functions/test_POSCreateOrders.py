import json
from POSCreateOrders import lambda_handler

# Mock event and context
event = {
  'body': json.dumps({
    'date': '2025-07-11',
    'ticket': '#009',
    'subtotal': 12,
    'payment_method': 'cash',
    'products': [
      {
        'category_id': 'ed501409-b604-4f1c-9b13-32c4bc1f4698',
        'cost': '0',
        'product_name': 'Paleta',
        'category_name': 'Derivados de miel',
        'display_order': 1,
        'expiration': '',
        'price': 6,
        'description': '',
        'id': 'b26083e1-c89c-488b-bbed-6e087cac460d',
        'product_id': 'b26083e1-c89c-488b-bbed-6e087cac460d',
        'name': 'Paleta propoleo',
        'product_variant_id': '026e713d-814c-49fa-a387-6502d9a3849b',
        'image_url': '',
        'is_combo': False,
        'is_active': True,
        'quantity': 1
      },
      {
        'category_id': 'ed501409-b604-4f1c-9b13-32c4bc1f4698',
        'cost': '0',
        'product_name': 'Paleta',
        'category_name': 'Derivados de miel',
        'display_order': 4,
        'expiration': '',
        'price': 6,
        'description': '',
        'id': 'b26083e1-c89c-488b-bbed-6e087cac460d',
        'product_id': 'b26083e1-c89c-488b-bbed-6e087cac460d',
        'name': 'Paleta miel con chía',
        'product_variant_id': 'aaba2ff3-83b6-4b56-a69a-9d1aa8183db1',
        'image_url': '',
        'is_combo': False,
        'is_active': True,
        'quantity': 1
      }
    ],
    'split_payments': [
      {
        'id': 1,
        'amount': 12,
        'payment_method': 'cash'
      }
    ],
    'discount': 0,
    'tip': 0,
    'received_amount': 12,
    'change': 0,
    'notes': '',
    'cash_register_id': '45de088e-561e-436f-bedb-944f94abeb55'
  })
}

context = {}

# Call the lambda_handler function
response = lambda_handler(event, context)

# Print the response
print(json.dumps(response, indent=4))