-- Create schema
CREATE SCHEMA EZPoll;
USE EZPoll;

-- Session Table
CREATE TABLE Session (
    SessionGUID CHAR(36) NOT NULL,
    Description VARCHAR(200) NOT NULL,
    HostGUID CHAR(36) NOT NULL,
    PRIMARY KEY (SessionGUID),
    FOREIGN KEY (HostGUID) REFERENCES User(UserGUID)
);

-- User Table
CREATE TABLE User (
    UserGUID CHAR(36) NOT NULL,
    Description VARCHAR(200) NOT NULL,
    SessionGUID CHAR(36) NOT NULL,
    PRIMARY KEY (UserGUID),
    FOREIGN KEY (SessionGUID) REFERENCES Session(SessionGUID)
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
    PRIMARY KEY (AnswerGUID),
    FOREIGN KEY (QuestionGUID) REFERENCES Question(QuestionGUID)
);

-- Result Table
CREATE TABLE Result (
    ResultGUID CHAR(36) NOT NULL,
    SessionGUID CHAR(36) NOT NULL,
    QuestionGUID CHAR(36) NOT NULL,
    AnswerGUID CHAR(36) NOT NULL,
    UserGUID CHAR(36) NOT NULL,
    PRIMARY KEY (ResultGUID),
    FOREIGN KEY (SessionGUID) REFERENCES Session(SessionGUID),
    FOREIGN KEY (QuestionGUID) REFERENCES Question(QuestionGUID),
    FOREIGN KEY (AnswerGUID) REFERENCES Answer(AnswerGUID),
    FOREIGN KEY (UserGUID) REFERENCES User(UserGUID)
);
