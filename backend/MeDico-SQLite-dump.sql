BEGIN TRANSACTION;

--
--

--
-- Name: auth_group; Type: TABLE;  
--

CREATE TABLE IF NOT EXISTS auth_group (
    id INTEGER NOT NULL,
    name VARCHAR(150) NOT NULL
);

--
-- Name: auth_group_id_seq; Type: SEQUENCE;  
--

--
-- Name: auth_group_permissions; Type: TABLE;  
--

CREATE TABLE IF NOT EXISTS auth_group_permissions (
    id INTEGER NOT NULL,
    group_id INTEGER NOT NULL,
    permission_id INTEGER NOT NULL
);

--
-- Name: auth_group_permissions_id_seq; Type: SEQUENCE;  
--

--
-- Name: auth_permission; Type: TABLE;  
--

CREATE TABLE IF NOT EXISTS auth_permission (
    id INTEGER NOT NULL,
    name VARCHAR(255) NOT NULL,
    content_type_id INTEGER NOT NULL,
    codename VARCHAR(100) NOT NULL
);

--
-- Name: auth_permission_id_seq; Type: SEQUENCE;  
--

--
-- Name: django_admin_log; Type: TABLE;  
--

CREATE TABLE IF NOT EXISTS django_admin_log (
    id INTEGER NOT NULL,
    action_time DATETIME NOT NULL,
    object_id TEXT,
    object_repr VARCHAR(200) NOT NULL,
    action_flag INTEGER NOT NULL,
    change_message TEXT NOT NULL,
    content_type_id INTEGER,
    user_id INTEGER NOT NULL,
    CONSTRAINT django_admin_log_action_flag_check CHECK ((action_flag >= 0))
);

--
-- Name: django_admin_log_id_seq; Type: SEQUENCE;  
--

--
-- Name: django_content_type; Type: TABLE;  
--

CREATE TABLE IF NOT EXISTS django_content_type (
    id INTEGER NOT NULL,
    app_label VARCHAR(100) NOT NULL,
    model VARCHAR(100) NOT NULL
);

--
-- Name: django_content_type_id_seq; Type: SEQUENCE;  
--

--
-- Name: django_migrations; Type: TABLE;  
--

CREATE TABLE IF NOT EXISTS django_migrations (
    id INTEGER NOT NULL,
    app VARCHAR(255) NOT NULL,
    name VARCHAR(255) NOT NULL,
    applied DATETIME NOT NULL
);

--
-- Name: django_migrations_id_seq; Type: SEQUENCE;  
--

--
-- Name: django_session; Type: TABLE;  
--

CREATE TABLE IF NOT EXISTS django_session (
    session_key VARCHAR(40) NOT NULL,
    session_data TEXT NOT NULL,
    expire_date DATETIME NOT NULL
);

--
-- Name: medico_calculationhistory; Type: TABLE;  
--

CREATE TABLE IF NOT EXISTS medico_calculationhistory (
    id INTEGER NOT NULL,
    calculated_value REAL NOT NULL,
    calculated_at DATETIME NOT NULL,
    notes TEXT,
    user_id INTEGER NOT NULL,
    hospital_id INTEGER NOT NULL,
    operation_id INTEGER NOT NULL
);

--
-- Name: medico_calculationhistory_id_seq; Type: SEQUENCE;  
--

--
-- Name: medico_caseprocedure; Type: TABLE;  
--

CREATE TABLE IF NOT EXISTS medico_caseprocedure (
    id INTEGER NOT NULL,
    surgery_code VARCHAR(50) NOT NULL,
    surgery_name VARCHAR(500) NOT NULL,
    specialty VARCHAR(100) NOT NULL,
    grupo VARCHAR(100),
    rvu REAL NOT NULL,
    hospital_factor REAL NOT NULL,
    calculated_value REAL NOT NULL,
    notes TEXT,
    "order" INTEGER NOT NULL,
    created_at DATETIME NOT NULL,
    updated_at DATETIME NOT NULL,
    case_id INTEGER NOT NULL,
    CONSTRAINT medico_caseprocedure_order_check CHECK (("order" >= 0))
);

--
-- Name: medico_caseprocedure_id_seq; Type: SEQUENCE;  
--

--
-- Name: medico_favorite; Type: TABLE;  
--

CREATE TABLE IF NOT EXISTS medico_favorite (
    id INTEGER NOT NULL,
    surgery_code VARCHAR(50) NOT NULL,
    surgery_name VARCHAR(500),
    specialty VARCHAR(100),
    created_at DATETIME NOT NULL,
    user_id INTEGER NOT NULL
);

--
-- Name: medico_favorite_id_seq; Type: SEQUENCE;  
--

--
-- Name: medico_favoritehospital; Type: TABLE;  
--

CREATE TABLE IF NOT EXISTS medico_favoritehospital (
    id INTEGER NOT NULL,
    created_at DATETIME NOT NULL,
    hospital_id INTEGER NOT NULL,
    user_id INTEGER NOT NULL
);

--
-- Name: medico_favoritehospital_id_seq; Type: SEQUENCE;  
--

--
-- Name: medico_hospital; Type: TABLE;  
--

CREATE TABLE IF NOT EXISTS medico_hospital (
    id INTEGER NOT NULL,
    name VARCHAR(200) NOT NULL,
    location VARCHAR(200),
    rate_multiplier REAL NOT NULL,
    created_at DATETIME NOT NULL,
    updated_at DATETIME NOT NULL
);

--
-- Name: medico_hospital_id_seq; Type: SEQUENCE;  
--

--
-- Name: medico_hospitaloperationrate; Type: TABLE;  
--

CREATE TABLE IF NOT EXISTS medico_hospitaloperationrate (
    id INTEGER NOT NULL,
    point_value REAL NOT NULL,
    currency_per_point REAL NOT NULL,
    last_updated DATETIME NOT NULL,
    hospital_id INTEGER NOT NULL,
    operation_id INTEGER NOT NULL
);

