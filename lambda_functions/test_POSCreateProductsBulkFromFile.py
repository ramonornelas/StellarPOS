import json
import pandas as pd
from POSCreateProductsBulk import lambda_handler

# Read data from Excel file
excel_file_path = '/Users/carlos.ornelas/Documents/Code-projects/React/OrionCore/OrionPOS/bulk/test_bulk.xlsx'
df = pd.read_excel(excel_file_path, sheet_name='products')

# Convert DataFrame to list of dictionaries
products = df.to_dict(orient='records')

# Mock event and context
event = {
    'body': json.dumps(products)
}

context = {}

# Call the lambda_handler function
response = lambda_handler(event, context)

# Print the response
print(json.dumps(response, indent=4))