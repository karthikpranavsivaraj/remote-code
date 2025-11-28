
# Remote Code Collaboration Tool
Welcome to the **Remote Code Collaboration Tool**! This web application enables multiple users to collaborate in real-time on coding projects. Built with modern technologies, this tool is designed to facilitate seamless code editing, execution, and sharing among developers and students.

## Table of Contents

- [Features](#features)
- [Technologies Used](#technologies-used)
- [Getting Started](#getting-started)
- [Usage](#usage)
- [Contributing](#contributing)
- [Acknowledgments](#acknowledgments)

## Features

- **Real-Time Collaboration**: Multiple users can join a room and edit code simultaneously.
- **Syntax Highlighting**: Support for various programming languages using CodeMirror.
- **Code Execution**: Execute code snippets and display the output instantly.
- **User Management**: Join rooms using a unique Room ID and username.
- **Member Notifications**: Get notified when users join or leave the room.
- **Chat Feature**: Send and receive real-time messages within a room.
- **Code Save**: Save the current code in the editor to download and revisit later.

## Technologies Used

- **Frontend**: 
  - React
  - CodeMirror
  - React Router
  - Socket.IO

- **Backend**:
  - Node.js
  - Express
  - Socket.IO
  - Judge0 API

## Getting Started

To run this project locally, follow these steps:

1. **Clone the repository**:
   ```bash
   git clone YOUR_GITHUB_REPO_LINK
   cd remote-code-collaboration-tool
   ```

2. **Install dependencies**:
   Navigate to the frontend and backend directories to install required packages:
   ```bash
   # For the frontend
   cd client
   npm install

   # For the backend
   cd server
   npm install
   ```

3. **Set up the backend server**:
   Make sure you have Node.js installed. Start the server by running:
   ```bash
   cd server
   node server.js
   ```

4. **Start the frontend application**:
   Open a new terminal and run:
   ```bash
   cd client
   npm start
   ```

5. **Open your browser**:
   Visit `http://localhost:3000` to access the application.

## Usage

- **Create a Room**: Click on "Create New Room" to generate a unique Room ID.
- **Join a Room**: Enter a Room ID and your username, then click "Join" to enter the coding room.
- **Collaborate**: Start coding! You can see real-time updates as your collaborators make changes.
- **Execute Code**: Use the "Run" button to execute your code and see the output in the terminal.
- **Chat**: Send and receive real-time messages with other users in the room.
- **Save Code**: Use the "Save" button to download the code written in the editor for future reference.

## Contributing

Contributions are welcome! If you want to improve the project, please follow these steps:

1. Fork the repository.
2. Create a new branch (`git checkout -b feature/YourFeature`).
3. Make your changes and commit them (`git commit -m 'Add some feature'`).
4. Push to the branch (`git push origin feature/YourFeature`).
5. Open a pull request.

## Acknowledgments

- [Judge0 API](https://judge0.com/) for providing code execution services.
- [React](https://reactjs.org/) for building the user interface.
- [Socket.IO](https://socket.io/) for enabling real-time communication.
- [CodeMirror](https://codemirror.net/) for providing a versatile code editor.

---

Thank you for checking out the **Remote Code Collaboration Tool**! Feel free to reach out if you have any questions or suggestions. Happy coding!

---