--
-- Name: medico_hospitaloperationrate_id_seq; Type: SEQUENCE;  
--

--
-- Name: medico_operation; Type: TABLE;  
--

CREATE TABLE IF NOT EXISTS medico_operation (
    id INTEGER NOT NULL,
    name VARCHAR(300) NOT NULL,
    code VARCHAR(50),
    base_points REAL NOT NULL,
    description TEXT,
    complexity INTEGER NOT NULL,
    created_at DATETIME NOT NULL,
    updated_at DATETIME NOT NULL,
    specialty_id INTEGER NOT NULL
);

--
-- Name: medico_operation_id_seq; Type: SEQUENCE;  
--

--
-- Name: medico_specialty; Type: TABLE;  
--

CREATE TABLE IF NOT EXISTS medico_specialty (
    id INTEGER NOT NULL,
    name VARCHAR(100) NOT NULL,
    description TEXT,
    created_at DATETIME NOT NULL,
    updated_at DATETIME NOT NULL
);

--
-- Name: medico_specialty_id_seq; Type: SEQUENCE;  
--

--
-- Name: medico_surgicalcase; Type: TABLE;  
--

CREATE TABLE IF NOT EXISTS medico_surgicalcase (
    id INTEGER NOT NULL,
    patient_name VARCHAR(255) NOT NULL,
    patient_id VARCHAR(50),
    patient_age INTEGER,
    patient_gender VARCHAR(10),
    surgery_date date NOT NULL,
    surgery_time time without time zone,
    status VARCHAR(20) NOT NULL,
    notes TEXT,
    diagnosis TEXT,
    created_at DATETIME NOT NULL,
    updated_at DATETIME NOT NULL,
    created_by_id INTEGER NOT NULL,
    hospital_id INTEGER NOT NULL,
    CONSTRAINT medico_surgicalcase_patient_age_check CHECK ((patient_age >= 0))
);

--
-- Name: medico_surgicalcase_id_seq; Type: SEQUENCE;  
--

--
-- Name: medio_auth_customuser; Type: TABLE;  
--

CREATE TABLE IF NOT EXISTS medio_auth_customuser (
    id INTEGER NOT NULL,
    password VARCHAR(128) NOT NULL,
    last_login DATETIME,
    is_superuser INTEGER NOT NULL,
    username VARCHAR(150) NOT NULL,
    first_name VARCHAR(150) NOT NULL,
    last_name VARCHAR(150) NOT NULL,
    is_staff INTEGER NOT NULL,
    is_active INTEGER NOT NULL,
    date_joined DATETIME NOT NULL,
    phone VARCHAR(20),
    specialty VARCHAR(100),
    license_number VARCHAR(50),
    hospital_default VARCHAR(200),
    avatar VARCHAR(100),
    signature_image VARCHAR(100),
    is_verified INTEGER NOT NULL,
    email_verification_token VARCHAR(100),
    theme_preference VARCHAR(20) NOT NULL,
    created_at DATETIME NOT NULL,
    updated_at DATETIME NOT NULL,
    email VARCHAR(254) NOT NULL
);

--
-- Name: medio_auth_customuser_groups; Type: TABLE;  
--

CREATE TABLE IF NOT EXISTS medio_auth_customuser_groups (
    id INTEGER NOT NULL,
    customuser_id INTEGER NOT NULL,
    group_id INTEGER NOT NULL
);

--
-- Name: medio_auth_customuser_groups_id_seq; Type: SEQUENCE;  
--

--
-- Name: medio_auth_customuser_id_seq; Type: SEQUENCE;  
--

--
-- Name: medio_auth_customuser_user_permissions; Type: TABLE;  
--

CREATE TABLE IF NOT EXISTS medio_auth_customuser_user_permissions (
    id INTEGER NOT NULL,
    customuser_id INTEGER NOT NULL,
    permission_id INTEGER NOT NULL
);

--
-- Name: medio_auth_customuser_user_permissions_id_seq; Type: SEQUENCE;  
--

--
-- Name: token_blacklist_blacklistedtoken; Type: TABLE;  
--

CREATE TABLE IF NOT EXISTS token_blacklist_blacklistedtoken (
    id INTEGER NOT NULL,
    blacklisted_at DATETIME NOT NULL,
    token_id INTEGER NOT NULL
);

--
-- Name: token_blacklist_blacklistedtoken_id_seq; Type: SEQUENCE;  
--

--
-- Name: token_blacklist_outstandingtoken; Type: TABLE;  
--

CREATE TABLE IF NOT EXISTS token_blacklist_outstandingtoken (
    id INTEGER NOT NULL,
    token TEXT NOT NULL,
    created_at DATETIME,
    expires_at DATETIME NOT NULL,
    user_id INTEGER,
    jti VARCHAR(255) NOT NULL
);

--
-- Name: token_blacklist_outstandingtoken_id_seq; Type: SEQUENCE;  
--

--
-- Data for Name: auth_group; Type: TABLE DATA;  
--

--
-- Data for Name: auth_group_permissions; Type: TABLE DATA;  
--

--
-- Data for Name: auth_permission; Type: TABLE DATA;  
--

--
-- Data for Name: django_admin_log; Type: TABLE DATA;  
--

--
-- Data for Name: django_content_type; Type: TABLE DATA;  
--

--
-- Data for Name: django_migrations; Type: TABLE DATA;  
--

--
-- Data for Name: django_session; Type: TABLE DATA;  
--

--
-- Data for Name: medico_calculationhistory; Type: TABLE DATA;  
--

--
-- Data for Name: medico_caseprocedure; Type: TABLE DATA;  
--

--
-- Data for Name: medico_favorite; Type: TABLE DATA;  
--

--
-- Data for Name: medico_favoritehospital; Type: TABLE DATA;  
--

--
-- Data for Name: medico_hospital; Type: TABLE DATA;  
--

--
-- Data for Name: medico_hospitaloperationrate; Type: TABLE DATA;  
--

