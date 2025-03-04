DROP SCHEMA IF EXISTS logs CASCADE;

CREATE SCHEMA logs;


CREATE TABLE logs.log (
   id                BIGSERIAL PRIMARY KEY NOT NULL,
   resource_name     TEXT NOT NULL,
   user_id           TEXT NOT NULL,
   data              JSONB NOT NULL,
   status            VARCHAR(1) NOT NULL,
   district_id       INT,
   upazila_id        INT,
   created_by        VARCHAR (50) NOT NULL,
   create_date       TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

COMMENT ON COLUMN logs.log.resource_name IS
   'Use table name in the resource name column.';
COMMENT ON COLUMN logs.log.status IS 
   'status use for approved/rejected. A for Approved, R for Rejected.';