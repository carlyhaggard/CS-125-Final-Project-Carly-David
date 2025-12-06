# Youth Group Management System

This project is a full-stack application designed to help a youth pastor or ministry leader manage students, events, small groups, and volunteers. It features a FastAPI backend and a React frontend.

**Created by Carly Haggard & David Melesse.**

---

## Table of Contents
- [Technology Stack](#technology-stack)
- [Project Setup Guide](#project-setup-guide)
  - [1. Prerequisites](#1-prerequisites)
  - [2. Environment Setup](#2-environment-setup)
  - [3. Running the Application](#3-running-the-application)

---

## Technology Stack

- **Backend**: FastAPI (Python)
- **Frontend**: React (Vite)
- **Databases**:
  - **MySQL**: For core relational data (run via Docker).
  - **MongoDB Atlas**: Cloud-hosted database for semi-structured data.
  - **Redis**: For in-memory data caching (run via Docker).
- **Containerization**: Docker Compose (for database services).

---

## Project Setup Guide

This guide provides the simplest way to get the project running using Docker for the databases.

### 1. Prerequisites

- **Python 3.10+** and a virtual environment tool.
- **Node.js 18+** and npm.
- **Docker** and **Docker Compose**.
- A **MongoDB Atlas** account (a free M0 cluster is sufficient).

### 2. Environment Setup

1.  **Clone the Repository**:
    ```sh
    git clone <your-repository-url>
    cd <your-repository-name>
    ```

2.  **Create and Configure the `.env` File**:
    Create a file named `.env` in the project root. This file holds all your credentials and is safely ignored by Git.

    Copy the following into your `.env` file and **replace all placeholder values**:

    ```env
    # --- MongoDB Configuration ---
    # Get this from your MongoDB Atlas "Connect" -> "Drivers" dialog
    MONGODB_URI="mongodb+srv://<your_user>:<your_password>@<your_cluster_url>"
    MONGODB_NAME="youthgroup"

    # --- MySQL Configuration ---
    # This password will be used to create the MySQL Docker container.
    # Choose a secure password.
    DB_PASSWORD="your_super_secret_mysql_password"
    DB_USER="root"
    DB_HOST="127.0.0.1" # Connect to the database on your local machine
    DB_NAME="youth_group_program"

    # --- Redis Configuration ---
    REDIS_URL="redis://localhost:6379"
    ```

### 3. Running the Application

The application is run in three parts: starting the databases, running the backend, and running the frontend.

#### Part 1: Start the Database Containers

In a new terminal, from the project's root directory, run:
```sh
docker-compose up
```
This command will start the MySQL and Redis containers. The first time you run it, it will also automatically create the `youth_group_program` database and run your SQL scripts.

Leave this terminal running.

#### Part 2: Run the Backend Server

1.  In a second terminal, make sure you are in the project's **root directory**.
2.  Activate your Python virtual environment: `source venv/bin/activate`.
3.  Install dependencies if you haven't already: `pip install -r requirements.txt`.
4.  Start the FastAPI server:
    ```sh
    uvicorn YouthGroupAPI:app --reload
    ```
5.  The API will connect to the Docker databases and run at `http://127.0.0.1:8000`.

#### Part 3: Run the Frontend Server

1.  In a third terminal, navigate to the **`frontend` directory**.
2.  Install dependencies if you haven't already: `npm install`.
3.  Start the Vite development server:
    ```sh
    npm run dev
    ```
4.  The React application will run at `http://localhost:5173`.

Your full application is now running! The backend and frontend are running locally on your machine, and they are connecting to the MySQL and Redis databases that are running inside Docker containers.