--
-- Data for Name: medico_operation; Type: TABLE DATA;  
--

--
-- Data for Name: medico_specialty; Type: TABLE DATA;  
--

--
-- Data for Name: medico_surgicalcase; Type: TABLE DATA;  
--

--
-- Data for Name: medio_auth_customuser; Type: TABLE DATA;  
--

--
-- Data for Name: medio_auth_customuser_groups; Type: TABLE DATA;  
--

--
-- Data for Name: medio_auth_customuser_user_permissions; Type: TABLE DATA;  
--

--
-- Data for Name: token_blacklist_blacklistedtoken; Type: TABLE DATA;  
--

--
-- Data for Name: token_blacklist_outstandingtoken; Type: TABLE DATA;  
--

--
-- Name: auth_group_id_seq; Type: SEQUENCE SET;  
--

SELECT pg_catalog.setval('auth_group_id_seq', 1, false);

--
-- Name: auth_group_permissions_id_seq; Type: SEQUENCE SET;  
--

SELECT pg_catalog.setval('auth_group_permissions_id_seq', 1, false);

--
-- Name: auth_permission_id_seq; Type: SEQUENCE SET;  
--

SELECT pg_catalog.setval('auth_permission_id_seq', 68, true);

--
-- Name: django_admin_log_id_seq; Type: SEQUENCE SET;  
--

SELECT pg_catalog.setval('django_admin_log_id_seq', 1, false);

--
-- Name: django_content_type_id_seq; Type: SEQUENCE SET;  
--

SELECT pg_catalog.setval('django_content_type_id_seq', 17, true);

--
-- Name: django_migrations_id_seq; Type: SEQUENCE SET;  
--

SELECT pg_catalog.setval('django_migrations_id_seq', 37, true);

--
-- Name: medico_calculationhistory_id_seq; Type: SEQUENCE SET;  
--

SELECT pg_catalog.setval('medico_calculationhistory_id_seq', 1, false);

--
-- Name: medico_caseprocedure_id_seq; Type: SEQUENCE SET;  
--

SELECT pg_catalog.setval('medico_caseprocedure_id_seq', 24, true);

--
-- Name: medico_favorite_id_seq; Type: SEQUENCE SET;  
--

SELECT pg_catalog.setval('medico_favorite_id_seq', 53, true);

--
-- Name: medico_favoritehospital_id_seq; Type: SEQUENCE SET;  
--

SELECT pg_catalog.setval('medico_favoritehospital_id_seq', 7, true);

--
-- Name: medico_hospital_id_seq; Type: SEQUENCE SET;  
--

SELECT pg_catalog.setval('medico_hospital_id_seq', 225, true);

--
-- Name: medico_hospitaloperationrate_id_seq; Type: SEQUENCE SET;  
--

SELECT pg_catalog.setval('medico_hospitaloperationrate_id_seq', 1, false);

--
-- Name: medico_operation_id_seq; Type: SEQUENCE SET;  
--

SELECT pg_catalog.setval('medico_operation_id_seq', 1, false);

--
-- Name: medico_specialty_id_seq; Type: SEQUENCE SET;  
--

SELECT pg_catalog.setval('medico_specialty_id_seq', 1, false);

--
-- Name: medico_surgicalcase_id_seq; Type: SEQUENCE SET;  
--

SELECT pg_catalog.setval('medico_surgicalcase_id_seq', 11, true);

--
-- Name: medio_auth_customuser_groups_id_seq; Type: SEQUENCE SET;  
--

SELECT pg_catalog.setval('medio_auth_customuser_groups_id_seq', 1, false);

--
-- Name: medio_auth_customuser_id_seq; Type: SEQUENCE SET;  
--

SELECT pg_catalog.setval('medio_auth_customuser_id_seq', 2, true);

--
-- Name: medio_auth_customuser_user_permissions_id_seq; Type: SEQUENCE SET;  
--

SELECT pg_catalog.setval('medio_auth_customuser_user_permissions_id_seq', 1, false);

--
-- Name: token_blacklist_blacklistedtoken_id_seq; Type: SEQUENCE SET;  
--

SELECT pg_catalog.setval('token_blacklist_blacklistedtoken_id_seq', 5, true);

--
-- Name: token_blacklist_outstandingtoken_id_seq; Type: SEQUENCE SET;  
--

SELECT pg_catalog.setval('token_blacklist_outstandingtoken_id_seq', 11, true);

--
-- Name: auth_group auth_group_name_key; Type: CONSTRAINT;  
--

ALTER TABLE auth_group
    ADD CONSTRAINT auth_group_name_key UNIQUE (name);

--
-- Name: auth_group_permissions auth_group_permissions_group_id_permission_id_0cd325b0_uniq; Type: CONSTRAINT;  
--

ALTER TABLE auth_group_permissions
    ADD CONSTRAINT auth_group_permissions_group_id_permission_id_0cd325b0_uniq UNIQUE (group_id, permission_id);

--
-- Name: auth_group_permissions auth_group_permissions_pkey; Type: CONSTRAINT;  
--

CREATE UNIQUE INDEX IF NOT EXISTS auth_group_permissions_pkey ON auth_group_permissions(id);

--
-- Name: auth_group auth_group_pkey; Type: CONSTRAINT;  
--

CREATE UNIQUE INDEX IF NOT EXISTS auth_group_pkey ON auth_group(id);

--
-- Name: auth_permission auth_permission_content_type_id_codename_01ab375a_uniq; Type: CONSTRAINT;  
--

ALTER TABLE auth_permission
    ADD CONSTRAINT auth_permission_content_type_id_codename_01ab375a_uniq UNIQUE (content_type_id, codename);

--
-- Name: auth_permission auth_permission_pkey; Type: CONSTRAINT;  
--

CREATE UNIQUE INDEX IF NOT EXISTS auth_permission_pkey ON auth_permission(id);

--
-- Name: django_admin_log django_admin_log_pkey; Type: CONSTRAINT;  
--

