DROP SCHEMA IF EXISTS master CASCADE;

CREATE SCHEMA master;

CREATE TABLE master.doptor_info
(
   id                    SERIAL PRIMARY KEY NOT NULL,
   doptor_office_id      INT NOT NULL,
   doptor_name           VARCHAR (200) UNIQUE NOT NULL,
   doptor_name_bangla    VARCHAR (200) UNIQUE NOT NULL,
   is_active             BOOLEAN NOT NULL DEFAULT true,
   created_by            VARCHAR (50) NOT NULL,
   created_at            TIMESTAMPTZ NOT NULL DEFAULT NOW(),
   updated_by            VARCHAR (50),
   updated_at            TIMESTAMPTZ
);

CREATE TABLE master.office_info
(
  id                INT PRIMARY KEY,
  nameBN            VARCHAR(500),
  name              VARCHAR(500),
  doptor_id         INT,
  code              VARCHAR(100),
  division          INT,
  district          INT,
  upazila           INT,
  phone             VARCHAR(300),
  mobile            VARCHAR(300),
  digitalNothiCode  VARCHAR(100),
  fax               VARCHAR(100),
  email             VARCHAR(100),
  website           VARCHAR(300),
  ministry          INT,
  layer             INT,
  origin            INT,
  customLayer       INT
);


CREATE TABLE master.project_info
(
   id                         SERIAL PRIMARY KEY NOT NULL,
   project_name               TEXT UNIQUE NOT NULL,
   project_name_bangla        TEXT UNIQUE NOT NULL,
   project_code               VARCHAR (50),
   project_director           VARCHAR (150)NULL,
   doptor_id                  INT NOT NULL,
   office_id                  INT,
   initiate_date              DATE NOT NULL,
   project_duration           INT NOT NULL,
   estimated_exp              INT NOT NULL,
   fund_source                TEXT,
   expire_date                DATE ,
    -- Prokolpo = P, Kormosuchi = K
   project_phase              VARCHAR (1) NOT NULL,
   description                TEXT NOT NULL,
   -- C for COOP, S for Samity, D for Dol, G for Songho
   samity_type                VARCHAR(1),
   is_active                  BOOLEAN NOT NULL DEFAULT TRUE,
   created_by                 VARCHAR (50) NOT NULL,
   created_at                 TIMESTAMPTZ NOT NULL DEFAULT NOW(),
   updated_by                 VARCHAR (50),
   updated_at                 TIMESTAMPTZ,
   FOREIGN KEY (doptor_id)    REFERENCES master.doptor_info (id),
   FOREIGN KEY (office_id)    REFERENCES master.office_info (id)
);
COMMENT ON COLUMN master.project_info.project_phase IS 'P for Prokolpo, K for Kormosuchi';
COMMENT ON COLUMN master.project_info.samity_type IS 'C for COOP, S for Samity, D for Dol, G for Songho';


CREATE TABLE master.division_info
(
   id                      INT PRIMARY KEY NOT NULL,
   division_code           VARCHAR (2),
   division_name           VARCHAR (50),
   division_name_bangla    VARCHAR (100),
   created_by              VARCHAR (50),
   created_at              TIMESTAMPTZ NOT NULL DEFAULT NOW(),
   updated_by              VARCHAR (50),
   updated_at              TIMESTAMPTZ
);

CREATE TABLE master.district_info
(
   id                      INT PRIMARY KEY NOT NULL,
   division_id             INT,
   district_code           VARCHAR (2),
   district_name           VARCHAR (50),
   district_name_bangla    VARCHAR (100),
   created_by              VARCHAR (50),
   created_at              TIMESTAMPTZ NOT NULL DEFAULT NOW(),
   updated_by              VARCHAR (50),
   updated_at              TIMESTAMPTZ
);

CREATE TABLE master.upazila_info
(
   id                     INT PRIMARY KEY NOT NULL,
   division_id            INT,
   district_id            INT,
   upazila_code           VARCHAR (10),
   upazila_name           VARCHAR (50),
   upazila_name_bangla    VARCHAR (100),
   created_by             VARCHAR (50),
   created_at             TIMESTAMPTZ NOT NULL DEFAULT NOW(),
   updated_by             VARCHAR (50),
   updated_at             TIMESTAMPTZ
);

