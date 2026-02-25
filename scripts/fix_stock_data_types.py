#!/usr/bin/env python3
"""
Dynamic script to automatically fix stock_available data type issues in DynamoDB.
Scans tables, identifies items with incorrect data types, and fixes them.
"""
import boto3
import json
import sys
from typing import List, Dict, Tuple

dynamodb_client = boto3.client('dynamodb')

def scan_and_find_issues(table_name: str) -> Tuple[List[Dict], List[Dict]]:
    """
    Scan the product table and find items with stock_available data type issues.
    
    Returns:
        Tuple of (items_with_issues, items_missing_stock)
    """
    print(f"\n{'='*80}")
    print(f"Scanning table: {table_name}")
    print(f"{'='*80}\n")
    
    try:
        # Scan the table
        response = dynamodb_client.scan(
            TableName=table_name,
            ProjectionExpression='id, #name, stock_available',
            ExpressionAttributeNames={
                '#name': 'name'
            }
        )
        
        items = response.get('Items', [])
        
        # Handle pagination
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
        
        print(f"📊 Total items scanned: {len(items)}")
        
        # Categorize items
        issues = []
        missing_stock = []
        correct_count = 0
        
        for item in items:
            product_id = item.get('id', {}).get('S', 'Unknown ID')
            product_name = item.get('name', {}).get('S', 'Unknown Name')
            
            if 'stock_available' not in item:
                missing_stock.append({
                    'id': product_id,
                    'name': product_name,
                    'value': '0'
                })
            elif 'S' in item['stock_available']:
                # String type - needs fixing
                value = item['stock_available']['S']
                # Validate it's a numeric string
                if value.replace('.', '').replace('-', '').isdigit():
                    numeric_value = value
                else:
                    print(f"⚠️  Warning: Non-numeric string value '{value}' for {product_name}, defaulting to 0")
                    numeric_value = '0'
                
                issues.append({
                    'id': product_id,
                    'name': product_name,
                    'value': numeric_value
                })
            elif 'N' in item['stock_available']:
                # Number type - correct
                correct_count += 1
            else:
                # Other type - needs fixing
                issues.append({
                    'id': product_id,
                    'name': product_name,
                    'value': '0'
                })
        
        print(f"✅ Correct (Number type): {correct_count}")
        print(f"❌ Issues (String or other type): {len(issues)}")
        print(f"⚠️  Missing stock_available: {len(missing_stock)}")
        
        return issues, missing_stock
        
    except Exception as e:
        print(f"❌ Error scanning table {table_name}: {e}")
        return [], []

def fix_item(table_name: str, product_id: str, product_name: str, value: str) -> bool:
    """
    Fix a single item by updating its stock_available to Number type.
    
    Returns:
        True if successful, False otherwise
    """
    try:
        dynamodb_client.update_item(
            TableName=table_name,
            Key={'id': {'S': product_id}},
            UpdateExpression='SET stock_available = :val',
            ExpressionAttributeValues={':val': {'N': value}}
        )
        return True
    except Exception as e:
        print(f"  ❌ Error: {e}")
        return False

