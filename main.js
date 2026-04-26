const { app, BrowserWindow } = require("electron");
const { spawn } = require("child_process");
const fs = require("fs");
const path = require("path");
const waitOn = require("wait-on");

const BACKEND_JAR_NAME = "activity-diary-backend.jar";
const BACKEND_PROFILE = "desktop";
const BACKEND_HEALTHCHECK_URL = "http://127.0.0.1:18080/actuator/health";

let backendProcess = null;

function getFrontendIndexPath() {
  return app.isPackaged
    ? path.join(__dirname, "frontend", "index.html")
    : path.join(__dirname, "..", "activity-diary-frontend", "dist", "index.html");
}

function getBackendDir() {
  return app.isPackaged
    ? path.join(process.resourcesPath, "backend")
    : path.join(__dirname, "..", "activity-diary-backend");
}

function getJarPath() {
  return app.isPackaged
    ? path.join(process.resourcesPath, "backend", BACKEND_JAR_NAME)
    : path.join(
        __dirname,
        "..",
        "activity-diary-backend",
        "build",
        "libs",
        BACKEND_JAR_NAME
      );
}

function getBundledJavaPath() {
  const javaExecutable = process.platform === "win32" ? "java.exe" : "java";
  const javaBaseDir = app.isPackaged
    ? path.join(process.resourcesPath, "java")
    : path.join(__dirname, "resources", "java");

  return path.join(javaBaseDir, "bin", javaExecutable);
}

function getJavaCommand() {
  const bundledJavaPath = getBundledJavaPath();

  if (fs.existsSync(bundledJavaPath)) {
    return bundledJavaPath;
  }

  if (app.isPackaged) {
    throw new Error(`Bundled Java runtime not found at ${bundledJavaPath}.`);
  }

  return "java";
}

function getJavaHome(javaCommand) {
  return javaCommand === "java"
    ? process.env.JAVA_HOME
    : path.dirname(path.dirname(javaCommand));
}

function getAppDataPaths() {
  const userDataDir = app.getPath("userData");
  const dbDir = path.join(userDataDir, "data");
  const storageDir = path.join(userDataDir, "storage");
  const dbPath = path.join(dbDir, "app.db");

  fs.mkdirSync(dbDir, { recursive: true });
  fs.mkdirSync(storageDir, { recursive: true });

  return {
    userDataDir,
    dbDir,
    storageDir,
    dbPath,
  };
}

function toSqliteJdbcPath(filePath) {
  return filePath.replace(/\\/g, "/");
}

function stopBackend() {
  if (backendProcess) {
    backendProcess.kill();
    backendProcess = null;
  }
}

async function waitForBackendReady(childProcess) {
  let handleProcessError;
  let handleProcessExit;

  try {
    await Promise.race([
      waitOn({
        resources: [BACKEND_HEALTHCHECK_URL],
        timeout: 30000,
        interval: 500,
      }),
      new Promise((_, reject) => {
        handleProcessError = (error) => {
          reject(
            new Error(
              `Failed to launch backend with ${childProcess.spawnfile}: ${error.message}`
            )
          );
        };

        handleProcessExit = (code, signal) => {
          reject(
            new Error(
              `Backend process exited before becoming ready (code=${code}, signal=${signal ?? "none"}).`
            )
          );
        };

        childProcess.once("error", handleProcessError);
        childProcess.once("exit", handleProcessExit);
      }),
    ]);
  } finally {
    if (handleProcessError) {
      childProcess.off("error", handleProcessError);
    }

    if (handleProcessExit) {
      childProcess.off("exit", handleProcessExit);
    }
  }
}

function createWindow() {
  const win = new BrowserWindow({
    width: 1400,
    height: 900,
    show: false,
    webPreferences: {
      preload: path.join(__dirname, "preload.js"),
      contextIsolation: true,
      nodeIntegration: false,
    },
  });

  win.setMenuBarVisibility(false);
  win.removeMenu();

  const frontendIndexPath = getFrontendIndexPath();

  if (!app.isPackaged && !fs.existsSync(frontendIndexPath)) {
    throw new Error(`Frontend build not found at ${frontendIndexPath}.`);
  }

  if (!app.isPackaged) {
    win.webContents.openDevTools();
  }

  win.once("ready-to-show", () => {
    win.show();
  });

  win.webContents.on("did-fail-load", (_event, errorCode, errorDescription, validatedURL) => {
    console.error("Frontend failed to load:", {
      errorCode,
      errorDescription,
      validatedURL,
    });
  });

  win.webContents.on("console-message", (_event, level, message, line, sourceId) => {
    console.log("Renderer console:", { level, message, line, sourceId });
  });

  win.webContents.on("render-process-gone", (_event, details) => {
    console.error("Renderer process exited:", details);
  });

  win.loadFile(frontendIndexPath);
}

async function startBackend() {
  const backendDir = getBackendDir();
  const jarPath = getJarPath();
  const javaCommand = getJavaCommand();
  const javaHome = getJavaHome(javaCommand);
  const { dbPath } = getAppDataPaths();

  if (!fs.existsSync(jarPath)) {
    throw new Error(`Backend jar not found at ${jarPath}.`);
  }

  const env = {
    ...process.env,
    APP_DB_PATH: toSqliteJdbcPath(dbPath),
  };

  if (javaHome) {
    env.JAVA_HOME = javaHome;
  }

  console.log("Java command:", javaCommand);
  console.log("Jar path:", jarPath);
  console.log("DB path:", env.APP_DB_PATH);

  backendProcess = spawn(
    javaCommand,
    ["-jar", jarPath, `--spring.profiles.active=${BACKEND_PROFILE}`],
    {
      cwd: backendDir,
      stdio: "ignore",
      detached: false,
      windowsHide: true,
      env,
    }
  );

  await waitForBackendReady(backendProcess);
}

app.whenReady().then(async () => {
  try {
    await startBackend();
    createWindow();
  } catch (error) {
    console.error("Failed to start desktop app:", error);
    stopBackend();
    app.quit();
  }
});

app.on("before-quit", () => {
  stopBackend();
});

app.on("window-all-closed", () => {
  stopBackend();

  if (process.platform !== "darwin") {
    app.quit();
  }
});