CREATE UNIQUE INDEX IF NOT EXISTS django_admin_log_pkey ON django_admin_log(id);

--
-- Name: django_content_type django_content_type_app_label_model_76bd3d3b_uniq; Type: CONSTRAINT;  
--

ALTER TABLE django_content_type
    ADD CONSTRAINT django_content_type_app_label_model_76bd3d3b_uniq UNIQUE (app_label, model);

--
-- Name: django_content_type django_content_type_pkey; Type: CONSTRAINT;  
--

CREATE UNIQUE INDEX IF NOT EXISTS django_content_type_pkey ON django_content_type(id);

--
-- Name: django_migrations django_migrations_pkey; Type: CONSTRAINT;  
--

CREATE UNIQUE INDEX IF NOT EXISTS django_migrations_pkey ON django_migrations(id);

--
-- Name: django_session django_session_pkey; Type: CONSTRAINT;  
--

CREATE UNIQUE INDEX IF NOT EXISTS django_session_pkey ON django_session(session_key);

--
-- Name: medico_calculationhistory medico_calculationhistory_pkey; Type: CONSTRAINT;  
--

CREATE UNIQUE INDEX IF NOT EXISTS medico_calculationhistory_pkey ON medico_calculationhistory(id);

--
-- Name: medico_caseprocedure medico_caseprocedure_pkey; Type: CONSTRAINT;  
--

CREATE UNIQUE INDEX IF NOT EXISTS medico_caseprocedure_pkey ON medico_caseprocedure(id);

--
-- Name: medico_favorite medico_favorite_pkey; Type: CONSTRAINT;  
--

CREATE UNIQUE INDEX IF NOT EXISTS medico_favorite_pkey ON medico_favorite(id);

--
-- Name: medico_favorite medico_favorite_user_id_surgery_code_9c211635_uniq; Type: CONSTRAINT;  
--

ALTER TABLE medico_favorite
    ADD CONSTRAINT medico_favorite_user_id_surgery_code_9c211635_uniq UNIQUE (user_id, surgery_code);

--
-- Name: medico_favoritehospital medico_favoritehospital_pkey; Type: CONSTRAINT;  
--

CREATE UNIQUE INDEX IF NOT EXISTS medico_favoritehospital_pkey ON medico_favoritehospital(id);

--
-- Name: medico_favoritehospital medico_favoritehospital_user_id_hospital_id_8b64d883_uniq; Type: CONSTRAINT;  
--

ALTER TABLE medico_favoritehospital
    ADD CONSTRAINT medico_favoritehospital_user_id_hospital_id_8b64d883_uniq UNIQUE (user_id, hospital_id);

--
-- Name: medico_hospital medico_hospital_name_key; Type: CONSTRAINT;  
--

ALTER TABLE medico_hospital
    ADD CONSTRAINT medico_hospital_name_key UNIQUE (name);

--
-- Name: medico_hospital medico_hospital_pkey; Type: CONSTRAINT;  
--

CREATE UNIQUE INDEX IF NOT EXISTS medico_hospital_pkey ON medico_hospital(id);

--
-- Name: medico_hospitaloperationrate medico_hospitaloperation_hospital_id_operation_id_3ab85b55_uniq; Type: CONSTRAINT;  
--

ALTER TABLE medico_hospitaloperationrate
    ADD CONSTRAINT medico_hospitaloperation_hospital_id_operation_id_3ab85b55_uniq UNIQUE (hospital_id, operation_id);

--
-- Name: medico_hospitaloperationrate medico_hospitaloperationrate_pkey; Type: CONSTRAINT;  
--

CREATE UNIQUE INDEX IF NOT EXISTS medico_hospitaloperationrate_pkey ON medico_hospitaloperationrate(id);

--
-- Name: medico_operation medico_operation_pkey; Type: CONSTRAINT;  
--

CREATE UNIQUE INDEX IF NOT EXISTS medico_operation_pkey ON medico_operation(id);

--
-- Name: medico_specialty medico_specialty_name_key; Type: CONSTRAINT;  
--

ALTER TABLE medico_specialty
    ADD CONSTRAINT medico_specialty_name_key UNIQUE (name);

--
-- Name: medico_specialty medico_specialty_pkey; Type: CONSTRAINT;  
--

CREATE UNIQUE INDEX IF NOT EXISTS medico_specialty_pkey ON medico_specialty(id);

--
-- Name: medico_surgicalcase medico_surgicalcase_pkey; Type: CONSTRAINT;  
--

CREATE UNIQUE INDEX IF NOT EXISTS medico_surgicalcase_pkey ON medico_surgicalcase(id);

--
-- Name: medio_auth_customuser medio_auth_customuser_email_key; Type: CONSTRAINT;  
--

ALTER TABLE medio_auth_customuser
    ADD CONSTRAINT medio_auth_customuser_email_key UNIQUE (email);

--
-- Name: medio_auth_customuser_groups medio_auth_customuser_gr_customuser_id_group_id_9afa509b_uniq; Type: CONSTRAINT;  
--

ALTER TABLE medio_auth_customuser_groups
    ADD CONSTRAINT medio_auth_customuser_gr_customuser_id_group_id_9afa509b_uniq UNIQUE (customuser_id, group_id);

--
-- Name: medio_auth_customuser_groups medio_auth_customuser_groups_pkey; Type: CONSTRAINT;  
--

CREATE UNIQUE INDEX IF NOT EXISTS medio_auth_customuser_groups_pkey ON medio_auth_customuser_groups(id);

--
-- Name: medio_auth_customuser medio_auth_customuser_license_number_key; Type: CONSTRAINT;  
--

ALTER TABLE medio_auth_customuser
    ADD CONSTRAINT medio_auth_customuser_license_number_key UNIQUE (license_number);

--
-- Name: medio_auth_customuser medio_auth_customuser_pkey; Type: CONSTRAINT;  
--

