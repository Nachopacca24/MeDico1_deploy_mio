-- Insert specialties
INSERT INTO specialties (name, description) VALUES
('Cardiology', 'Heart and cardiovascular system procedures'),
('Neurology', 'Brain, spinal cord, and nervous system procedures'),
('Orthopedics', 'Bone, joint, and musculoskeletal procedures'),
('General Surgery', 'Common surgical procedures'),
('Ophthalmology', 'Eye procedures'),
('Gynecology', 'Female reproductive system procedures');

-- Insert hospitals
INSERT INTO hospitals (name, location, rateMultiplier) VALUES
('Hospital General San Juan de Dios', 'Guatemala City', 1.0),
('Hospital Roosevelt', 'Guatemala City', 0.95),
('Hospital Regional de Occidente', 'Quetzaltenango', 0.9),
('Hospital Nacional Pedro de Bethancourt', 'Antigua Guatemala', 0.85),
('Hospital Privado Hermano Pedro', 'Guatemala City', 1.2);

-- Insert operations
-- Cardiology
INSERT INTO operations (name, code, specialtyId, basePoints, description, complexity) VALUES
('Coronary Angioplasty', 'CARD001', 1, 150, 'Procedure to open blocked coronary arteries', 3),
('Pacemaker Implantation', 'CARD002', 1, 120, 'Implantation of electronic device to regulate heartbeat', 2),
('Coronary Bypass Surgery', 'CARD003', 1, 250, 'Surgery to improve blood flow to the heart', 4),
('Valve Replacement', 'CARD004', 1, 200, 'Replacement of damaged heart valve', 4),
('Cardiac Catheterization', 'CARD005', 1, 100, 'Diagnostic procedure to examine heart function', 2);

-- Neurology
INSERT INTO operations (name, code, specialtyId, basePoints, description, complexity) VALUES
('Craniotomy', 'NEUR001', 2, 300, 'Surgical opening of the skull', 5),
('Spinal Fusion', 'NEUR002', 2, 180, 'Joining two or more vertebrae', 3),
('Brain Tumor Resection', 'NEUR003', 2, 250, 'Removal of brain tumor', 5),
('Lumbar Puncture', 'NEUR004', 2, 50, 'Collection of cerebrospinal fluid', 1),
('Nerve Conduction Study', 'NEUR005', 2, 40, 'Test to evaluate nerve function', 1);

-- Orthopedics
INSERT INTO operations (name, code, specialtyId, basePoints, description, complexity) VALUES
('Total Hip Replacement', 'ORTH001', 3, 150, 'Replacement of hip joint with prosthesis', 3),
('Total Knee Replacement', 'ORTH002', 3, 140, 'Replacement of knee joint with prosthesis', 3),
('Arthroscopic Knee Surgery', 'ORTH003', 3, 90, 'Minimally invasive knee procedure', 2),
('Fracture Reduction', 'ORTH004', 3, 70, 'Realignment of broken bones', 2),
('Carpal Tunnel Release', 'ORTH005', 3, 60, 'Surgery to relieve pressure on median nerve', 1);

-- General Surgery
INSERT INTO operations (name, code, specialtyId, basePoints, description, complexity) VALUES
('Appendectomy', 'GEN001', 4, 70, 'Removal of appendix', 1),
('Cholecystectomy', 'GEN002', 4, 90, 'Removal of gallbladder', 2),
('Hernia Repair', 'GEN003', 4, 80, 'Repair of abdominal wall hernia', 2),
('Colectomy', 'GEN004', 4, 150, 'Removal of part of the colon', 3),
('Thyroidectomy', 'GEN005', 4, 120, 'Removal of thyroid gland', 3);