CREATE TABLE master.union_info
(
   id                   INT PRIMARY KEY NOT NULL,
   division_id          INT,
   district_id          INT,
   upazila_id           INT,
   union_code           VARCHAR (2),
   union_name           VARCHAR (50),
   union_name_bangla    VARCHAR (100),
   created_by           VARCHAR (50),
   created_at           TIMESTAMPTZ NOT NULL DEFAULT NOW(),
   updated_by           VARCHAR (50),
   updated_at           TIMESTAMPTZ
);

CREATE TABLE master.city_corp_info
(
   id                      INT PRIMARY KEY NOT NULL,
   division_id             INT,
   district_id             INT,
   upazila_id              INT,
   city_corp_code          VARCHAR (2),
   city_corp_name          VARCHAR (100),
   city_corp_name_bangla   VARCHAR (100),
   created_by              VARCHAR (50),
   created_at              TIMESTAMPTZ NOT NULL DEFAULT NOW(),
   updated_by              VARCHAR (50),
   updated_at              TIMESTAMPTZ
);

CREATE TABLE master.code_master
(
   id                SERIAL PRIMARY KEY NOT NULL,
   code_type         VARCHAR (3) NOT NULL,
   return_value      VARCHAR (3) NOT NULL,
   display_value     VARCHAR (100) NOT NULL,
   is_active         BOOLEAN NOT NULL DEFAULT TRUE,
   created_by        VARCHAR (50) NOT NULL DEFAULT 'SYSTEM',
   created_at        TIMESTAMPTZ NOT NULL DEFAULT NOW(),
   updated_by        VARCHAR (50),
   updated_at        TIMESTAMPTZ
);


CREATE TABLE master.project_zone
(
   id                            BIGSERIAL PRIMARY KEY NOT NULL,
   doptor_id                     INT,
   office_id                     INT,
   project_id                    INT NOT NULL,
   division_id                   INT NOT NULL,
   district_id                   INT NOT NULL,
   city_corp_id                  INT,
   upazila_id                    INT NOT NULL,
   is_active                     BOOLEAN NOT NULL DEFAULT TRUE,
   created_by                    VARCHAR (50) NOT NULL,
   created_at                    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
   updated_by                    VARCHAR (50),
   updated_at                    TIMESTAMPTZ,
   FOREIGN KEY (project_id)      REFERENCES master.project_info(id),
   FOREIGN KEY (doptor_id)       REFERENCES master.doptor_info(id),
   FOREIGN KEY (division_id)     REFERENCES master.division_info(id),
   FOREIGN KEY (district_id)     REFERENCES master.district_info(id),
   FOREIGN KEY (city_corp_id)    REFERENCES master.city_corp_info(id),
   FOREIGN KEY (upazila_id)      REFERENCES master.upazila_info(id),
   UNIQUE (district_id,division_id,doptor_id,project_id,upazila_id)
);


CREATE TABLE master.address_type
(
   id              SERIAL PRIMARY KEY NOT NULL,
   address_type    VARCHAR (3) NOT NULL,
   type_desc       VARCHAR (200) NOT NULL,
   is_active       BOOLEAN NOT NULL DEFAULT TRUE,
   created_by      VARCHAR (50) NOT NULL,
   created_at      TIMESTAMPTZ NOT NULL DEFAULT now (),
   updated_by      VARCHAR (50),
   updated_at      TIMESTAMPTZ
);

CREATE TABLE master.address_info
(
   id                               SERIAL PRIMARY KEY NOT NULL,
   address_type_id                  INT NOT NULL,
   doptor_id                        INT,
   office_id                        INT,
   project_id                       INT,
   ref_no                           INT NOT NULL,
   address_for                      VARCHAR (3),
   district_id                      INT,
   upazila_id                       INT,
   union_id                         INT,
   post_code                        VARCHAR (10),
   village_name                     VARCHAR (200),
   ward_no                          VARCHAR (100),
   road_no                          VARCHAR (50),
   holding_no                       VARCHAR (50),
   is_active                        BOOLEAN NOT NULL DEFAULT TRUE,
   created_by                       VARCHAR (50) NOT NULL,
   created_at                       TIMESTAMPTZ NOT NULL DEFAULT NOW (),
   updated_by                       VARCHAR (50),
   updated_at                       TIMESTAMPTZ,
   FOREIGN KEY (address_type_id)    REFERENCES loan.ADDRESS_TYPE (id),
   FOREIGN KEY (doptor_id)          REFERENCES master.doptor_info (id),
   FOREIGN KEY (office_id)          REFERENCES master.office_info (id),
   FOREIGN KEY (project_id)         REFERENCES master.project_info (id)
);

