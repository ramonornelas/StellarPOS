import json
from StellarGetOpenCashRegister import lambda_handler

# Mock event and context (no parameters required to get the open cash register)
event = {}

context = {}

# Call the lambda_handler function
response = lambda_handler(event, context)

# Print the response
print(json.dumps(response, indent=4))