import pandas as pd

clasificacion = [
    ("Cirugía General", "Aspiraciones", 10021, 10022),
    ("Cirugía General", "Drenajes / Incisiones", 10120, 10180),
    ("Dermatología", "Lesiones cutáneas", 11400, 11646),
    ("Cirugía General", "Uñas / piel", 11719, 11765),
    ("Cirugía General", "Reparaciones (suturas)", 12001, 13160),
    ("Ginecología", "Ovario y útero", 56405, 58999),
    ("Urología", "Riñón y vejiga", 50000, 53899),
    ("Neurocirugía", "Cráneo y columna", 61000, 64999),
    ("Ortopedia", "Hombro", 23000, 23999),
    ("Ortopedia", "Cadera", 27000, 27999),
    ("Ortopedia", "Pie", 28000, 28999),
    ("Ortopedia", "Muñeca y mano", 25000, 25999),
    ("Columna", "Vertebral", 22000, 22999),
    ("Cardiovascular", "Corazón", 33000, 33999),
    ("Cardiovascular", "Vasos periféricos", 34000, 37799),
    ("Digestivo", "Estómago e intestino", 42000, 45999),
    ("Digestivo", "Hígado / Páncreas", 47000, 47999),
    ("Digestivo", "Peritoneo y hernias", 49000, 49999),
    ("Oftalmología", "Ojo y retina", 65091, 68899),
    ("Otorrino", "Oído / Laringe", 69000, 69990),
    ("Obstetricia", "Parto / cesárea", 59000, 59899),
    ("Endocrino", "Tiroides / glándulas", 60000, 60699),
    ("Mama", "Mastectomía", 19000, 19499),
]

archivo = 'TABLA DE CALIFORNIA.xlsx'

df = pd.read_excel(archivo, usecols=[0, 2, 3], header=None)
df.columns = ['codigo', 'cirugia', 'rvu']

# Limpiar filas no numéricas
df = df[pd.to_numeric(df['codigo'], errors='coerce').notnull()]
df['codigo'] = df['codigo'].astype(int)

def asignar_clasificacion(codigo):
    for especialidad, grupo, inicio, fin in clasificacion:
        if inicio <= codigo <= fin:
            return pd.Series([especialidad, grupo])
    return pd.Series(['Sin clasificación', 'Sin clasificación'])

df[['especialidad', 'grupo']] = df['codigo'].apply(asignar_clasificacion)

# Guardar todo junto
df.to_excel('cirugias_clasificadas.xlsx', index=False)

# Guardar CSV por cada especialidad
especialidades = df['especialidad'].unique()

for esp in especialidades:
    df_esp = df[df['especialidad'] == esp]
    # Reemplazar espacios por guiones bajos para nombres de archivo
    nombre_archivo = f"{esp.replace(' ', '_')}.csv"
    df_esp.to_csv(nombre_archivo, index=False, encoding='utf-8-sig')

print("Archivos CSV por especialidad generados correctamente.")


