-- Written for Azure SQL. Tests run against H2 with Hibernate's own ddl-auto instead of this file (see ContactMessage and application-test.properties):
-- the two schemas are meant to match, but a portfolio's test suite doesn't carry the weight of running Flyway against two database engines to prove it.
CREATE TABLE contact_messages (
    id BIGINT IDENTITY(1,1) PRIMARY KEY,
    sender_name NVARCHAR(100) NOT NULL,
    sender_email NVARCHAR(200) NOT NULL,
    message NVARCHAR(2000) NOT NULL,
    created_at DATETIME2 NOT NULL,
    emailed BIT NOT NULL DEFAULT 0
);

CREATE INDEX ix_contact_messages_emailed ON contact_messages (emailed) WHERE emailed = 0;
