DROP SCHEMA IF EXISTS NOTIFICATION CASCADE;

CREATE SCHEMA NOTIFICATION;

CREATE TABLE notification.component(
    id SERIAL PRIMARY KEY NOT NULL,
    doptor_id TEXT NOT NULL,
    user_type TEXT,
    user_id INTEGER,
    designation_id INTEGER,
    component_id INTEGER,
    content JSONB NOT NULL,
    read_status BOOLEAN DEFAULT FALSE,
    read_at TIMESTAMPTZ,
    created_by TEXT NOT NULL,
    created_at TIMESTAMPTZ NOT NULL
);

CREATE TABLE notification.dashboard(
    id SERIAL PRIMARY KEY NOT NULL,
    doptor_id TEXT NOT NULL,
    user_type TEXT,
    user_id INTEGER,
    designation_id INTEGER DEFAULT NULL,
    component_id INTEGER,
    content JSONB NOT NULL,
    send_status BOOLEAN DEFAULT FALSE,
    created_by TEXT NOT NULL,
    created_at TIMESTAMPTZ NOT NULL
);

CREATE TABLE notification.sms(
    id SERIAL PRIMARY KEY NOT NULL,
    doptor_id TEXT NOT NULL,
    user_type TEXT,
    user_id INTEGER,
    designation_id INTEGER DEFAULT NULL,
    component_id INTEGER,
    content JSONB NOT NULL,
    send_status BOOLEAN DEFAULT FALSE,
    mobileemail_idemail_id TEXT,
    created_by TEXT NOT NULL,
    created_at TIMESTAMPTZ NOT NULL
);

CREATE TABLE notification.email(
    id SERIAL PRIMARY KEY NOT NULL,
    doptor_id TEXT NOT NULL,
    user_type TEXT,
    user_id INTEGER,
    designation_id INTEGER DEFAULT NULL,
    component_id INTEGER,
    content JSONB NOT NULL,
    send_status BOOLEAN DEFAULT FALSE,
    email TEXT,
    created_by TEXT NOT NULL,
    created_at TIMESTAMPTZ NOT NULL
);