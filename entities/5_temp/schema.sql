DROP SCHEMA IF EXISTS temps CASCADE;

CREATE SCHEMA temps;


CREATE TABLE temps.staging_area (
   id                BIGSERIAL PRIMARY KEY NOT NULL,
   resource_name     TEXT NOT NULL,
   user_id           INT NOT NULL,
   data              JSONB NOT NULL,
   status            VARCHAR(1) NOT NULL DEFAULT 'P',
   district_id       INT,
   upazila_id        INT,
   doptor_id         INT,
   project_id        INT,
   remarks           TEXT,
   created_by        VARCHAR (50) NOT NULL,
   create_date       TIMESTAMPTZ NOT NULL DEFAULT NOW()
);


CREATE TABLE temps.customer_survey_info
(
   id                         BIGSERIAL PRIMARY KEY NOT NULL,
   office_id                  INT,
   first_name                 VARCHAR (50) NOT NULL,
   last_name                  VARCHAR (50),
   father_name                VARCHAR (50) NOT NULL,
   mother_name                VARCHAR (50) NOT NULL,
   birth_date                 DATE NOT NULL,
   document                   JSONB,
   address                    JSONB,
   mobile_number              VARCHAR (15) NOT NULL,
   religion                   INT,
   gender                     INT NOT NULL,
   maritial_status            INT,
   spouse_name                VARCHAR (50),
   education                  INT,
   occupation                 INT,
   yearly_income              INT,
   family_member_male         INT,
   family_member_female       INT,
   family_head                VARCHAR (1),
   own_residence              VARCHAR (1),
   residence_remarks          VARCHAR (100),
   created_by                 VARCHAR (50),
   created_at                 TIMESTAMPTZ NOT NULL DEFAULT NOW()
);