CREATE UNIQUE INDEX IF NOT EXISTS medio_auth_customuser_pkey ON medio_auth_customuser(id);

--
-- Name: medio_auth_customuser_user_permissions medio_auth_customuser_us_customuser_id_permission_0c4336c2_uniq; Type: CONSTRAINT;  
--

ALTER TABLE medio_auth_customuser_user_permissions
    ADD CONSTRAINT medio_auth_customuser_us_customuser_id_permission_0c4336c2_uniq UNIQUE (customuser_id, permission_id);

--
-- Name: medio_auth_customuser_user_permissions medio_auth_customuser_user_permissions_pkey; Type: CONSTRAINT;  
--

CREATE UNIQUE INDEX IF NOT EXISTS medio_auth_customuser_user_permissions_pkey ON medio_auth_customuser_user_permissions(id);

--
-- Name: medio_auth_customuser medio_auth_customuser_username_key; Type: CONSTRAINT;  
--

ALTER TABLE medio_auth_customuser
    ADD CONSTRAINT medio_auth_customuser_username_key UNIQUE (username);

--
-- Name: token_blacklist_blacklistedtoken token_blacklist_blacklistedtoken_pkey; Type: CONSTRAINT;  
--

CREATE UNIQUE INDEX IF NOT EXISTS token_blacklist_blacklistedtoken_pkey ON token_blacklist_blacklistedtoken(id);

--
-- Name: token_blacklist_blacklistedtoken token_blacklist_blacklistedtoken_token_id_key; Type: CONSTRAINT;  
--

ALTER TABLE token_blacklist_blacklistedtoken
    ADD CONSTRAINT token_blacklist_blacklistedtoken_token_id_key UNIQUE (token_id);

--
-- Name: token_blacklist_outstandingtoken token_blacklist_outstandingtoken_jti_hex_d9bdf6f7_uniq; Type: CONSTRAINT;  
--

ALTER TABLE token_blacklist_outstandingtoken
    ADD CONSTRAINT token_blacklist_outstandingtoken_jti_hex_d9bdf6f7_uniq UNIQUE (jti);

--
-- Name: token_blacklist_outstandingtoken token_blacklist_outstandingtoken_pkey; Type: CONSTRAINT;  
--

CREATE UNIQUE INDEX IF NOT EXISTS token_blacklist_outstandingtoken_pkey ON token_blacklist_outstandingtoken(id);

--
-- Name: auth_group_name_a6ea08ec_like; Type: INDEX;  
--

CREATE INDEX auth_group_name_a6ea08ec_like ON auth_group USING btree (name varchar_pattern_ops);

--
-- Name: auth_group_permissions_group_id_b120cbf9; Type: INDEX;  
--

CREATE INDEX auth_group_permissions_group_id_b120cbf9 ON auth_group_permissions USING btree (group_id);

--
-- Name: auth_group_permissions_permission_id_84c5c92e; Type: INDEX;  
--

CREATE INDEX auth_group_permissions_permission_id_84c5c92e ON auth_group_permissions USING btree (permission_id);

--
-- Name: auth_permission_content_type_id_2f476e4b; Type: INDEX;  
--

CREATE INDEX auth_permission_content_type_id_2f476e4b ON auth_permission USING btree (content_type_id);

--
-- Name: django_admin_log_content_type_id_c4bce8eb; Type: INDEX;  
--

CREATE INDEX django_admin_log_content_type_id_c4bce8eb ON django_admin_log USING btree (content_type_id);

--
-- Name: django_admin_log_user_id_c564eba6; Type: INDEX;  
--

CREATE INDEX django_admin_log_user_id_c564eba6 ON django_admin_log USING btree (user_id);

--
-- Name: django_session_expire_date_a5c62663; Type: INDEX;  
--

CREATE INDEX django_session_expire_date_a5c62663 ON django_session USING btree (expire_date);

--
-- Name: django_session_session_key_c0390e0f_like; Type: INDEX;  
--

CREATE INDEX django_session_session_key_c0390e0f_like ON django_session USING btree (session_key varchar_pattern_ops);

--
-- Name: medico_calc_hospita_ae0e41_idx; Type: INDEX;  
--

CREATE INDEX medico_calc_hospita_ae0e41_idx ON medico_calculationhistory USING btree (hospital_id);

--
-- Name: medico_calc_operati_bb97d1_idx; Type: INDEX;  
--

CREATE INDEX medico_calc_operati_bb97d1_idx ON medico_calculationhistory USING btree (operation_id);

--
-- Name: medico_calc_user_id_c8effa_idx; Type: INDEX;  
--

CREATE INDEX medico_calc_user_id_c8effa_idx ON medico_calculationhistory USING btree (user_id, calculated_at);

--
-- Name: medico_calculationhistory_hospital_id_6b14ea80; Type: INDEX;  
--

CREATE INDEX medico_calculationhistory_hospital_id_6b14ea80 ON medico_calculationhistory USING btree (hospital_id);

--
-- Name: medico_calculationhistory_operation_id_920f1bc1; Type: INDEX;  
--

CREATE INDEX medico_calculationhistory_operation_id_920f1bc1 ON medico_calculationhistory USING btree (operation_id);

--
-- Name: medico_calculationhistory_user_id_1142d9d0; Type: INDEX;  
--

CREATE INDEX medico_calculationhistory_user_id_1142d9d0 ON medico_calculationhistory USING btree (user_id);

--
-- Name: medico_case_case_id_b50179_idx; Type: INDEX;  
--

CREATE INDEX medico_case_case_id_b50179_idx ON medico_caseprocedure USING btree (case_id, "order");

--
-- Name: medico_case_surgery_baa331_idx; Type: INDEX;  
--

CREATE INDEX medico_case_surgery_baa331_idx ON medico_caseprocedure USING btree (surgery_code);

--
-- Name: medico_caseprocedure_case_id_d95c45dd; Type: INDEX;  
--

CREATE INDEX medico_caseprocedure_case_id_d95c45dd ON medico_caseprocedure USING btree (case_id);

