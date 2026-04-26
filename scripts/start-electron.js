const { spawn } = require("child_process");

const electronBinary = require("electron");

const env = { ...process.env };
delete env.ELECTRON_RUN_AS_NODE;

const child = spawn(electronBinary, ["."], {
  stdio: "inherit",
  windowsHide: false,
  env,
});

child.on("error", (error) => {
  console.error("Failed to launch Electron:", error);
  process.exit(1);
});

child.on("exit", (code, signal) => {
  if (code === null) {
    console.error(`Electron exited with signal ${signal ?? "unknown"}.`);
    process.exit(1);
  }

  process.exit(code);
});
