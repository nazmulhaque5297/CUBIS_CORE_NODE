DROP SCHEMA IF EXISTS samity CASCADE;

CREATE SCHEMA samity;


CREATE TABLE samity.samity_info
(
   id                            BIGSERIAL PRIMARY KEY NOT NULL,
   samity_code                   VARCHAR(20) NOT NULL,
   samity_name                   TEXT NOT NULL,
   -- Male = M, Female = F, Both = B
   samity_member_type            VARCHAR (1),
   doptor_id                     INT,
   office_id                     INT,
   project_id                    INT,
   district_id                   INT NOT NULL,
   city_corp_id                  INT,
   ward_id                       INT,
   upazila_id                    INT NOT NULL,
   union_id                      INT,
   vilage_name                   TEXT,
   address                       TEXT NOT NULL,
   work_place_lat                TEXT,
   work_place_long               TEXT,
   work_area_radius              INT,
   member_min_age                INT,
   member_max_age                INT,
   samity_min_member             INT,
   samity_max_member             INT,
   group_min_member              INT,
   group_max_member              INT,
   branch_code                   INT,
   fo_code                       INT NOT NULL,
   coop_status                   BOOLEAN NOT NULL DEFAULT FALSE,
   coop_reg_number               VARCHAR (20),
   share_amount                  INT,
   weekly_meeting_day            VARCHAR (50) NOT NULL,
   admission_fee                 INT,
   passbook_fee                  INT,
   is_sme                        BOOLEAN NULL DEFAULT FALSE,
   -- Active = A, Pending = P, Rejected = R
   authorize_status              VARCHAR (1) NOT NULL DEFAULT 'P',
   authorized_by                 VARCHAR (50),
   authorized_at                 DATE,
   created_by                    VARCHAR (50) NOT NULL,
   created_at                    TIMESTAMPTZ NOT NULL,
   updated_by                    VARCHAR (50),
   updated_at                    TIMESTAMPTZ,
   FOREIGN KEY (doptor_id)       REFERENCES master.doptor_info (id),
   FOREIGN KEY (office_id)       REFERENCES master.office_info (id),
   FOREIGN KEY (project_id)      REFERENCES master.project_info (id),
   FOREIGN KEY (district_id)     REFERENCES master.district_info (id),
   FOREIGN KEY (city_corp_id)    REFERENCES master.city_corp_info (id),
   FOREIGN KEY (upazila_id)      REFERENCES master.upazila_info (id)
);


CREATE TABLE samity.customer_info
(
   id                         BIGSERIAL PRIMARY KEY NOT NULL,
   customer_code              VARCHAR (30) NOT NULL,
   customer_type              NUMERIC (1) DEFAULT 1 NOT NULL,
   first_name                 VARCHAR (50) NOT NULL,
   last_name                  VARCHAR (50),
   father_name                VARCHAR (50) NOT NULL,
   mother_name                VARCHAR (50) NOT NULL,
   doptor_id                  INT,
   office_id                  INT,
   project_id                 INT NOT NULL,
   samity_id                  INT,
   branch_code                INT NOT NULL,
   fo_code                    INT,
   birth_date                 DATE NOT NULL,
   age                        INT,
   mobile_number              VARCHAR (15) NOT NULL,
   email_id                   VARCHAR (70),
   religion                   VARCHAR (50) NOT NULL,
   gender                     VARCHAR (50) NOT NULL,
   maritial_status            VARCHAR (50) NOT NULL,
   spouse_name                VARCHAR (50),
   education                  VARCHAR (50),
   class_id		               INT,
   section		               VARCHAR(50),
   roll_no			            INT,
   occupation                 VARCHAR (50) NOT NULL,
   yearly_income              INT,
   committee_post             INT,
   sub_group_id               INT,
   group_committee_post       INT,
   family_member_male         INT,
   family_member_female       INT,
   family_head                VARCHAR (1),
   own_residence              VARCHAR (1),
   residence_remarks          VARCHAR (100),
   deposit_account            VARCHAR (50),
   deposit_remarks            VARCHAR (100),
   transaction_type           VARCHAR (50),
   bank_name                  VARCHAR (100),
   bank_branch                VARCHAR (100),
   bank_account               VARCHAR (50),
   mobile_walet_type          VARCHAR (50),
   mobile_walet               VARCHAR (11),
    -- Approved = A, Pending = P, Rejected = R
   authorize_status           VARCHAR (1) NOT NULL DEFAULT 'P',
   authorized_by              VARCHAR (50),
   authorized_at              DATE,
   created_by                 VARCHAR (50) NOT NULL,
   created_at                 TIMESTAMPTZ NOT NULL DEFAULT NOW(),
   updated_by                 VARCHAR (50),
   updated_at                 TIMESTAMPTZ,
   FOREIGN KEY (doptor_id)    REFERENCES master.doptor_info (id),
   FOREIGN KEY (office_id)    REFERENCES master.office_info (id),
   FOREIGN KEY (project_id)   REFERENCES master.project_info (id),
   FOREIGN KEY (samity_id)    REFERENCES samity.samity_info (id)
);

COMMENT ON COLUMN samity.customer_info.authorize_status IS
   'Approved = A, Pending = P, Rejected = R';


CREATE TABLE samity.guardian_info(
   id                  SERIAL PRIMARY KEY NOT NULL,
   ref_no              INT NOT NULL,
   guardian_name       VARCHAR(200),
   occupation          INT,
   relation            INT,
   is_active           BOOLEAN NOT NULL DEFAULT TRUE,
   created_by          VARCHAR(50) NOT NULL,
   created_at          TIMESTAMPTZ NOT NULL  DEFAULT NOW(),                                                          
   updated_by          VARCHAR(50),
   updated_at          TIMESTAMPTZ
);


CREATE TABLE samity.institution_info(
   id               	      SERIAL PRIMARY KEY NOT NULL,
   institute_name          TEXT ,
   institute_address       TEXT,
   institute_code	         VARCHAR(10),
   samity_id               INT,
   is_active        	      BOOLEAN NOT NULL DEFAULT TRUE,
   created_by       	      VARCHAR(50) NOT NULL,
   created_at       	      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
   updated_by       	      VARCHAR(50),
   updated_at       	      TIMESTAMPTZ,
);


CREATE TABLE samity.nominee_info(
   id                   SERIAL PRIMARY KEY NOT NULL,
   customer_id          INT,
   nominee_name         VARCHAR(200),
   father_name          VARCHAR(200),
   mother_name          VARCHAR(200),
   dob                  DATE,
   relation             INT,
   percentage           INT,
   created_by       	   VARCHAR(50),
   created_at       	   TIMESTAMPTZ DEFAULT NOW(),
   updated_by       	   VARCHAR(50),
   updated_at           TIMESTAMPTZ
)