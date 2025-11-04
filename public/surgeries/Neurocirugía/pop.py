import pandas as pd
import os

# Nombre de la especialidad que vas a procesar
especialidad = "Neurocirugía"

archivo_especialidad = r"C:\Users\nacho\OneDrive\Documentos\GitHub\MeDico\App_cirugias_excel\Neurocirugía\Neurocirugía.csv"

# Leer el archivo correspondiente a la especialidad
df = pd.read_csv(archivo_especialidad)

# Eliminar duplicados exactos
df = df.drop_duplicates()

# Limpiar espacios y estandarizar grupos
df['grupo'] = df['grupo'].astype(str).str.strip()

# Crear carpeta si no existe
carpeta_salida = os.path.dirname(archivo_especialidad)
os.makedirs(carpeta_salida, exist_ok=True)

# Verificación antes
total_original = len(df)
print(f"Total original: {total_original}")

# Crear un CSV por cada grupo (área)
total_generado = 0
grupos = df['grupo'].unique()

for grupo in grupos:
    df_grupo = df[df['grupo'] == grupo]
    total_generado += len(df_grupo)

    nombre_archivo = grupo.replace(" ", "_").replace("/", "_") + ".csv"
    ruta_archivo = os.path.join(carpeta_salida, nombre_archivo)
    df_grupo.to_csv(ruta_archivo, index=False, encoding='utf-8-sig')

print(f"Total en archivos generados: {total_generado}")
print(f"Diferencia: {total_generado - total_original}")