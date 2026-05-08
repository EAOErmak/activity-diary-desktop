# 🖥️ Activity Diary - Desktop

This is the desktop version of the **Activity Diary** application. It is built using **Electron** and acts as a wrapper that bundles the React frontend and the Java backend into a single standalone application.

## 🧐 Context & Architecture

This project brings the Activity Diary experience to the desktop by combining the separate frontend and backend projects:
- **Frontend**: A React-based web application (located in `../activity-diary-frontend`).
- **Backend**: A Java-based service (located in `../activity-diary-backend`).
- **Desktop Wrapper**: This Electron application, which coordinates both parts and provides a native window experience.

When the application runs or builds, it ensures the frontend is built and bundled, and it packages the backend JAR file as an extra resource to be executed alongside the UI.

## 🚀 Getting Started

### Prerequisites

- **Node.js** (Latest LTS recommended)
- **Java JRE/JDK** (Required to run the bundled Java backend)

### Installation

1. Navigate to the desktop directory (if you aren't already there):
   ```bash
   cd activity-diary-desktop
   ```

2. Install the required dependencies:
   ```bash
   npm install
   ```

### Running the Application

To start the application in development mode:

```bash
npm start
```

*Note: This will automatically trigger a build of the frontend project first, as defined in the `prestart` script.*

### Building for Production

To package the application into a distributable installer (e.g., NSIS installer for Windows):

```bash
npm run dist
```

*Note: This will build the frontend and then use `electron-builder` to generate the production executable.*

## 📂 Project Structure

- `main.js` - The main Electron process that creates the window and manages the app lifecycle.
- `preload.js` - The script that bridges the isolated renderer process and the main process.
- `scripts/` - Contains helper scripts, such as `start-electron.js` to manage the startup flow.
- `resources/` - Used for storing additional resources like Java binaries.

---
*Created with ❤️ for personal growth and productivity.*
