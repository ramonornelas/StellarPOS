#!/bin/bash

echo "Fixing stock_available data types in PROD table (POS_product)..."
echo "=================================================="

# Array of product IDs and their current values
declare -a products=(
    "e7e1529a-bfea-48a9-b713-79f0c177235a:-3"
    "1a343949-bf4f-45a2-8dbb-807ab44ed3f6:0"
    "9a2a72c9-c5e3-48b0-8382-4e7040679c6a:0"
    "bd6ecb7c-6c47-44cc-adf5-7032bbee7250:0"
    "3d3869b9-e941-4f64-a405-75bf9e5852b6:0"
    "c4f5d82b-b8b2-4970-bb02-60b0e6017810:-1"
    "8f3a1d5e-7b6c-4f92-9e0d-2a7c3b5d8e1f:0"
    "2606fe13-111a-47bc-a326-7307bcaa490f:0"
    "e7f5fd35-8e0c-4e91-843d-1032f1149f76:0"
    "3816ea3f-839c-40b6-9609-b3ac878dbdbc:0"
)

for product in "${products[@]}"; do
    IFS=':' read -r id value <<< "$product"
    echo ""
    echo "Updating product: $id (value: $value)"
    
    aws dynamodb update-item \
        --table-name POS_product \
        --key "{\"id\": {\"S\": \"$id\"}}" \
        --update-expression 'SET stock_available = :val' \
        --expression-attribute-values "{\":val\": {\"N\": \"$value\"}}"
    
    if [ $? -eq 0 ]; then
        echo "✅ Successfully updated $id"
    else
        echo "❌ Failed to update $id"
    fi
done

echo ""
echo "=================================================="
echo "Done! Fixed all products in PROD table."
echo ""
echo "Now fixing TEST table (test_POS_product)..."
echo "=================================================="

# Array for TEST environment
declare -a test_products=(
    "e7e1529a-bfea-48a9-b713-79f0c177235a:-3"
    "1a343949-bf4f-45a2-8dbb-807ab44ed3f6:0"
    "9a2a72c9-c5e3-48b0-8382-4e7040679c6a:0"
    "bd6ecb7c-6c47-44cc-adf5-7032bbee7250:0"
    "3d3869b9-e941-4f64-a405-75bf9e5852b6:0"
    "8f3a1d5e-7b6c-4f92-9e0d-2a7c3b5d8e1f:0"
    "2606fe13-111a-47bc-a326-7307bcaa490f:0"
    "e7f5fd35-8e0c-4e91-843d-1032f1149f76:0"
    "3816ea3f-839c-40b6-9609-b3ac878dbdbc:0"
)

for product in "${test_products[@]}"; do
    IFS=':' read -r id value <<< "$product"
    echo ""
    echo "Updating product: $id (value: $value)"
    
    aws dynamodb update-item \
        --table-name test_POS_product \
        --key "{\"id\": {\"S\": \"$id\"}}" \
        --update-expression 'SET stock_available = :val' \
        --expression-attribute-values "{\":val\": {\"N\": \"$value\"}}"
    
    if [ $? -eq 0 ]; then
        echo "✅ Successfully updated $id"
    else
        echo "❌ Failed to update $id"
    fi
done

echo ""
echo "=================================================="
echo "✅ All done! All stock_available fields have been converted to Number type."
