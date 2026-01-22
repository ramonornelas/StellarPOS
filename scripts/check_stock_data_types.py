import boto3
import json

dynamodb_client = boto3.client('dynamodb')

def check_product_table(table_name):
    """
    Scan the product table and check for stock_available data type issues
    """
    print(f"\n{'='*80}")
    print(f"Checking table: {table_name}")
    print(f"{'='*80}\n")
    
    try:
        # Scan the table
        response = dynamodb_client.scan(
            TableName=table_name,
            ProjectionExpression='id, #name, stock_available',
            ExpressionAttributeNames={
                '#name': 'name'  # 'name' might be a reserved word
            }
        )
        
        items = response.get('Items', [])
        total_items = len(items)
        
        # Check for pagination
        while 'LastEvaluatedKey' in response:
            response = dynamodb_client.scan(
                TableName=table_name,
                ProjectionExpression='id, #name, stock_available',
                ExpressionAttributeNames={
                    '#name': 'name'
                },
                ExclusiveStartKey=response['LastEvaluatedKey']
            )
            items.extend(response.get('Items', []))
            total_items = len(items)
        
        print(f"Total items scanned: {total_items}\n")
        
        # Categorize items by stock_available data type
        issues = []
        correct_numeric = []
        missing_stock = []
        
        for item in items:
            product_id = item.get('id', {}).get('S', 'Unknown ID')
            product_name = item.get('name', {}).get('S', 'Unknown Name')
            
            if 'stock_available' not in item:
                missing_stock.append({
                    'id': product_id,
                    'name': product_name,
                    'issue': 'Missing stock_available field'
                })
            elif 'S' in item['stock_available']:
                # String type - this is an issue
                issues.append({
                    'id': product_id,
                    'name': product_name,
                    'value': item['stock_available']['S'],
                    'type': 'String (S)',
                    'issue': 'stock_available is stored as String instead of Number'
                })
            elif 'N' in item['stock_available']:
                # Number type - correct
                correct_numeric.append({
                    'id': product_id,
                    'name': product_name,
                    'value': item['stock_available']['N'],
                    'type': 'Number (N)'
                })
            else:
                # Other type
                issues.append({
                    'id': product_id,
                    'name': product_name,
                    'value': str(item['stock_available']),
                    'type': 'Other',
                    'issue': 'stock_available has unexpected data type'
                })
        
        # Print results
        print(f"✅ Correct (Number type): {len(correct_numeric)} items")
        print(f"❌ Issues (String or other type): {len(issues)} items")
        print(f"⚠️  Missing stock_available: {len(missing_stock)} items")
        
        # Show items with issues
        if issues:
            print(f"\n{'='*80}")
            print("❌ ITEMS WITH DATA TYPE ISSUES:")
            print(f"{'='*80}\n")
            for idx, item in enumerate(issues, 1):
                print(f"{idx}. Product ID: {item['id']}")
                print(f"   Name: {item['name']}")
                print(f"   Current Value: {item['value']}")
                print(f"   Current Type: {item['type']}")
                print(f"   Issue: {item['issue']}")
                print(f"   Fix Command:")
                print(f"   aws dynamodb update-item \\")
                print(f"       --table-name {table_name} \\")
                print(f"       --key '{json.dumps({'id': {'S': item['id']}})}' \\")
                print(f"       --update-expression 'SET stock_available = :val' \\")
                print(f"       --expression-attribute-values '{json.dumps({':val': {'N': str(item['value']) if item['value'].replace('.', '').replace('-', '').isdigit() else '0'}})}'")
                print()
        
        # Show missing stock_available
        if missing_stock:
            print(f"\n{'='*80}")
            print("⚠️  ITEMS MISSING stock_available FIELD:")
            print(f"{'='*80}\n")
            for idx, item in enumerate(missing_stock, 1):
                print(f"{idx}. Product ID: {item['id']}")
                print(f"   Name: {item['name']}")
                print(f"   Fix Command:")
                print(f"   aws dynamodb update-item \\")
                print(f"       --table-name {table_name} \\")
                print(f"       --key '{json.dumps({'id': {'S': item['id']}})}' \\")
                print(f"       --update-expression 'SET stock_available = :val' \\")
                print(f"       --expression-attribute-values '{json.dumps({':val': {'N': '0'}})}'")
                print()
        
        # Sample of correct items
        if correct_numeric:
            print(f"\n{'='*80}")
            print(f"✅ SAMPLE OF CORRECT ITEMS (showing first 5):")
            print(f"{'='*80}\n")
            for idx, item in enumerate(correct_numeric[:5], 1):
                print(f"{idx}. Product ID: {item['id']}")
                print(f"   Name: {item['name']}")
                print(f"   Stock: {item['value']} (Type: {item['type']})")
                print()
        
        return {
            'correct': len(correct_numeric),
            'issues': len(issues),
            'missing': len(missing_stock),
            'total': total_items
        }
        
    except Exception as e:
        print(f"❌ Error scanning table {table_name}: {e}")
        return None

def main():
    print("\n🔍 DynamoDB Stock Data Type Checker")
    print("="*80)
    
    # Check both TEST and PROD tables
    tables_to_check = [
        ('test_POS_product', 'TEST Environment - Products'),
        ('POS_product', 'PROD Environment - Products')
    ]
    
    results = {}
    
    for table_name, description in tables_to_check:
        print(f"\n📊 Checking: {description}")
        result = check_product_table(table_name)
        if result:
            results[table_name] = result
    
    # Summary
    print(f"\n{'='*80}")
    print("📋 SUMMARY")
    print(f"{'='*80}\n")
    
    for table_name, result in results.items():
        print(f"Table: {table_name}")
        print(f"  Total items: {result['total']}")
        print(f"  ✅ Correct: {result['correct']}")
        print(f"  ❌ Issues: {result['issues']}")
        print(f"  ⚠️  Missing: {result['missing']}")
        print()

if __name__ == "__main__":
    main()