CREATE TABLE master.document_type
(
   id               SERIAL PRIMARY KEY NOT NULL,
   doc_type         VARCHAR (3) NOT NULL,
   doc_type_desc    TEXT NOT NULL,
   is_active        BOOLEAN NOT NULL DEFAULT TRUE,
   created_by       VARCHAR (50) NOT NULL,
   created_at       TIMESTAMPTZ NOT NULL DEFAULT NOW (),
   updated_by       VARCHAR (50),
   updated_at       TIMESTAMPTZ
);


CREATE TABLE loan.document_info(
id                            BIGSERIAL PRIMARY KEY NOT NULL,
doc_type_id                   INT NOT NULL,
document_no                   VARCHAR (100) NOT NULL,
doptor_id                     INT,
office_id                     INT,
project_id                    INT,
ref_no                        INT NOT NULL,
issue_date                    DATE,
issue_place                   VARCHAR (255),
expire_date                   DATE,
remarks                       TEXT,
doc_owner			            VARCHAR (1),
created_by                    VARCHAR (50) NOT NULL,
created_at                    TIMESTAMPTZ NOT NULL DEFAULT NOW (),
updated_by                    VARCHAR (50),
updated_at                    TIMESTAMPTZ,
FOREIGN KEY (doc_type_id)     REFERENCES master.document_type (id),
FOREIGN KEY (doptor_id)       REFERENCES master.doptor_info (id),
FOREIGN KEY (office_id)       REFERENCES master.office_info (id),
FOREIGN KEY (project_id)      REFERENCES master.project_info (id)
);

COMMENT ON COLUMN loan.document_info.ref_no IS 'REF_No use for Customer or user id.';
COMMENT ON COLUMN loan.document_info.doc_owner IS 'doc_owner use for member/member guardian. W for Own, F for Father, M for Mother, N for Nominee, G for Guardian and O for Others.';


CREATE TABLE master.service_info(
   id              SERIAL PRIMARY KEY,
   service_name    CHARACTER VARYING (256),
   is_active       BOOLEAN NOT NULL DEFAULT TRUE,
   created_by      CHARACTER VARYING (50) NOT NULL,
   created_at      TIMESTAMP (6) WITH TIME ZONE NOT NULL DEFAULT now (),
   updated_by      CHARACTER VARYING (50) NULL,
   updated_at      TIMESTAMP (6) WITH TIME ZONE NULL
);


CREATE TABLE loan.product_document_mapping_dtl(
   id                SERIAL PRIMARY KEY,
   doptor_id         INT,
   project_id        INT,
   service_id        INT NOT NULL,
   doc_type_id       INTEGER NOT NULL,
   is_mandatory      BOOLEAN NOT NULL DEFAULT TRUE,
   created_by        CHARACTER VARYING (50) NOT NULL,
   created_at        TIMESTAMP (6) WITH TIME ZONE NOT NULL DEFAULT now (),
   updated_by        CHARACTER VARYING (50) NULL,
   updated_at        TIMESTAMP (6) WITH TIME ZONE NULL,
   
   FOREIGN KEY (doc_type_id) REFERENCES master.document_type (id),
   FOREIGN KEY (doptor_id) REFERENCES master.doptor_info (id),
   FOREIGN KEY (project_id) REFERENCES master.project_info (id)
)


CREATE TABLE master.user_wise_project(
   id          SERIAL PRIMARY KEY NOT NULL,
   doptor_id   INT NOT NULL,
   office_id   INT NOT NULL,
   project_id  INT NOT NULL,
   user_id     INT NOT NULL,
	isActive	   BOOLEAN DEFAULT true,
   FOREIGN KEY(doptor_id) REFERENCES master.doptor_info(id),
   FOREIGN KEY(office_id) REFERENCES master.office_info(id),
   FOREIGN KEY(project_id) REFERENCES master.project_info(id),
   FOREIGN KEY(user_id) REFERENCES users.user(id)
);


CREATE TABLE master.field_status(
   id                         BIGSERIAL PRIMARY KEY NOT NULL,
   page_name                  TEXT,
   field_name                 VARCHAR(250),
   is_active                  BOOLEAN DEFAULT FALSE,
   created_by                 VARCHAR (50) NOT NULL,
   created_at                 TIMESTAMPTZ NOT NULL DEFAULT NOW(),
   updated_by                 VARCHAR (50),
   updated_at                 TIMESTAMPTZ
)