--
-- Name: medico_favo_hospita_216497_idx; Type: INDEX;  
--

CREATE INDEX medico_favo_hospita_216497_idx ON medico_favoritehospital USING btree (hospital_id);

--
-- Name: medico_favo_surgery_94c8a0_idx; Type: INDEX;  
--

CREATE INDEX medico_favo_surgery_94c8a0_idx ON medico_favorite USING btree (surgery_code);

--
-- Name: medico_favo_user_id_0d3584_idx; Type: INDEX;  
--

CREATE INDEX medico_favo_user_id_0d3584_idx ON medico_favoritehospital USING btree (user_id, created_at);

--
-- Name: medico_favo_user_id_919855_idx; Type: INDEX;  
--

CREATE INDEX medico_favo_user_id_919855_idx ON medico_favorite USING btree (user_id, created_at);

--
-- Name: medico_favorite_user_id_e457f370; Type: INDEX;  
--

CREATE INDEX medico_favorite_user_id_e457f370 ON medico_favorite USING btree (user_id);

--
-- Name: medico_favoritehospital_hospital_id_912931b6; Type: INDEX;  
--

CREATE INDEX medico_favoritehospital_hospital_id_912931b6 ON medico_favoritehospital USING btree (hospital_id);

--
-- Name: medico_favoritehospital_user_id_146b0466; Type: INDEX;  
--

CREATE INDEX medico_favoritehospital_user_id_146b0466 ON medico_favoritehospital USING btree (user_id);

--
-- Name: medico_hospital_name_73d352c1_like; Type: INDEX;  
--

CREATE INDEX medico_hospital_name_73d352c1_like ON medico_hospital USING btree (name varchar_pattern_ops);

--
-- Name: medico_hospitaloperationrate_hospital_id_9fbe3e78; Type: INDEX;  
--

CREATE INDEX medico_hospitaloperationrate_hospital_id_9fbe3e78 ON medico_hospitaloperationrate USING btree (hospital_id);

--
-- Name: medico_hospitaloperationrate_operation_id_145b5261; Type: INDEX;  
--

CREATE INDEX medico_hospitaloperationrate_operation_id_145b5261 ON medico_hospitaloperationrate USING btree (operation_id);

--
-- Name: medico_oper_code_6602aa_idx; Type: INDEX;  
--

CREATE INDEX medico_oper_code_6602aa_idx ON medico_operation USING btree (code);

--
-- Name: medico_oper_name_cb89a3_idx; Type: INDEX;  
--

CREATE INDEX medico_oper_name_cb89a3_idx ON medico_operation USING btree (name);

--
-- Name: medico_oper_special_7f641b_idx; Type: INDEX;  
--

CREATE INDEX medico_oper_special_7f641b_idx ON medico_operation USING btree (specialty_id);

--
-- Name: medico_operation_specialty_id_8a310a36; Type: INDEX;  
--

CREATE INDEX medico_operation_specialty_id_8a310a36 ON medico_operation USING btree (specialty_id);

--
-- Name: medico_specialty_name_e20e5447_like; Type: INDEX;  
--

CREATE INDEX medico_specialty_name_e20e5447_like ON medico_specialty USING btree (name varchar_pattern_ops);

--
-- Name: medico_surg_created_2a8d75_idx; Type: INDEX;  
--

CREATE INDEX medico_surg_created_2a8d75_idx ON medico_surgicalcase USING btree (created_by_id, surgery_date);

--
-- Name: medico_surg_hospita_94bac7_idx; Type: INDEX;  
--

CREATE INDEX medico_surg_hospita_94bac7_idx ON medico_surgicalcase USING btree (hospital_id, surgery_date);

--
-- Name: medico_surg_patient_f02d4a_idx; Type: INDEX;  
--

CREATE INDEX medico_surg_patient_f02d4a_idx ON medico_surgicalcase USING btree (patient_id);

--
-- Name: medico_surg_status_805f06_idx; Type: INDEX;  
--

CREATE INDEX medico_surg_status_805f06_idx ON medico_surgicalcase USING btree (status);

--
-- Name: medico_surgicalcase_created_by_id_4b6947b4; Type: INDEX;  
--

CREATE INDEX medico_surgicalcase_created_by_id_4b6947b4 ON medico_surgicalcase USING btree (created_by_id);

--
-- Name: medico_surgicalcase_hospital_id_f946a332; Type: INDEX;  
--

CREATE INDEX medico_surgicalcase_hospital_id_f946a332 ON medico_surgicalcase USING btree (hospital_id);

--
-- Name: medio_auth__created_65a67b_idx; Type: INDEX;  
--

CREATE INDEX medio_auth__created_65a67b_idx ON medio_auth_customuser USING btree (created_at);

--
-- Name: medio_auth__email_458830_idx; Type: INDEX;  
--

CREATE INDEX medio_auth__email_458830_idx ON medio_auth_customuser USING btree (email);

--
-- Name: medio_auth__license_c2d44f_idx; Type: INDEX;  
--

CREATE INDEX medio_auth__license_c2d44f_idx ON medio_auth_customuser USING btree (license_number);

--
-- Name: medio_auth_customuser_email_c17668c2_like; Type: INDEX;  
--

CREATE INDEX medio_auth_customuser_email_c17668c2_like ON medio_auth_customuser USING btree (email varchar_pattern_ops);

--
-- Name: medio_auth_customuser_groups_customuser_id_ab6f8d01; Type: INDEX;  
--

CREATE INDEX medio_auth_customuser_groups_customuser_id_ab6f8d01 ON medio_auth_customuser_groups USING btree (customuser_id);

--
-- Name: medio_auth_customuser_groups_group_id_c13ff909; Type: INDEX;  
--

CREATE INDEX medio_auth_customuser_groups_group_id_c13ff909 ON medio_auth_customuser_groups USING btree (group_id);

--
-- Name: medio_auth_customuser_license_number_4b17acf2_like; Type: INDEX;  
--

