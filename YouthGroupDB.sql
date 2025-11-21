DROP DATABASE IF EXISTS youth_group_program;
CREATE DATABASE youth_group_program;

USE youth_group_program;
CREATE TABLE student(
                        Id INT PRIMARY KEY AUTO_INCREMENT,
                        FirstName VARCHAR(50) NOT NULL,
                        LastName VARCHAR(50),
                        Grade ENUM('5th', '6th', '7th', '8th', '9th', '10th', '11th', '12th') NOT NULL);

CREATE TABLE parent_guardian(
                                Id INT PRIMARY KEY AUTO_INCREMENT,
                                FirstName VARCHAR(50) NOT NULL,
                                LastName VARCHAR(50),
                                Relationship VARCHAR(50) NOT NULL,
                                Email VARCHAR(50),
                                Phone CHAR(10) NOT NULL);

CREATE TABLE family(
                       StudentID INT NOT NULL,
                       ParentID INT NOT NULL,
                       FOREIGN KEY (StudentID) REFERENCES student(Id),
                       FOREIGN KEY (ParentID) REFERENCES parent_guardian(Id));

CREATE TABLE small_group(
                            Id INT PRIMARY KEY AUTO_INCREMENT,
                            Grade ENUM('5th', '6th', '7th', '8th', '9th', '10th', '11th', '12th') NOT NULL);

CREATE TABLE sign_up(
                        StudentID INT,
                        SmallGroupID INT,
                        SignUpDate DATE,
                        FOREIGN KEY (StudentID) REFERENCES student(Id),
                        FOREIGN KEY (SmallGroupID) REFERENCES small_group(Id));

CREATE TABLE leader(
                       Id INT PRIMARY KEY AUTO_INCREMENT,
                       SmallGroupID INT,
                       FirstName VARCHAR(50) NOT NULL,
                       LastName VARCHAR(50),
                       FOREIGN KEY (SmallGroupID) REFERENCES small_group(Id));

CREATE TABLE weekly_gathering(
                                 Id INT PRIMARY KEY AUTO_INCREMENT,
                                 SmallGroupID INT,
                                 MeetingTime DATETIME,
                                 Notes VARCHAR(255),
                                 FOREIGN KEY (SmallGroupID) REFERENCES small_group(Id));

CREATE TABLE weekly_attendance(
                                  StudentID INT,
                                  WeeklyGatheringID INT,
                                  FOREIGN KEY (StudentID) REFERENCES student(Id),
                                  FOREIGN KEY (WeeklyGatheringID) REFERENCES weekly_gathering(Id));

CREATE TABLE event(
                      Id INT PRIMARY KEY AUTO_INCREMENT,
                      Description VARCHAR(255),
                      Address VARCHAR(255) NOT NULL);

CREATE TABLE registration(
                             Id INT PRIMARY KEY AUTO_INCREMENT,
                             StudentID INT NOT NULL,
                             EventID INT NOT NULL,
                             SignUpDate DATE,
                             FOREIGN KEY (StudentID) REFERENCES student(Id),
                             FOREIGN KEY (EventID) REFERENCES event(Id));

CREATE TABLE check_in(
                         Id INT PRIMARY KEY AUTO_INCREMENT,
                         RegistrationID INT,
                         CheckedIN BOOLEAN NOT NULL DEFAULT FALSE,
                         TimeIn DATETIME,
                         FOREIGN KEY (RegistrationID) REFERENCES registration(Id));

CREATE TABLE volunteer(
                          Id INT PRIMARY KEY AUTO_INCREMENT,
                          FirstName VARCHAR(50) NOT NULL,
                          LastName VARCHAR(50),
                          Email VARCHAR(50),
                          Phone CHAR(10) NOT NULL);

CREATE TABLE volunteer_log(
                              VolunteerID INT,
                              EventID INT,
                              StudentID INT,
                              FOREIGN KEY (StudentID) REFERENCES student(Id),
                              FOREIGN KEY (VolunteerID) REFERENCES volunteer(Id),
                              FOREIGN KEY (EventID) REFERENCES event(Id));