
# Operating Systems Dashboard

A Linux system monitoring dashboard developed as the final project for the **Operating Systems** course at the Federal University of Technology – Paraná (UTFPR), taught by Professor Marco Aurélio Wehrmeister.

The project combines low-level operating system data collection with a web-based interface to visualize system performance and resource usage.

## Overview

The dashboard monitors Linux operating system resources, including:

- CPU usage
- Memory usage
- Running processes
- Input/Output (I/O) activity
- File system information

It uses Python to collect operating system data and React to present the information through an interactive web interface.

## Tech Stack

### Frontend

- React
- JavaScript
- HTML
- CSS

### Backend

- Python
- Flask
- Linux `/proc` filesystem
- Low-level operating system APIs

### Development Tools

- Make
- npm
- Git
- Linux

## Architecture

The project follows a multitasking architecture and the Model-View-Controller (MVC) design pattern.

### Backend

The Python backend collects information from the Linux operating system using the `/proc` filesystem and low-level APIs.

Flask provides the communication layer between system monitoring components and the frontend.

### Frontend

The React application displays system information through a web-based dashboard, making operating system metrics easier to monitor and understand.

## Features

### CPU Monitoring

Displays information about processor resource usage.

### Memory Monitoring

Provides information about system memory consumption.

### Process Monitoring

Displays information about running Linux processes.

### I/O Monitoring

Tracks system input/output activity.

### File System Monitoring

Provides information about Linux file system resources.

## Requirements

Before running the project, install:

- Python 3.x
- pip
- Node.js
- npm (or yarn)
- Make

The application is designed for Linux environments because its monitoring features rely on Linux system interfaces.

## Getting Started

### 1. Clone the Repository

```bash
git clone https://github.com/mejuloli/so-dashboard.git
cd so-dashboard
```

### 2. Install Dependencies

Install frontend and backend dependencies:

```bash
make setup
```

### 3. Start the Backend

Open a terminal and run:

```bash
make run_backend
```

This starts the Flask backend.

### 4. Start the Frontend

Open another terminal and run:

```bash
make run_frontend
```

This starts the React application.

### 5. Access the Dashboard

Open your browser:

http://localhost:3000

## Additional Commands

### Clean the Project

Remove installed dependencies and temporary files:

```bash
make clean
```

### Display Available Commands

```bash
make help
```

For additional options and implementation details, refer to the repository's `Makefile`.

## Key Concepts

This project explores:

- Operating systems fundamentals
- Linux process and resource monitoring
- System-level data collection
- Multitasking architecture
- Model-View-Controller (MVC)
- Python backend development
- React frontend development
- Frontend/backend integration
- System performance visualization

## Academic Context

**Institution:** Federal University of Technology – Paraná (UTFPR)

**Course:** Operating Systems

**Professor:** Marco Aurélio Wehrmeister

**Project type:** Academic final project

## Purpose

The dashboard was developed to connect theoretical operating systems concepts with practical software development.

By combining Linux system monitoring, Python, Flask, and React, the project demonstrates how low-level operating system information can be collected and transformed into an accessible web interface.
