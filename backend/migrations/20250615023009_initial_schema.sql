CREATE TABLE specialties (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT NOT NULL,
  description TEXT
);

CREATE TABLE hospitals (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT NOT NULL,
  location TEXT,
  rateMultiplier REAL DEFAULT 1.0
);

CREATE TABLE operations (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT NOT NULL,
  code TEXT,
  specialtyId INTEGER NOT NULL,
  basePoints INTEGER NOT NULL,
  description TEXT,
  complexity INTEGER DEFAULT 1,
  FOREIGN KEY (specialtyId) REFERENCES specialties(id)
);

CREATE TABLE hospitalOperationRates (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  hospitalId INTEGER NOT NULL,
  operationId INTEGER NOT NULL,
  pointValue REAL NOT NULL,
  currencyPerPoint REAL NOT NULL,
  lastUpdated TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (hospitalId) REFERENCES hospitals(id),
  FOREIGN KEY (operationId) REFERENCES operations(id),
  UNIQUE(hospitalId, operationId)
);

CREATE TABLE favorites (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  userId TEXT NOT NULL,
  operationId INTEGER NOT NULL,
  createdAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (operationId) REFERENCES operations(id)
);

CREATE TABLE calculationHistory (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  userId TEXT NOT NULL,
  operationId INTEGER NOT NULL,
  hospitalId INTEGER NOT NULL,
  calculatedValue REAL NOT NULL,
  calculatedAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  notes TEXT,
  FOREIGN KEY (operationId) REFERENCES operations(id),
  FOREIGN KEY (hospitalId) REFERENCES hospitals(id)
);