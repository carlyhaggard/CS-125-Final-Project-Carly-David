# CS-125-Final-Project-Carly-David

**CS-125 Final Project repository for a Youth Group Management System.**  
Created by Carly Haggard & David Melesse.

# TEAM SINGLE
---

## Who is using this?
- Youth pastor/ministry leader uses the system for organization.
- The main team updates information, manages small groups, and handles events.
- Parents and students use the frontend to join small groups and register for events.
- Small group leaders add meeting notes and track their group.

---

## What do they want to do?

### Ministry Leader
- Keep track of students, parents/guardians, leaders, and volunteers.

### Small Group Leaders
- Add meeting notes.
- Track who is in their group and who attends.

### Main Team
- View live event check-ins.
- Track volunteers.

### Parents/Students
- Register for events.
- Join a small group or sign up a student for a group.

---

## What should/shouldn't they be able to do?

### Ministry Leader

#### Should
- Add, edit, and view students, parents, leaders, and volunteers
- Create and manage events
- Register students for events
- Take attendance and monitor check-ins
- Create and manage small groups
- View all group rosters and event rosters

#### Shouldn’t
- Add or remove system admins
- Change past attendance records without leaving a record

---

### Small Group Leaders

#### Should
- Record meeting notes and group updates
- Track attendance for their group
- View their group roster

#### Shouldn’t
- Edit/view personal student information (SSN, etc.)
- Edit events or groups they are not assigned to
- Access private/pastoral notes

---

### Main Team

#### Should
- See live event check-ins
- Track volunteers
- View rosters for events they help manage

#### Shouldn’t
- Edit small group notes
- Delete or change small groups without permission

---

### Parents/Students

#### Should
- Register for events
- Join or sign a student up for a small group
- View their own upcoming events and group info

#### Shouldn’t
- View other students’ information
- Edit small groups or events
- Access leader notes or attendance data

## Running the Server
- Install the dependencies using:
  `pip install -r requirements.txt`
- Create your `.env` file (See the environment variables section below)
- Start the server:
  `python YouthGroupAPI.py`
- Test the API
  - Use Insomnia or a browser to hit an endpoint

## Environment Variables Setup
Create a `.env` file in the root of the project with the following variables: 
```
DB_USER=root
DB_PASSWORD=your_password_here 
DB_HOST=127.0.0.1
DB_NAME=youth_group_program
```

Make sure your `.env` file is **not committed** to Git. It should already be listed in `.gitignore`.