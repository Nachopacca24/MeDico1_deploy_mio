"""
Management command to show database connection and table information
"""
from django.core.management.base import BaseCommand
from django.db import connection
from django.conf import settings


class Command(BaseCommand):
    help = 'Show database connection and table information'

    def handle(self, *args, **options):
        db_settings = settings.DATABASES['default']
        
        self.stdout.write(self.style.SUCCESS("\nDATABASE CONNECTION"))
        self.stdout.write(f"Database: {db_settings.get('NAME')}")
        self.stdout.write(f"User: {db_settings.get('USER')}")
        self.stdout.write(f"Host: {db_settings.get('HOST')}:{db_settings.get('PORT')}")
        
        with connection.cursor() as cursor:
            cursor.execute("""
                SELECT table_name 
                FROM information_schema.tables 
                WHERE table_schema = 'public' 
                AND table_name LIKE 'medico_%'
                ORDER BY table_name;
            """)
            
            medico_tables = cursor.fetchall()
            
            self.stdout.write(self.style.SUCCESS(f"\nMEDICO TABLES ({len(medico_tables)})"))
            
            for table in medico_tables:
                cursor.execute(f"SELECT COUNT(*) FROM {table[0]};")
                count = cursor.fetchone()[0]
                self.stdout.write(f"  {table[0]}: {count} records")
