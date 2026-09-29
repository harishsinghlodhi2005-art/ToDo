# 📝 TaskQuest — Full-Stack To-Do Application

> A modern task management application built with Node.js, Express.js, MongoDB, and JavaScript.

## 🌐 Live Demo

🚀 https://to-do-one-ivory.vercel.app/

## 📌 About

TaskQuest is a full-stack To-Do application that allows users to create, manage, update, complete, and delete tasks.

The application uses a **Node.js and Express.js backend**, **MongoDB database with Mongoose**, and a frontend built with **HTML, CSS, and JavaScript**.

## ✨ Features

* ➕ Create tasks
* ✏️ Edit tasks
* ✅ Mark tasks as completed
* 🗑️ Delete tasks
* 📝 Add task descriptions
* 📅 Set due dates
* 🎯 Set task difficulty
* 🔥 Set task priority
* 🗂️ Organize tasks by category
* 💾 Store tasks in MongoDB
* 🔌 REST API for task operations
* 📱 Responsive user interface
* ⚡ Fast and simple task management

## 🎯 Task Options

Each task can contain:

* **Title**
* **Description**
* **Difficulty**

  * Easy
  * Medium
  * Hard
* **Priority**

  * Low
  * Medium
  * High
* **Category**

  * Study
  * Work
  * Fitness
  * Personal
  * Other
* **Due Date**
* **Completion Status**

## 🛠️ Tech Stack

### Frontend

* HTML5
* CSS3
* JavaScript

### Backend

* Node.js
* Express.js

### Database

* MongoDB
* Mongoose

### Tools & Deployment

* Git
* GitHub
* Vercel
* dotenv

## 🏗️ Project Structure

```text
ToDo/
│
├── models/
│   └── Task.js
│
├── routes/
│   └── taskRoutes.js
│
├── public/
│   ├── HTML files
│   ├── CSS files
│   └── JavaScript files
│
├── server.js
├── package.json
├── package-lock.json
├── .gitignore
└── README.md
```

## 🔌 REST API

| Method | Endpoint         | Description   |
| ------ | ---------------- | ------------- |
| GET    | `/api/tasks`     | Get all tasks |
| POST   | `/api/tasks`     | Create a task |
| PUT    | `/api/tasks/:id` | Update a task |
| DELETE | `/api/tasks/:id` | Delete a task |

## 🚀 Getting Started

### Prerequisites

Make sure you have:

* Node.js installed
* MongoDB / MongoDB Atlas account
* Git installed

### 1. Clone the repository

```bash
git clone https://github.com/harishsinghlodhi2005-art/ToDo.git
```

### 2. Navigate to the project

```bash
cd ToDo
```

### 3. Install dependencies

```bash
npm install
```

### 4. Create `.env`

Create a `.env` file in the root directory:

```env
MONGODB_URI=your_mongodb_connection_string
PORT=3000
```

### 5. Start the server

```bash
npm start
```

The application will be available at:

```text
http://localhost:3000
```

## 💾 Database

MongoDB is used to store task information.

The application uses **Mongoose** to define the task schema and communicate with MongoDB.

Task data includes information such as:

* Title
* Description
* Difficulty
* Priority
* Category
* Due date
* Completion status
* Completion time
* Creation time
* Update time

## 🧠 Key Concepts

This project demonstrates:

* Full-stack web development
* CRUD operations
* REST API development
* Express.js routing
* MongoDB integration
* Mongoose models
* Backend validation
* HTTP methods
* JSON data handling
* Environment variables
* Frontend-backend communication
* Error handling
* Vercel deployment

## 🔮 Future Improvements

* 🔐 User authentication
* 👤 Multiple user accounts
* ☁️ Cloud synchronization
* 🔔 Task reminders
* 📅 Calendar integration
* 🔍 Advanced task search
* 📊 Productivity analytics
* 🏆 Gamification system
* 📱 Progressive Web App support

## 👨‍💻 Author

**Harish Singh**

B.Tech Information Technology
National Institute of Technology, Raipur

## 🔗 Links

🌐 **Live Demo:**
https://to-do-one-ivory.vercel.app/

💻 **GitHub Repository:**
https://github.com/harishsinghlodhi2005-art/ToDo

## ⭐ Support

If you like this project, consider giving the repository a ⭐ on GitHub.

---

### 📝 TaskQuest

**Plan it. Track it. Complete it.**

