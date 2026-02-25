# Stock Data Type Fix Scripts

This directory contains scripts for managing `stock_available` data type issues in DynamoDB tables.

## Scripts Overview

### 1. `check_stock_data_types.py` (Diagnostic)
Scans DynamoDB tables and reports data type issues with `stock_available` fields.

**Usage:**
```bash
python scripts/check_stock_data_types.py
```

**Output:**
- Shows total items, correct items, items with issues, and missing fields
- Lists specific products with data type problems
- Provides fix commands for manual correction

### 2. `fix_stock_data_types.py` (Dynamic Fixer) ⭐ **RECOMMENDED**
Automatically detects and fixes all `stock_available` data type issues.

**Usage:**
```bash
# Dry run (preview what would be fixed)
python scripts/fix_stock_data_types.py --dry-run

# Fix all tables (TEST and PROD)
python scripts/fix_stock_data_types.py

# Fix only PROD environment
python scripts/fix_stock_data_types.py --skip-test

# Fix only TEST environment
python scripts/fix_stock_data_types.py --skip-prod

# Show help
python scripts/fix_stock_data_types.py --help
```

**Features:**
- ✅ Automatically scans tables for issues
- ✅ Fixes String → Number conversions
- ✅ Handles missing `stock_available` fields
- ✅ Dry-run mode for safe preview
- ✅ Detailed progress and error reporting
- ✅ Works with both TEST and PROD environments

### 3. `fix_all_stock_types.sh` (Legacy)
Static bash script with hardcoded product IDs. **Not recommended** as it requires manual updates.

## Recommended Workflow

1. **Check for issues:**
   ```bash
   python scripts/check_stock_data_types.py
   ```

2. **Preview fixes (dry run):**
   ```bash
   python scripts/fix_stock_data_types.py --dry-run
   ```

3. **Apply fixes:**
   ```bash
   python scripts/fix_stock_data_types.py
   ```

4. **Verify fixes:**
   ```bash
   python scripts/check_stock_data_types.py
   ```

## Common Issues

### Issue: stock_available stored as String
**Symptom:** `stock_available` field has type `S` instead of `N` in DynamoDB
**Cause:** Data was inserted with incorrect type
**Fix:** Run `fix_stock_data_types.py` to automatically convert to Number type

### Issue: Missing stock_available field
**Symptom:** Product exists but has no `stock_available` field
**Cause:** Field was never set during product creation
**Fix:** Run `fix_stock_data_types.py` to add field with default value of 0

## Requirements

- Python 3.x
- boto3 library
- AWS credentials configured
- Access to DynamoDB tables: `test_POS_product` and `POS_product`

## Notes

- Always run in dry-run mode first when in production
- The dynamic script is safer than manual fixes as it validates data before updating
- Both TEST and PROD tables are checked/fixed by default
