# Lambda Environment Variables

This file contains the environment variables configuration for the POSCreateOrders Lambda function.

## Usage

### Set Environment Variables
```bash
aws lambda update-function-configuration --function-name POSCreateOrders --environment file://environment.json
```

### Get Current Environment Variables
```bash
aws lambda get-function-configuration --function-name POSCreateOrders --query 'Environment.Variables'
```

## Environment Variables Explained

### Production Tables (used when API Gateway stage = 'prod' or '$default')
- `ORDER_TICKET_TABLE`: Main order records
- `ORDER_PRODUCT_TABLE`: Order line items
- `SPLIT_PAYMENT_TABLE`: Payment method details
- `INVENTORY_MOVEMENT_TABLE`: Inventory tracking
- `POS_PRODUCT_TABLE`: Product catalog

### Test Tables (used when API Gateway stage = 'test')
- `TEST_ORDER_TICKET_TABLE`: Test order records
- `TEST_ORDER_PRODUCT_TABLE`: Test order line items
- `TEST_SPLIT_PAYMENT_TABLE`: Test payment method details
- `TEST_INVENTORY_MOVEMENT_TABLE`: Test inventory tracking
- `TEST_POS_PRODUCT_TABLE`: Test product catalog

## API Gateway Integration

The Lambda function automatically detects the environment based on the API Gateway stage:

- **Production**: `https://your-api-gateway-url/orders` (stage: '$default') → Uses production tables
- **Test**: `https://your-api-gateway-url/TEST/orders` (stage: 'test') → Uses test tables

## Deployment

1. Update this file if table names change
2. Apply changes: `aws lambda update-function-configuration --function-name POSCreateOrders --environment file://environment.json`
3. Deploy new Lambda code if needed
4. Test both environments

## Notes

- Environment variables are set at the function level, not alias level
- The Lambda code detects stage from `event.requestContext.stage`
- Default stage '$default' is treated as 'prod'
- All table names should exist in DynamoDB before deployment