-- Ophthalmology
INSERT INTO operations (name, code, specialtyId, basePoints, description, complexity) VALUES
('Cataract Surgery', 'OPH001', 5, 60, 'Removal of cloudy lens and replacement with artificial lens', 1),
('Glaucoma Surgery', 'OPH002', 5, 90, 'Procedure to reduce intraocular pressure', 2),
('Retinal Detachment Repair', 'OPH003', 5, 120, 'Reattachment of retina to back of eye', 3),
('LASIK', 'OPH004', 5, 50, 'Laser vision correction', 1),
('Corneal Transplant', 'OPH005', 5, 130, 'Replacement of damaged cornea', 3);

-- Gynecology
INSERT INTO operations (name, code, specialtyId, basePoints, description, complexity) VALUES
('Hysterectomy', 'GYN001', 6, 120, 'Removal of uterus', 3),
('Cesarean Section', 'GYN002', 6, 100, 'Surgical delivery of baby', 2),
('Oophorectomy', 'GYN003', 6, 90, 'Removal of ovaries', 2),
('Tubal Ligation', 'GYN004', 6, 70, 'Female sterilization procedure', 1),
('Hysteroscopy', 'GYN005', 6, 60, 'Examination of uterine cavity', 1);

-- Insert hospital operation rates
-- Hospital General San Juan de Dios rates
INSERT INTO hospitalOperationRates (hospitalId, operationId, pointValue, currencyPerPoint) VALUES
(1, 1, 1.0, 12.5),  -- Coronary Angioplasty
(1, 6, 1.0, 13.0),  -- Craniotomy
(1, 11, 1.0, 11.0), -- Total Hip Replacement
(1, 16, 1.0, 10.0), -- Appendectomy
(1, 21, 1.0, 9.5),  -- Cataract Surgery
(1, 26, 1.0, 11.5); -- Hysterectomy

-- Hospital Roosevelt rates
INSERT INTO hospitalOperationRates (hospitalId, operationId, pointValue, currencyPerPoint) VALUES
(2, 2, 0.95, 12.0),  -- Pacemaker Implantation
(2, 7, 0.95, 12.5),  -- Spinal Fusion
(2, 12, 0.95, 10.5), -- Total Knee Replacement
(2, 17, 0.95, 9.5),  -- Cholecystectomy
(2, 22, 0.95, 9.0),  -- Glaucoma Surgery
(2, 27, 0.95, 11.0); -- Cesarean Section

-- Hospital Regional de Occidente rates
INSERT INTO hospitalOperationRates (hospitalId, operationId, pointValue, currencyPerPoint) VALUES
(3, 3, 0.9, 11.5),  -- Coronary Bypass Surgery
(3, 8, 0.9, 12.0),  -- Brain Tumor Resection
(3, 13, 0.9, 10.0), -- Arthroscopic Knee Surgery
(3, 18, 0.9, 9.0),  -- Hernia Repair
(3, 23, 0.9, 8.5),  -- Retinal Detachment Repair
(3, 28, 0.9, 10.5); -- Oophorectomy

-- Hospital Nacional Pedro de Bethancourt rates
INSERT INTO hospitalOperationRates (hospitalId, operationId, pointValue, currencyPerPoint) VALUES
(4, 4, 0.85, 11.0),  -- Valve Replacement
(4, 9, 0.85, 11.5),  -- Lumbar Puncture
(4, 14, 0.85, 9.5),  -- Fracture Reduction
(4, 19, 0.85, 8.5),  -- Colectomy
(4, 24, 0.85, 8.0),  -- LASIK
(4, 29, 0.85, 10.0); -- Tubal Ligation

-- Hospital Privado Hermano Pedro rates
INSERT INTO hospitalOperationRates (hospitalId, operationId, pointValue, currencyPerPoint) VALUES
(5, 5, 1.2, 14.0),   -- Cardiac Catheterization
(5, 10, 1.2, 14.5),  -- Nerve Conduction Study
(5, 15, 1.2, 12.5),  -- Carpal Tunnel Release
(5, 20, 1.2, 13.0),  -- Thyroidectomy
(5, 25, 1.2, 13.5),  -- Corneal Transplant
(5, 30, 1.2, 12.0);  -- Hysteroscopy