CREATE INDEX medio_auth_customuser_license_number_4b17acf2_like ON medio_auth_customuser USING btree (license_number varchar_pattern_ops);

--
-- Name: medio_auth_customuser_user_permissions_customuser_id_a18de69b; Type: INDEX;  
--

CREATE INDEX medio_auth_customuser_user_permissions_customuser_id_a18de69b ON medio_auth_customuser_user_permissions USING btree (customuser_id);

--
-- Name: medio_auth_customuser_user_permissions_permission_id_bc30c5fa; Type: INDEX;  
--

CREATE INDEX medio_auth_customuser_user_permissions_permission_id_bc30c5fa ON medio_auth_customuser_user_permissions USING btree (permission_id);

--
-- Name: medio_auth_customuser_username_545f4023_like; Type: INDEX;  
--

CREATE INDEX medio_auth_customuser_username_545f4023_like ON medio_auth_customuser USING btree (username varchar_pattern_ops);

--
-- Name: token_blacklist_outstandingtoken_jti_hex_d9bdf6f7_like; Type: INDEX;  
--

CREATE INDEX token_blacklist_outstandingtoken_jti_hex_d9bdf6f7_like ON token_blacklist_outstandingtoken USING btree (jti varchar_pattern_ops);

--
-- Name: token_blacklist_outstandingtoken_user_id_83bc629a; Type: INDEX;  
--

CREATE INDEX token_blacklist_outstandingtoken_user_id_83bc629a ON token_blacklist_outstandingtoken USING btree (user_id);

--
-- Name: auth_group_permissions auth_group_permissio_permission_id_84c5c92e_fk_auth_perm; Type: FK CONSTRAINT;  
--

ALTER TABLE auth_group_permissions
    ADD CONSTRAINT auth_group_permissio_permission_id_84c5c92e_fk_auth_perm FOREIGN KEY (permission_id) REFERENCES auth_permission(id) DEFERRABLE INITIALLY DEFERRED;

--
-- Name: auth_group_permissions auth_group_permissions_group_id_b120cbf9_fk_auth_group_id; Type: FK CONSTRAINT;  
--

ALTER TABLE auth_group_permissions
    ADD CONSTRAINT auth_group_permissions_group_id_b120cbf9_fk_auth_group_id FOREIGN KEY (group_id) REFERENCES auth_group(id) DEFERRABLE INITIALLY DEFERRED;

--
-- Name: auth_permission auth_permission_content_type_id_2f476e4b_fk_django_co; Type: FK CONSTRAINT;  
--

ALTER TABLE auth_permission
    ADD CONSTRAINT auth_permission_content_type_id_2f476e4b_fk_django_co FOREIGN KEY (content_type_id) REFERENCES django_content_type(id) DEFERRABLE INITIALLY DEFERRED;

--
-- Name: django_admin_log django_admin_log_content_type_id_c4bce8eb_fk_django_co; Type: FK CONSTRAINT;  
--

ALTER TABLE django_admin_log
    ADD CONSTRAINT django_admin_log_content_type_id_c4bce8eb_fk_django_co FOREIGN KEY (content_type_id) REFERENCES django_content_type(id) DEFERRABLE INITIALLY DEFERRED;

--
-- Name: django_admin_log django_admin_log_user_id_c564eba6_fk_medio_auth_customuser_id; Type: FK CONSTRAINT;  
--

ALTER TABLE django_admin_log
    ADD CONSTRAINT django_admin_log_user_id_c564eba6_fk_medio_auth_customuser_id FOREIGN KEY (user_id) REFERENCES medio_auth_customuser(id) DEFERRABLE INITIALLY DEFERRED;

--
-- Name: medico_calculationhistory medico_calculationhi_hospital_id_6b14ea80_fk_medico_ho; Type: FK CONSTRAINT;  
--

ALTER TABLE medico_calculationhistory
    ADD CONSTRAINT medico_calculationhi_hospital_id_6b14ea80_fk_medico_ho FOREIGN KEY (hospital_id) REFERENCES medico_hospital(id) DEFERRABLE INITIALLY DEFERRED;

--
-- Name: medico_calculationhistory medico_calculationhi_operation_id_920f1bc1_fk_medico_op; Type: FK CONSTRAINT;  
--

ALTER TABLE medico_calculationhistory
    ADD CONSTRAINT medico_calculationhi_operation_id_920f1bc1_fk_medico_op FOREIGN KEY (operation_id) REFERENCES medico_operation(id) DEFERRABLE INITIALLY DEFERRED;

--
-- Name: medico_calculationhistory medico_calculationhi_user_id_1142d9d0_fk_medio_aut; Type: FK CONSTRAINT;  
--

ALTER TABLE medico_calculationhistory
    ADD CONSTRAINT medico_calculationhi_user_id_1142d9d0_fk_medio_aut FOREIGN KEY (user_id) REFERENCES medio_auth_customuser(id) DEFERRABLE INITIALLY DEFERRED;

--
-- Name: medico_caseprocedure medico_caseprocedure_case_id_d95c45dd_fk_medico_surgicalcase_id; Type: FK CONSTRAINT;  
--

ALTER TABLE medico_caseprocedure
    ADD CONSTRAINT medico_caseprocedure_case_id_d95c45dd_fk_medico_surgicalcase_id FOREIGN KEY (case_id) REFERENCES medico_surgicalcase(id) DEFERRABLE INITIALLY DEFERRED;

--
-- Name: medico_favorite medico_favorite_user_id_e457f370_fk_medio_auth_customuser_id; Type: FK CONSTRAINT;  
--

ALTER TABLE medico_favorite
    ADD CONSTRAINT medico_favorite_user_id_e457f370_fk_medio_auth_customuser_id FOREIGN KEY (user_id) REFERENCES medio_auth_customuser(id) DEFERRABLE INITIALLY DEFERRED;

