-- Drop schema
DROP SCHEMA IF EXISTS EZPoll;

-- Create schema
CREATE SCHEMA EZPoll;
USE EZPoll;

-- Session Table
CREATE TABLE Session (
    SessionGUID CHAR(36) NOT NULL,
    Description VARCHAR(200) NOT NULL,
    HostGUID CHAR(36) NOT NULL,
    QuestionGUID CHAR(36) NOT NULL,
    ShowResults INT NOT NULL,
    PRIMARY KEY (SessionGUID)
);

-- User Table
CREATE TABLE User (
    UserGUID CHAR(36) NOT NULL,
    Description VARCHAR(200) NOT NULL,
    SessionGUID CHAR(36) NOT NULL,
    PRIMARY KEY (UserGUID)
);

-- Question Table
CREATE TABLE Question (
    QuestionGUID CHAR(36) NOT NULL,
    Description VARCHAR(200) NOT NULL,
    PRIMARY KEY (QuestionGUID)
);


-- Answer Table
CREATE TABLE Answer (
    AnswerGUID CHAR(36) NOT NULL,
    Description VARCHAR(200) NOT NULL,
    QuestionGUID CHAR(36) NOT NULL,
    PRIMARY KEY (AnswerGUID)
);

-- Result Table
CREATE TABLE Result (
    ResultGUID CHAR(36) NOT NULL,
    SessionGUID CHAR(36) NOT NULL,
    QuestionGUID CHAR(36) NOT NULL,
    AnswerGUID CHAR(36) NOT NULL,
    UserGUID CHAR(36) NOT NULL,
    PRIMARY KEY (ResultGUID)
);

-- Foreign Keys
-- ALTER TABLE Session ADD CONSTRAINT FK_Session_User_HostGUID         FOREIGN KEY (HostGUID)     REFERENCES User(UserGUID);
ALTER TABLE Session ADD CONSTRAINT FK_Session_Question_QuestionGUID FOREIGN KEY (QuestionGUID) REFERENCES Question(QuestionGUID);
ALTER TABLE User    ADD CONSTRAINT FK_User_Session_SessionGUID      FOREIGN KEY (SessionGUID)  REFERENCES Session(SessionGUID);
ALTER TABLE Answer  ADD CONSTRAINT FK_Answer_Question_QuestionGUID  FOREIGN KEY (QuestionGUID) REFERENCES Question(QuestionGUID);
ALTER TABLE Result  ADD CONSTRAINT FK_Result_Session_SessionGUID    FOREIGN KEY (SessionGUID)  REFERENCES Session(SessionGUID);
ALTER TABLE Result  ADD CONSTRAINT FK_Result_Question_QuestionGUID  FOREIGN KEY (QuestionGUID) REFERENCES Question(QuestionGUID);
ALTER TABLE Result  ADD CONSTRAINT FK_Result_Answer_AnswerGUID      FOREIGN KEY (AnswerGUID)   REFERENCES Answer(AnswerGUID);
ALTER TABLE Result  ADD CONSTRAINT FK_Result_User_UserGUID          FOREIGN KEY (UserGUID)     REFERENCES User(UserGUID);
