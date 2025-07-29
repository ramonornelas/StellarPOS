#!/bin/bash

# API Gateway Stage Management Script
API_ID="your-api-gateway-id"
LAMBDA_FUNCTION="POSCreateOrders"

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
NC='\033[0m'

# Function to get current integration configuration
backup_integration() {
    local resource_id=$1
    local http_method=$2
    local stage=$3
    
    echo -e "${BLUE}Backing up integration for $stage...${NC}"
    
    aws apigateway get-integration \
        --rest-api-id $API_ID \
        --resource-id $resource_id \
        --http-method $http_method > "backup_${stage}_${resource_id}_${http_method}.json"
    
    echo -e "${GREEN}✓ Backup saved to backup_${stage}_${resource_id}_${http_method}.json${NC}"
}

# Function to update integration for specific stage
update_integration_for_stage() {
    local resource_id=$1
    local http_method=$2
    local stage=$3
    local lambda_alias=$4
    
    echo -e "${BLUE}Updating integration for $stage stage...${NC}"
    
    local lambda_arn="arn:aws:lambda:us-west-1:$(aws sts get-caller-identity --query Account --output text):function:${LAMBDA_FUNCTION}:${lambda_alias}"
    local integration_uri="arn:aws:apigateway:us-west-1:lambda:path/2015-03-31/functions/${lambda_arn}/invocations"
    
    aws apigateway put-integration \
        --rest-api-id $API_ID \
        --resource-id $resource_id \
        --http-method $http_method \
        --type AWS_PROXY \
        --integration-http-method POST \
        --uri "$integration_uri"
    
    if [ $? -eq 0 ]; then
        echo -e "${GREEN}✓ Integration updated for $stage${NC}"
        
        # Deploy to stage
        aws apigateway create-deployment \
            --rest-api-id $API_ID \
            --stage-name $stage \
            --description "Updated integration for $stage - $(date)"
        
        echo -e "${GREEN}✓ Deployed to $stage stage${NC}"
    else
        echo -e "${RED}✗ Failed to update integration for $stage${NC}"
    fi
}

# Function to setup stage variables (recommended approach)
setup_stage_variables() {
    echo -e "${YELLOW}Setting up stage variables (recommended)...${NC}"
    
    # Set TEST stage variable
    aws apigateway put-stage \
        --rest-api-id $API_ID \
        --stage-name TEST \
        --patch-ops op=replace,path=/variables/lambdaAlias,value=TEST
    
    # Set PROD stage variable
    aws apigateway put-stage \
        --rest-api-id $API_ID \
        --stage-name '$default' \
        --patch-ops op=replace,path=/variables/lambdaAlias,value=PROD
    
    echo -e "${GREEN}✓ Stage variables configured${NC}"
    echo -e "${YELLOW}Now update your integration to use: \${stageVariables.lambdaAlias}${NC}"
}

# Function to get all resources
list_resources() {
    echo -e "${BLUE}Available resources:${NC}"
    aws apigateway get-resources --rest-api-id $API_ID --query 'items[*].[id,pathPart,resourceMethods]' --output table
}

# Function to show current stage configuration
show_stage_config() {
    local stage=$1
    echo -e "${BLUE}Current configuration for $stage stage:${NC}"
    aws apigateway get-stage --rest-api-id $API_ID --stage-name $stage --query '[stageName,variables,methodSettings]' --output table
}

# Main menu
case $1 in
    "backup")
        if [ -z "$2" ] || [ -z "$3" ] || [ -z "$4" ]; then
            echo "Usage: $0 backup <resource-id> <http-method> <stage>"
            echo "Example: $0 backup abc123 POST TEST"
            exit 1
        fi
        backup_integration $2 $3 $4
        ;;
        
    "update")
        if [ -z "$2" ] || [ -z "$3" ] || [ -z "$4" ] || [ -z "$5" ]; then
            echo "Usage: $0 update <resource-id> <http-method> <stage> <lambda-alias>"
            echo "Example: $0 update abc123 POST TEST TEST"
            exit 1
        fi
        update_integration_for_stage $2 $3 $4 $5
        ;;
        
    "setup-variables")
        setup_stage_variables
        ;;
        
    "list")
        list_resources
        ;;
        
    "show")
        if [ -z "$2" ]; then
            echo "Usage: $0 show <stage>"
            echo "Example: $0 show TEST"
            exit 1
        fi
        show_stage_config $2
        ;;
        
    *)
        echo "API Gateway Stage Management"
        echo ""
        echo "Usage: $0 {backup|update|setup-variables|list|show}"
        echo ""
        echo "Commands:"
        echo "  backup <resource-id> <method> <stage>     - Backup integration config"
        echo "  update <resource-id> <method> <stage> <alias> - Update integration for stage"
        echo "  setup-variables                          - Setup stage variables (recommended)"
        echo "  list                                     - List all resources"
        echo "  show <stage>                            - Show stage configuration"
        echo ""
        echo "Examples:"
        echo "  $0 setup-variables                      # Setup stage variables"
        echo "  $0 list                                 # List resources to get IDs"
        echo "  $0 show TEST                           # Show TEST stage config"
        echo "  $0 backup abc123 POST TEST             # Backup before changes"
        echo "  $0 update abc123 POST TEST TEST        # Update TEST to use TEST alias"
        exit 1
        ;;
esac