--
-- Name: medico_favoritehospital medico_favoritehospi_hospital_id_912931b6_fk_medico_ho; Type: FK CONSTRAINT;  
--

ALTER TABLE medico_favoritehospital
    ADD CONSTRAINT medico_favoritehospi_hospital_id_912931b6_fk_medico_ho FOREIGN KEY (hospital_id) REFERENCES medico_hospital(id) DEFERRABLE INITIALLY DEFERRED;

--
-- Name: medico_favoritehospital medico_favoritehospi_user_id_146b0466_fk_medio_aut; Type: FK CONSTRAINT;  
--

ALTER TABLE medico_favoritehospital
    ADD CONSTRAINT medico_favoritehospi_user_id_146b0466_fk_medio_aut FOREIGN KEY (user_id) REFERENCES medio_auth_customuser(id) DEFERRABLE INITIALLY DEFERRED;

--
-- Name: medico_hospitaloperationrate medico_hospitalopera_hospital_id_9fbe3e78_fk_medico_ho; Type: FK CONSTRAINT;  
--

ALTER TABLE medico_hospitaloperationrate
    ADD CONSTRAINT medico_hospitalopera_hospital_id_9fbe3e78_fk_medico_ho FOREIGN KEY (hospital_id) REFERENCES medico_hospital(id) DEFERRABLE INITIALLY DEFERRED;

--
-- Name: medico_hospitaloperationrate medico_hospitalopera_operation_id_145b5261_fk_medico_op; Type: FK CONSTRAINT;  
--

ALTER TABLE medico_hospitaloperationrate
    ADD CONSTRAINT medico_hospitalopera_operation_id_145b5261_fk_medico_op FOREIGN KEY (operation_id) REFERENCES medico_operation(id) DEFERRABLE INITIALLY DEFERRED;

--
-- Name: medico_operation medico_operation_specialty_id_8a310a36_fk_medico_specialty_id; Type: FK CONSTRAINT;  
--

ALTER TABLE medico_operation
    ADD CONSTRAINT medico_operation_specialty_id_8a310a36_fk_medico_specialty_id FOREIGN KEY (specialty_id) REFERENCES medico_specialty(id) DEFERRABLE INITIALLY DEFERRED;

--
-- Name: medico_surgicalcase medico_surgicalcase_created_by_id_4b6947b4_fk_medio_aut; Type: FK CONSTRAINT;  
--

ALTER TABLE medico_surgicalcase
    ADD CONSTRAINT medico_surgicalcase_created_by_id_4b6947b4_fk_medio_aut FOREIGN KEY (created_by_id) REFERENCES medio_auth_customuser(id) DEFERRABLE INITIALLY DEFERRED;

--
-- Name: medico_surgicalcase medico_surgicalcase_hospital_id_f946a332_fk_medico_hospital_id; Type: FK CONSTRAINT;  
--

ALTER TABLE medico_surgicalcase
    ADD CONSTRAINT medico_surgicalcase_hospital_id_f946a332_fk_medico_hospital_id FOREIGN KEY (hospital_id) REFERENCES medico_hospital(id) DEFERRABLE INITIALLY DEFERRED;

--
-- Name: medio_auth_customuser_user_permissions medio_auth_customuse_customuser_id_a18de69b_fk_medio_aut; Type: FK CONSTRAINT;  
--

ALTER TABLE medio_auth_customuser_user_permissions
    ADD CONSTRAINT medio_auth_customuse_customuser_id_a18de69b_fk_medio_aut FOREIGN KEY (customuser_id) REFERENCES medio_auth_customuser(id) DEFERRABLE INITIALLY DEFERRED;

--
-- Name: medio_auth_customuser_groups medio_auth_customuse_customuser_id_ab6f8d01_fk_medio_aut; Type: FK CONSTRAINT;  
--

ALTER TABLE medio_auth_customuser_groups
    ADD CONSTRAINT medio_auth_customuse_customuser_id_ab6f8d01_fk_medio_aut FOREIGN KEY (customuser_id) REFERENCES medio_auth_customuser(id) DEFERRABLE INITIALLY DEFERRED;

--
-- Name: medio_auth_customuser_user_permissions medio_auth_customuse_permission_id_bc30c5fa_fk_auth_perm; Type: FK CONSTRAINT;  
--

ALTER TABLE medio_auth_customuser_user_permissions
    ADD CONSTRAINT medio_auth_customuse_permission_id_bc30c5fa_fk_auth_perm FOREIGN KEY (permission_id) REFERENCES auth_permission(id) DEFERRABLE INITIALLY DEFERRED;

--
-- Name: medio_auth_customuser_groups medio_auth_customuser_groups_group_id_c13ff909_fk_auth_group_id; Type: FK CONSTRAINT;  
--

ALTER TABLE medio_auth_customuser_groups
    ADD CONSTRAINT medio_auth_customuser_groups_group_id_c13ff909_fk_auth_group_id FOREIGN KEY (group_id) REFERENCES auth_group(id) DEFERRABLE INITIALLY DEFERRED;

--
-- Name: token_blacklist_blacklistedtoken token_blacklist_blacklistedtoken_token_id_3cc7fe56_fk; Type: FK CONSTRAINT;  
--

ALTER TABLE token_blacklist_blacklistedtoken
    ADD CONSTRAINT token_blacklist_blacklistedtoken_token_id_3cc7fe56_fk FOREIGN KEY (token_id) REFERENCES token_blacklist_outstandingtoken(id) DEFERRABLE INITIALLY DEFERRED;

--
-- Name: token_blacklist_outstandingtoken token_blacklist_outs_user_id_83bc629a_fk_medio_aut; Type: FK CONSTRAINT;  
--

ALTER TABLE token_blacklist_outstandingtoken
    ADD CONSTRAINT token_blacklist_outs_user_id_83bc629a_fk_medio_aut FOREIGN KEY (user_id) REFERENCES medio_auth_customuser(id) DEFERRABLE INITIALLY DEFERRED;

--
--



COMMIT;
