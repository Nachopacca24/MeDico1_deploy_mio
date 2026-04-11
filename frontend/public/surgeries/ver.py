import pandas as pd

# Ruta del archivo Excel original
archivo = 'TABLA DE CALIFORNIA.xlsx'

# Leer solo las columnas A, C y D (índices 0, 2 y 3)
df = pd.read_excel(archivo, usecols=[0, 2, 3], header=None)

# Asignar nombres a las columnas
df.columns = ['codigo', 'cirugia', 'rvu']

# Filtrar filas donde 'codigo' sea numérico, descartando encabezados u otros textos
df = df[pd.to_numeric(df['codigo'], errors='coerce').notnull()]

# Convertir 'codigo' a entero
df['codigo'] = df['codigo'].astype(int)

# Guardar resultado limpio en nuevo archivo Excel
df.to_excel('cirugias_filtradas.xlsx', index=False)

print("Archivo filtrado guardado como 'cirugias_filtradas.xlsx'")
