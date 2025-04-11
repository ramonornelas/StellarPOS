import json
import pandas as pd
from POSCreateCategoriesBulk import lambda_handler
from config import EXCEL_FILE_PATH

# Read data from Excel file
df = pd.read_excel(EXCEL_FILE_PATH, sheet_name='categories')

# Convert DataFrame to list of dictionaries
categories = df.to_dict(orient='records')

# Mock event and context
event = {
    'body': json.dumps(categories)
}

context = {}

# Call the lambda_handler function
response = lambda_handler(event, context)

# Print the response
print(json.dumps(response, indent=4))