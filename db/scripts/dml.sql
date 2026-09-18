USE EZPoll;

INSERT INTO Question (QuestionGUID, Description) VALUES ('57d1d126-ae22-44c8-8459-2d72b745ef37', 'EMPTY');
INSERT INTO Answer (AnswerGUID, Description, QuestionGUID) VALUES ('1ba2793b-e245-4938-ac38-7b6967773ea5', 'Yes', '57d1d126-ae22-44c8-8459-2d72b745ef37');
-- Placeholder answer referenced by "joined but not yet answered" results (nullGUID() in server/guid.py).
INSERT INTO Answer (AnswerGUID, Description, QuestionGUID) VALUES ('000000000000000000000000000000000000', 'None', '57d1d126-ae22-44c8-8459-2d72b745ef37');

INSERT INTO Question (QuestionGUID, Description) VALUES ('f4206876-64bc-41b4-a54a-114239c88b91', 'Yes/No');
INSERT INTO Answer (AnswerGUID, Description, QuestionGUID) VALUES ('3713bc74-b590-4550-8950-531fb807b0d7', 'Yes', 'f4206876-64bc-41b4-a54a-114239c88b91');
INSERT INTO Answer (AnswerGUID, Description, QuestionGUID) VALUES ('d74a5325-361f-4edb-bacd-a298bb405ea8', 'No', 'f4206876-64bc-41b4-a54a-114239c88b91');

INSERT INTO Question (QuestionGUID, Description) VALUES ('6c79921a-f096-4036-9250-12fec4931e53', 'Yes/No/Maybe');
INSERT INTO Answer (AnswerGUID, Description, QuestionGUID) VALUES ('0906f110-0138-4cd8-adf2-d295e1b7bb4e', 'Yes', '6c79921a-f096-4036-9250-12fec4931e53');
INSERT INTO Answer (AnswerGUID, Description, QuestionGUID) VALUES ('ee8b2fd3-a36b-42c3-ae4a-1413de9da934', 'No', '6c79921a-f096-4036-9250-12fec4931e53');
INSERT INTO Answer (AnswerGUID, Description, QuestionGUID) VALUES ('7cbf3a52-7769-4211-939a-71fd1367714d', 'Maybe', '6c79921a-f096-4036-9250-12fec4931e53');

INSERT INTO Question (QuestionGUID, Description) VALUES ('662657f2-6b85-4ec2-8065-0ab33f0cfc24', 'Star Rating');
INSERT INTO Answer (AnswerGUID, Description, QuestionGUID) VALUES ('b5464e82-f55a-498c-bf6b-325f227a3928', '0', '662657f2-6b85-4ec2-8065-0ab33f0cfc24');
INSERT INTO Answer (AnswerGUID, Description, QuestionGUID) VALUES ('fcfb39af-a07b-4f1f-b0e3-6028a1912a77', '1', '662657f2-6b85-4ec2-8065-0ab33f0cfc24');
INSERT INTO Answer (AnswerGUID, Description, QuestionGUID) VALUES ('7a04ec00-9b9e-494b-8c8a-58a4ceb1de75', '2', '662657f2-6b85-4ec2-8065-0ab33f0cfc24');
INSERT INTO Answer (AnswerGUID, Description, QuestionGUID) VALUES ('427796b5-7c3a-4e58-88d4-4f209b0a372e', '3', '662657f2-6b85-4ec2-8065-0ab33f0cfc24');
INSERT INTO Answer (AnswerGUID, Description, QuestionGUID) VALUES ('8c9cd1f6-a0ad-4dee-b02d-8dad0f9380f6', '4', '662657f2-6b85-4ec2-8065-0ab33f0cfc24');
INSERT INTO Answer (AnswerGUID, Description, QuestionGUID) VALUES ('890308ef-4905-4751-b65b-c2a5601482ea', '5', '662657f2-6b85-4ec2-8065-0ab33f0cfc24');

INSERT INTO Question (QuestionGUID, Description) VALUES ('b6f8c53a-3643-43b9-9c11-a9143cdfd4ef', 'Fibonacci');
INSERT INTO Answer (AnswerGUID, Description, QuestionGUID) VALUES ('bb06a9f4-6306-4bf7-8c50-f063607d7f38', '0', 'b6f8c53a-3643-43b9-9c11-a9143cdfd4ef');
INSERT INTO Answer (AnswerGUID, Description, QuestionGUID) VALUES ('00163717-4de0-4043-9514-7dd02bbf372a', '1', 'b6f8c53a-3643-43b9-9c11-a9143cdfd4ef');
INSERT INTO Answer (AnswerGUID, Description, QuestionGUID) VALUES ('ed2a18cd-d198-4471-a70b-7f540b6f93b2', '2', 'b6f8c53a-3643-43b9-9c11-a9143cdfd4ef');
INSERT INTO Answer (AnswerGUID, Description, QuestionGUID) VALUES ('f71a146f-8d2f-4787-877d-45c1bd4f5731', '3', 'b6f8c53a-3643-43b9-9c11-a9143cdfd4ef');
INSERT INTO Answer (AnswerGUID, Description, QuestionGUID) VALUES ('e918a9f8-07db-474b-972a-fb489302e412', '5', 'b6f8c53a-3643-43b9-9c11-a9143cdfd4ef');
INSERT INTO Answer (AnswerGUID, Description, QuestionGUID) VALUES ('d42ed2f8-fc22-429a-addc-aafc9efa07e3', '8', 'b6f8c53a-3643-43b9-9c11-a9143cdfd4ef');
INSERT INTO Answer (AnswerGUID, Description, QuestionGUID) VALUES ('e117e2e0-8439-47a9-9807-89da4ed83ab4', '13', 'b6f8c53a-3643-43b9-9c11-a9143cdfd4ef');
INSERT INTO Answer (AnswerGUID, Description, QuestionGUID) VALUES ('340268fe-c978-4598-8d95-47678daf7ad6', '100', 'b6f8c53a-3643-43b9-9c11-a9143cdfd4ef');
INSERT INTO Answer (AnswerGUID, Description, QuestionGUID) VALUES ('32560c84-cd40-47e8-8c99-af02db1714c2', 'coffee break', 'b6f8c53a-3643-43b9-9c11-a9143cdfd4ef');

-- Default placeholder session every brand-new user is assigned to before
-- they've joined a real one (see ControllerUser.create_user, which hardcodes
-- this same SessionGUID). QuestionGUID points at the "EMPTY" placeholder
-- question above, since no real question has been asked yet.
INSERT INTO Session (SessionGUID, Description, HostGUID, QuestionGUID, ShowResults) VALUES ('3bb970e8-e8a1-479c-a1e3-0485567a3b33', '', 'c838dea1-df05-4ac8-9013-1df7d5b8a6ff', '57d1d126-ae22-44c8-8459-2d72b745ef37', 0);
