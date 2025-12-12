-- Youth Group Program Database Schema
-- This is the main MySQL database that stores all structured data
-- Handles students, parents, events, attendance, volunteers, small groups

DROP DATABASE IF EXISTS youth_group_program;
CREATE DATABASE youth_group_program;

USE youth_group_program;

-- Core entity: students in the youth group program
CREATE TABLE student(
                        Id INT PRIMARY KEY AUTO_INCREMENT,
                        FirstName VARCHAR(50) NOT NULL,
                        LastName VARCHAR(50),
                        Grade ENUM('5th', '6th', '7th', '8th', '9th', '10th', '11th', '12th') NOT NULL);

-- Parents and guardians with contact info
CREATE TABLE parent_guardian(
                                Id INT PRIMARY KEY AUTO_INCREMENT,
                                FirstName VARCHAR(50) NOT NULL,
                                LastName VARCHAR(50),
                                Relationship VARCHAR(50) NOT NULL,  -- Mom, Dad, Guardian, etc.
                                Email VARCHAR(50),
                                Phone CHAR(10) NOT NULL);

-- Junction table linking students to their parents (many-to-many)
CREATE TABLE family(
                       StudentID INT NOT NULL,
                       ParentID INT NOT NULL,
                       FOREIGN KEY (StudentID) REFERENCES student(Id),
                       FOREIGN KEY (ParentID) REFERENCES parent_guardian(Id));

-- Small groups organized by grade level
CREATE TABLE small_group(
                            Id INT PRIMARY KEY AUTO_INCREMENT,
                            Grade ENUM('5th', '6th', '7th', '8th', '9th', '10th', '11th', '12th') NOT NULL);

-- Students enrolled in small groups (junction table)
CREATE TABLE sign_up(
                        StudentID INT,
                        SmallGroupID INT,
                        SignUpDate DATE,
                        FOREIGN KEY (StudentID) REFERENCES student(Id),
                        FOREIGN KEY (SmallGroupID) REFERENCES small_group(Id));

-- Small group leaders assigned to groups
CREATE TABLE leader(
                       Id INT PRIMARY KEY AUTO_INCREMENT,
                       SmallGroupID INT,
                       FirstName VARCHAR(50) NOT NULL,
                       LastName VARCHAR(50),
                       FOREIGN KEY (SmallGroupID) REFERENCES small_group(Id));

-- Weekly small group meetings
CREATE TABLE weekly_gathering(
                                 Id INT PRIMARY KEY AUTO_INCREMENT,
                                 SmallGroupID INT,
                                 MeetingTime DATETIME,
                                 Notes VARCHAR(255),
                                 FOREIGN KEY (SmallGroupID) REFERENCES small_group(Id));

-- Attendance tracking for weekly small group meetings
CREATE TABLE weekly_attendance(
                                  StudentID INT,
                                  WeeklyGatheringID INT,
                                  FOREIGN KEY (StudentID) REFERENCES student(Id),
                                  FOREIGN KEY (WeeklyGatheringID) REFERENCES weekly_gathering(Id));

-- Event types (e.g., "Youth Night", "Service Project", "Retreat")
-- MySQL stores basic info, MongoDB stores flexible custom field schemas
CREATE TABLE event_type (
                            Id INT AUTO_INCREMENT PRIMARY KEY,
                            Name VARCHAR(255) NOT NULL,
                            Description TEXT NULL);

-- Large events (concerts, retreats, outreach, etc.)
-- Custom field values for each event are stored in MongoDB
CREATE TABLE event(
                      Id INT PRIMARY KEY AUTO_INCREMENT,
                      Description VARCHAR(255),
                      Address VARCHAR(255) NOT NULL,
                      TypeID INT,  -- links to event_type for schema info
                      FOREIGN KEY (TypeID) REFERENCES event_type(Id));

-- Students registered for events (pre-registration, not actual attendance)
CREATE TABLE registration(
                             Id INT PRIMARY KEY AUTO_INCREMENT,
                             StudentID INT NOT NULL,
                             EventID INT NOT NULL,
                             SignUpDate DATE,
                             FOREIGN KEY (StudentID) REFERENCES student(Id),
                             FOREIGN KEY (EventID) REFERENCES event(Id));

-- Legacy check-in table (being replaced by Redis + event_attendance)
CREATE TABLE check_in(
                         Id INT PRIMARY KEY AUTO_INCREMENT,
                         RegistrationID INT,
                         CheckedIN BOOLEAN NOT NULL DEFAULT FALSE,
                         TimeIn DATETIME,
                         FOREIGN KEY (RegistrationID) REFERENCES registration(Id));

-- Volunteers helping at events
CREATE TABLE volunteer(
                          Id INT PRIMARY KEY AUTO_INCREMENT,
                          FirstName VARCHAR(50) NOT NULL,
                          LastName VARCHAR(50),
                          Email VARCHAR(50),
                          Phone CHAR(10) NOT NULL);

-- Tracks which volunteers worked which events (and who they helped)
CREATE TABLE volunteer_log(
                              VolunteerID INT,
                              EventID INT,
                              StudentID INT,  -- optional: specific student the volunteer helped
                              FOREIGN KEY (StudentID) REFERENCES student(Id),
                              FOREIGN KEY (VolunteerID) REFERENCES volunteer(Id),
                              FOREIGN KEY (EventID) REFERENCES event(Id));

-- FINAL attendance records (migrated from Redis after event ends)
-- This is permanent storage of who actually attended events
CREATE TABLE event_attendance(
                                  Id INT PRIMARY KEY AUTO_INCREMENT,
                                  EventID INT NOT NULL,
                                  StudentID INT NOT NULL,
                                  CheckInTime DATETIME,  -- when they arrived
                                  CheckOutTime DATETIME,  -- when they left (NULL if still there)
                                  FOREIGN KEY (EventID) REFERENCES event(Id),
                                  FOREIGN KEY (StudentID) REFERENCES student(Id));





