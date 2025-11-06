"""
Script para recrear la base de datos con el nuevo modelo de usuario CustomUser.
USO: python scripts/reset_database.py

ADVERTENCIA: Este script eliminará TODOS los datos de la base de datos.
"""

import os
import sys
import django

# Setup Django
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'core.settings.dev')
django.setup()

from django.core.management import call_command
from django.db import connection


def reset_database():
    """Recrear la base de datos desde cero"""
    
    print("=" * 60)
    print("RECREAR BASE DE DATOS - MeDico")
    print("=" * 60)
    print("\n⚠️  ADVERTENCIA: Este script eliminará TODOS los datos.")
    print("Esto es necesario para cambiar el modelo de usuario.\n")
    
    confirm = input("¿Estás seguro? Escribe 'SI' para continuar: ")
    
    if confirm != 'SI':
        print("\n❌ Operación cancelada.")
        return
    
    print("\n📋 Iniciando proceso de migración...\n")
    
    try:
        # 1. Eliminar todas las tablas
        print("1️⃣  Eliminando tablas existentes...")
        with connection.cursor() as cursor:
            cursor.execute("""
                DO $$ DECLARE
                    r RECORD;
                BEGIN
                    FOR r IN (SELECT tablename FROM pg_tables WHERE schemaname = 'public') LOOP
                        EXECUTE 'DROP TABLE IF EXISTS ' || quote_ident(r.tablename) || ' CASCADE';
                    END LOOP;
                END $$;
            """)
        print("   ✅ Tablas eliminadas\n")
        
        # 2. Eliminar archivos de migración (excepto __init__.py)
        print("2️⃣  Limpiando archivos de migración...")
        migrations_dir = os.path.join(
            os.path.dirname(os.path.dirname(__file__)),
            'apps', 'medio_auth', 'migrations'
        )
        
        for file in os.listdir(migrations_dir):
            if file.endswith('.py') and file != '__init__.py':
                file_path = os.path.join(migrations_dir, file)
                os.remove(file_path)
                print(f"   🗑️  Eliminado: {file}")
        
        # Limpiar __pycache__
        pycache_dir = os.path.join(migrations_dir, '__pycache__')
        if os.path.exists(pycache_dir):
            for file in os.listdir(pycache_dir):
                os.remove(os.path.join(pycache_dir, file))
        
        print("   ✅ Archivos de migración limpiados\n")
        
        # 3. Crear nuevas migraciones
        print("3️⃣  Creando nuevas migraciones...")
        call_command('makemigrations', 'medio_auth', verbosity=1)
        print("   ✅ Migraciones creadas\n")
        
        # 4. Aplicar migraciones
        print("4️⃣  Aplicando migraciones a la base de datos...")
        call_command('migrate', verbosity=1)
        print("   ✅ Migraciones aplicadas\n")
        
        # 5. Crear superusuario
        print("5️⃣  Crear superusuario (opcional)")
        create_super = input("¿Deseas crear un superusuario ahora? (s/n): ")
        
        if create_super.lower() == 's':
            call_command('createsuperuser')
        else:
            print("   ℹ️  Puedes crear un superusuario después con: python manage.py createsuperuser")
        
        print("\n" + "=" * 60)
        print("✅ ¡BASE DE DATOS RECREADA EXITOSAMENTE!")
        print("=" * 60)
        print("\n📝 Próximos pasos:")
        print("1. Verifica que el servidor funcione: python manage.py runserver")
        print("2. Prueba los endpoints de auth en: http://localhost:8000/api/auth/")
        print("3. Actualiza el frontend para usar los nuevos endpoints\n")
        
    except Exception as e:
        print(f"\n❌ ERROR: {str(e)}")
        print("\nSi el error persiste, intenta manualmente:")
        print("1. Eliminar la base de datos en PostgreSQL")
        print("2. Crear una nueva base de datos")
        print("3. Ejecutar: python manage.py migrate")
        sys.exit(1)


if __name__ == '__main__':
    reset_database()
