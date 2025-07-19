#!/bin/bash

# Script to manage Lambda environment variables
FUNCTION_NAME="POSCreateOrders"
ENV_FILE="environment.json"

case $1 in
    "set")
        echo "Setting environment variables for $FUNCTION_NAME..."
        aws lambda update-function-configuration \
            --function-name $FUNCTION_NAME \
            --environment file://$ENV_FILE
        
        if [ $? -eq 0 ]; then
            echo "✅ Environment variables updated successfully"
        else
            echo "❌ Failed to update environment variables"
            exit 1
        fi
        ;;
        
    "get")
        echo "Current environment variables for $FUNCTION_NAME:"
        aws lambda get-function-configuration \
            --function-name $FUNCTION_NAME \
            --query 'Environment.Variables' \
            --output table
        ;;
        
    "clear")
        echo "Clearing all environment variables for $FUNCTION_NAME..."
        aws lambda update-function-configuration \
            --function-name $FUNCTION_NAME \
            --environment Variables='{}'
        
        if [ $? -eq 0 ]; then
            echo "✅ Environment variables cleared"
        else
            echo "❌ Failed to clear environment variables"
            exit 1
        fi
        ;;
        
    *)
        echo "Usage: $0 {set|get|clear}"
        echo ""
        echo "  set   - Apply environment variables from $ENV_FILE"
        echo "  get   - Display current environment variables"
        echo "  clear - Remove all environment variables"
        exit 1
        ;;
esac