def fix_table(table_name: str, dry_run: bool = False) -> Dict:
    """
    Find and fix all data type issues in a table.
    
    Args:
        table_name: Name of the DynamoDB table
        dry_run: If True, only show what would be fixed without making changes
    
    Returns:
        Dictionary with fix results
    """
    issues, missing = scan_and_find_issues(table_name)
    
    if not issues and not missing:
        print(f"\n✅ No issues found in {table_name}! All items are correct.\n")
        return {'fixed': 0, 'failed': 0, 'total': 0}
    
    total_to_fix = len(issues) + len(missing)
    
    if dry_run:
        print(f"\n{'='*80}")
        print(f"🔍 DRY RUN - Would fix {total_to_fix} items in {table_name}")
        print(f"{'='*80}\n")
        
        if issues:
            print("Items with incorrect data type:")
            for idx, item in enumerate(issues, 1):
                print(f"  {idx}. {item['name']} (ID: {item['id']}) - value: {item['value']}")
        
        if missing:
            print("\nItems missing stock_available:")
            for idx, item in enumerate(missing, 1):
                print(f"  {idx}. {item['name']} (ID: {item['id']}) - will set to: 0")
        
        return {'fixed': 0, 'failed': 0, 'total': total_to_fix}
    
    print(f"\n{'='*80}")
    print(f"🔧 Fixing {total_to_fix} items in {table_name}")
    print(f"{'='*80}\n")
    
    fixed = 0
    failed = 0
    
    # Fix items with incorrect data type
    if issues:
        print("Fixing items with incorrect data type:")
        for idx, item in enumerate(issues, 1):
            print(f"  {idx}/{len(issues)} Updating {item['name']} (ID: {item['id'][:8]}...)")
            if fix_item(table_name, item['id'], item['name'], item['value']):
                print(f"    ✅ Fixed (set to {item['value']})")
                fixed += 1
            else:
                failed += 1
    
    # Fix items missing stock_available
    if missing:
        print("\nFixing items missing stock_available:")
        for idx, item in enumerate(missing, 1):
            print(f"  {idx}/{len(missing)} Updating {item['name']} (ID: {item['id'][:8]}...)")
            if fix_item(table_name, item['id'], item['name'], '0'):
                print(f"    ✅ Fixed (set to 0)")
                fixed += 1
            else:
                failed += 1
    
    print(f"\n{'='*80}")
    print(f"Summary for {table_name}:")
    print(f"  ✅ Successfully fixed: {fixed}")
    print(f"  ❌ Failed: {failed}")
    print(f"{'='*80}\n")
    
    return {'fixed': fixed, 'failed': failed, 'total': total_to_fix}

def main():
    """Main function to fix stock_available data types in all tables."""
    print("\n🔧 DynamoDB Stock Data Type Fixer")
    print("="*80)
    print("This script will automatically fix all stock_available data type issues")
    print("="*80)
    
    # Parse command line arguments
    dry_run = '--dry-run' in sys.argv or '-n' in sys.argv
    skip_test = '--skip-test' in sys.argv
    skip_prod = '--skip-prod' in sys.argv
    
    if dry_run:
        print("\n⚠️  DRY RUN MODE - No changes will be made\n")
    
    # Tables to fix
    tables = []
    if not skip_test:
        tables.append(('test_POS_product', 'TEST Environment'))
    if not skip_prod:
        tables.append(('POS_product', 'PROD Environment'))
    
    if not tables:
        print("❌ No tables selected. Remove --skip-test or --skip-prod flags.")
        sys.exit(1)
    
    # Fix each table
    results = {}
    for table_name, description in tables:
        print(f"\n📋 Processing: {description} ({table_name})")
        results[table_name] = fix_table(table_name, dry_run)
    
    # Final summary
    print(f"\n{'='*80}")
    print("🎉 FINAL SUMMARY")
    print(f"{'='*80}\n")
    
    total_fixed = sum(r['fixed'] for r in results.values())
    total_failed = sum(r['failed'] for r in results.values())
    total_items = sum(r['total'] for r in results.values())
    
    for table_name, result in results.items():
        print(f"{table_name}:")
        print(f"  ✅ Fixed: {result['fixed']}")
        print(f"  ❌ Failed: {result['failed']}")
        print(f"  📊 Total: {result['total']}")
        print()
    
    print(f"Overall:")
    print(f"  ✅ Total fixed: {total_fixed}")
    print(f"  ❌ Total failed: {total_failed}")
    print(f"  📊 Total processed: {total_items}")
    
    if dry_run:
        print(f"\n💡 Run without --dry-run flag to apply these fixes")
    elif total_failed == 0 and total_items > 0:
        print(f"\n✅ All items fixed successfully!")
    elif total_fixed > 0:
        print(f"\n⚠️  Some items were fixed, but {total_failed} failed. Check errors above.")
    
    sys.exit(0 if total_failed == 0 else 1)

if __name__ == "__main__":
    # Show usage if help requested
    if '--help' in sys.argv or '-h' in sys.argv:
        print("""
Usage: python fix_stock_data_types.py [OPTIONS]

Options:
  --dry-run, -n     Show what would be fixed without making changes
  --skip-test       Skip TEST environment (test_POS_product)
  --skip-prod       Skip PROD environment (POS_product)
  --help, -h        Show this help message

Examples:
  # Dry run to see what would be fixed
  python fix_stock_data_types.py --dry-run
  
  # Fix all tables
  python fix_stock_data_types.py
  
  # Fix only PROD
  python fix_stock_data_types.py --skip-test
  
  # Fix only TEST
  python fix_stock_data_types.py --skip-prod
""")
        sys.exit(0)
    
    main()
