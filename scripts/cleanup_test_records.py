import boto3
from botocore.exceptions import ClientError
from decimal import Decimal

dynamodb = boto3.resource('dynamodb')
dynamodb_client = boto3.client('dynamodb')

# IDs de los registros de prueba
CASH_REGISTER_ID = '9fc564d2-daf8-4a0b-b5cc-c48b7b14e416'
ORDER_ID = 'a1cf6123-5497-4003-8136-83e46a65e3ea'

def cleanup_cash_register():
    """Eliminar el registro de caja registradora"""
    try:
        table = dynamodb.Table('stellar_cashRegisterCloseout')
        response = table.delete_item(
            Key={'id': CASH_REGISTER_ID}
        )
        print(f"✓ Registro de caja eliminado: {CASH_REGISTER_ID}")
        return True
    except ClientError as e:
        print(f"✗ Error eliminando caja registradora: {e}")
        return False

def cleanup_order_ticket():
    """Eliminar el ticket de orden"""
    try:
        table = dynamodb.Table('POS_orderTicket')
        response = table.delete_item(
            Key={'id': ORDER_ID}
        )
        print(f"✓ Order ticket eliminado: {ORDER_ID}")
        return True
    except ClientError as e:
        print(f"✗ Error eliminando order ticket: {e}")
        return False

def cleanup_order_products():
    """Eliminar todos los productos de la orden"""
    try:
        table = dynamodb.Table('POS_orderProduct')
        
        # Buscar todos los productos asociados a esta orden
        response = table.scan(
            FilterExpression='orderTicket_id = :order_id',
            ExpressionAttributeValues={
                ':order_id': ORDER_ID
            }
        )
        
        items = response.get('Items', [])
        deleted_count = 0
        
        for item in items:
            table.delete_item(Key={'id': item['id']})
            deleted_count += 1
            print(f"  - Producto eliminado: {item['id']}")
        
        print(f"✓ {deleted_count} productos de orden eliminados")
        return True
    except ClientError as e:
        print(f"✗ Error eliminando productos de orden: {e}")
        return False

def cleanup_split_payments():
    """Eliminar pagos divididos si existen"""
    try:
        table = dynamodb.Table('POS_orderSplitPayment')
        
        # Buscar pagos divididos asociados a esta orden
        response = table.scan(
            FilterExpression='orderTicket_id = :order_id',
            ExpressionAttributeValues={
                ':order_id': ORDER_ID
            }
        )
        
        items = response.get('Items', [])
        deleted_count = 0
        
        for item in items:
            table.delete_item(Key={'id': item['id']})
            deleted_count += 1
            print(f"  - Pago dividido eliminado: {item['id']}")
        
        if deleted_count > 0:
            print(f"✓ {deleted_count} pagos divididos eliminados")
        else:
            print("ℹ No se encontraron pagos divididos")
        return True
    except ClientError as e:
        print(f"✗ Error eliminando pagos divididos: {e}")
        return False

def cleanup_inventory_movements():
    """Eliminar movimientos de inventario y restaurar stock"""
    try:
        table = dynamodb.Table('inventory_movement')
        product_table = dynamodb.Table('POS_product')
        variant_table = dynamodb.Table('POS_product_variant')
        
        # Buscar movimientos de inventario asociados a esta orden
        response = table.scan(
            FilterExpression='transactionTicket_id = :order_id',
            ExpressionAttributeValues={
                ':order_id': ORDER_ID
            }
        )
        
        items = response.get('Items', [])
        deleted_count = 0
        
        for item in items:
            product_id = item['product_id']
            variant_id = item.get('product_variant_id', 'no_variant')
            quantity = Decimal(str(item['quantity']))  # Cantidad vendida (negativa)
            
            # Restaurar el stock (revertir la venta)
            try:
                if variant_id and variant_id != 'no_variant':
                    # Restaurar stock de variante
                    variant_table.update_item(
                        Key={'id': variant_id},
                        UpdateExpression='SET stock_available = stock_available + :qty',
                        ExpressionAttributeValues={
                            ':qty': abs(quantity)  # Sumar la cantidad absoluta
                        }
                    )
                    print(f"  - Stock restaurado para variante {variant_id}: +{abs(quantity)}")
                else:
                    # Restaurar stock de producto
                    product_table.update_item(
                        Key={'id': product_id},
                        UpdateExpression='SET stock_available = stock_available + :qty',
                        ExpressionAttributeValues={
                            ':qty': abs(quantity)  # Sumar la cantidad absoluta
                        }
                    )
                    print(f"  - Stock restaurado para producto {product_id}: +{abs(quantity)}")
            except ClientError as stock_error:
                print(f"  ⚠ Advertencia restaurando stock: {stock_error}")
            
            # Eliminar el movimiento de inventario
            table.delete_item(Key={'id': item['id']})
            deleted_count += 1
            print(f"  - Movimiento eliminado: {item['id']}")
        
        print(f"✓ {deleted_count} movimientos de inventario eliminados y stock restaurado")
        return True
    except ClientError as e:
        print(f"✗ Error eliminando movimientos de inventario: {e}")
        return False

def main():
    print("=" * 60)
    print("LIMPIEZA DE REGISTROS DE PRUEBA EN PRODUCCIÓN")
    print("=" * 60)
    print(f"\nCash Register ID: {CASH_REGISTER_ID}")
    print(f"Order ID: {ORDER_ID}\n")
    print("-" * 60)
    
    # Confirmación
    confirm = input("\n⚠️  ¿Estás seguro de eliminar estos registros? (escribe 'SI' para confirmar): ")
    
    if confirm != 'SI':
        print("\n❌ Operación cancelada")
        return
    
    print("\n🔄 Iniciando limpieza...\n")
    
    # Ejecutar limpieza en orden inverso a la creación
    print("\n1. Limpiando movimientos de inventario y restaurando stock...")
    cleanup_inventory_movements()
    
    print("\n2. Limpiando pagos divididos...")
    cleanup_split_payments()
    
    print("\n3. Limpiando productos de orden...")
    cleanup_order_products()
    
    print("\n4. Limpiando ticket de orden...")
    cleanup_order_ticket()
    
    print("\n5. Limpiando registro de caja...")
    cleanup_cash_register()
    
    print("\n" + "=" * 60)
    print("✅ LIMPIEZA COMPLETADA")
    print("=" * 60)

if __name__ == '__main__':
    main()
