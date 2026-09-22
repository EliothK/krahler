-- Written for Azure SQL. Tests run this same file against H2 in MSSQLServer compatibility mode (see application-test.properties), so it has to stay within syntax both engines accept — no filtered index, in particular, which is how the first real deploy caught a dependency mistake H2-with-ddl-auto never could have.
CREATE TABLE contact_messages (
    id BIGINT IDENTITY(1,1) PRIMARY KEY,
    sender_name NVARCHAR(100) NOT NULL,
    sender_email NVARCHAR(200) NOT NULL,
    message NVARCHAR(2000) NOT NULL,
    created_at DATETIME2 NOT NULL,
    emailed BIT NOT NULL DEFAULT 0
);

-- The table stays small (a portfolio's contact volume), so a plain index over a filtered one is fine.
CREATE INDEX ix_contact_messages_emailed ON contact_messages (emailed);
