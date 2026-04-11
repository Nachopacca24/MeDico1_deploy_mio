import os
import pandas as pd

# Clasificación por grupo
clasificacion = [
    ("Ortopedia", "Hombro", 23000, 23999),
    ("Ortopedia", "Cadera", 27000, 27999),
    ("Ortopedia", "Pie", 28000, 28999),
    ("Ortopedia", "Muñeca y mano", 25000, 25999),
]

# Ruta al archivo CSV
archivo = 'C:/Users/nacho/OneDrive/Documentos/GitHub/MeDico/App_cirugias_excel/Ortopedia/Ortopedia.csv'

# Leer el archivo CSV (columnas: código, cirugía, rvu)
df = pd.read_csv(archivo, usecols=[0, 2, 3], header=None)
df.columns = ['codigo', 'cirugia', 'rvu']

# Limpiar valores no numéricos
df = df[pd.to_numeric(df['codigo'], errors='coerce').notnull()]
df['codigo'] = df['codigo'].astype(int)

# Función para clasificar según código
def asignar_clasificacion(codigo):
    for especialidad, grupo, inicio, fin in clasificacion:
        if inicio <= codigo <= fin:
            return pd.Series([especialidad, grupo])
    return pd.Series(['Sin clasificación', 'Sin clasificación'])

# Aplicar clasificación
df[['especialidad', 'grupo']] = df['codigo'].apply(asignar_clasificacion)

# Carpeta base donde guardar los archivos
carpeta_salida = os.path.dirname(archivo)  # Usa la misma carpeta del archivo original

# Guardar archivos CSV por grupo
grupos = df[df['especialidad'] == 'Ortopedia']['grupo'].unique()

for grupo in grupos:
    df_grupo = df[df['grupo'] == grupo]
    nombre_archivo = f"{grupo.replace(' ', '_')}.csv"
    ruta_archivo = os.path.join(carpeta_salida, nombre_archivo)
    df_grupo.to_csv(ruta_archivo, index=False, encoding='utf-8-sig')

print("✅ Archivos CSV por grupo de Ortopedia guardados correctamente.")