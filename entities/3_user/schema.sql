DROP SCHEMA IF EXISTS users CASCADE;

CREATE SCHEMA users;

-- user kyc central information table
CREATE TABLE users.person_info (
    id SERIAL PRIMARY KEY NOT NULL,
    name_en TEXT,
    name_bn TEXT,
    nid TEXT,
    -- birth registration number
    brn TEXT,
    passport TEXT,
    nid_front_url TEXT,
    nid_back_url TEXT,
    dob DATE,
    mobile TEXT,
    email TEXT,
    father_name_en TEXT,
    father_name_bn TEXT,
    mother_name_en TEXT,
    mother_name_bn TEXT,
    spouse_name TEXT,
    gender TEXT,
    religion TEXT,
    photo_url TEXT,
    -- system generated
    created_by TEXT NOT NULL,
    create_date timestamptz NOT NULL DEFAULT NOW(),
    updated_by TEXT,
    update_date timestamptz
);

CREATE TABLE users.user(
    id SERIAL PRIMARY KEY NOT NULL,
    name TEXT,
    email TEXT,
    username TEXT,
    mobile TEXT,
    doptor_id INT,
    office_id INT,
    layer_id INT,
    origin_id INT,
    employee_id INT,
    designation_id INT,
    is_active BOOLEAN DEFAULT false,
    created_by TEXT NOT NULL,
    created_at TIMESTAMPTZ NOT NULL,
    updated_by TEXT NULL,
    updated_at TIMESTAMPTZ NULL
);

REATE TABLE users.feature(
    id SERIAL PRIMARY KEY NOT NULL,
    feature_name TEXT UNIQUE NOT NULL,
    feature_name_ban TEXT NOT NULL,
    url TEXT NOT NULL,
    -- root node or not
    is_root BOOLEAN NOT NULL,
    -- Parent = P, Child = C
    type TEXT NOT NULL,
    -- Sidebar = SIDE, Navbar = NAV, Content = CONT
    position TEXT NOT NULL,
    icon_id TEXT,
    parent_id INT CHECK(parent_id <> id),
    is_active BOOLEAN NOT NULL,
    created_by TEXT NOT NULL,
    create_date timestamptz NOT NULL DEFAULT NOW(),
    updated_by TEXT,
    update_date timestamptz,
    FOREIGN KEY(parent_id) REFERENCES users.feature(id)
);

-- role table 
CREATE TABLE users.role(
    id SERIAL PRIMARY KEY NOT NULL,
    role_name TEXT NOT NULL,
    description TEXT NOT NULL,
    -- Active = A, Pending = P, Rejected = R
    approve_status TEXT DEFAULT 'P' NOT NULL,
    -- Is operational or not
    is_active BOOLEAN NOT NULL,
    office_id INT NOT NULL REFERENCES master.office_info(id) ON DELETE CASCADE,
    approved_by TEXT,
    approve_date timestamptz,
    created_by TEXT NOT NULL,
    create_date timestamptz NOT NULL DEFAULT NOW(),
    updated_by TEXT,
    update_date timestamptz,
    CONSTRAINT role_unique_key UNIQUE(role_name, office_id)
);

-- role and feature many to many relation table
CREATE TABLE users.role_feature(
    id SERIAL PRIMARY KEY NOT NULL,
    role_id INT NOT NULL,
    feature_id INT NOT NULL,
    FOREIGN KEY(role_id) REFERENCES users.role(id),
    FOREIGN KEY(feature_id) REFERENCES users.feature(id),
    UNIQUE(role_id, feature_id)
);