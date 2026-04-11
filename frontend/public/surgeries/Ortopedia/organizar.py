import pandas as pd
import os

# Nombre de la especialidad y archivo de entrada
especialidad = "Ortopedia"
archivo_excel = r"C:\Users\nacho\OneDrive\Documentos\GitHub\MeDico1\public\App_cirugias_excel\TABLA DE CALIFORNIA.xlsx"

# Leer el archivo Excel
df = pd.read_excel(archivo_excel)

# Mostrar columnas disponibles (opcional)
print("Columnas encontradas:")
print(df.columns)

# Convertir la columna CPT a numérica (por si hay texto o espacios)
df["CPT"] = pd.to_numeric(df["CPT"], errors="coerce")

# Filtrar filas con códigos entre 26000 y 26992
df_filtrado = df[df["CPT"].between(26000, 26992)]

# Seleccionar solo las columnas que te interesan: A (CPT), C (DESCRIPTION) y D (RVU)
df_filtrado = df_filtrado[["CPT", "DESCRIPTION", "RVU"]]

# Eliminar duplicados (por seguridad)
df_filtrado = df_filtrado.drop_duplicates()

# Crear la ruta de salida (mismo lugar del Excel)
carpeta_salida = os.path.dirname(archivo_excel)
os.makedirs(carpeta_salida, exist_ok=True)

# Nombre del archivo final
archivo_salida = os.path.join(carpeta_salida, f"{especialidad}.csv")

# Guardar en CSV
df_filtrado.to_csv(archivo_salida, index=False, encoding="utf-8-sig")

print(f"\n✅ Archivo '{archivo_salida}' generado con {len(df_filtrado)} registros.")
