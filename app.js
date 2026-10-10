const fileSystem = require("fs");
const path = require("path");
const readline = require("readline");
const { spawn } = require("child_process");

/* Interface for reading input */
const terminal = readline.createInterface({
  input: process.stdin,
  output: process.stdout,
});

let errors = [];

/* Check if running as Administrator on Windows */
const isAdmin = async () => {
  if (process.platform !== "win32") {
    return true; // Non-Windows platforms don't need admin check
  }

  return new Promise((resolve) => {
    // PowerShell command to check admin rights
    const psCommand = `if([System.Security.Principal.WindowsIdentity]::GetCurrent().Owner -match 'S-1-5-32-544') { 'admin' } else { 'not_admin' }`;

    try {
      const child = spawn("powershell.exe", ["-Command", psCommand], {
        stdio: ["pipe", "pipe", "pipe"],
      });

      let stdout = "";
      let stderr = "";

      child.stdout.on("data", (data) => {
        stdout += data.toString().trim();
      });

      child.stderr.on("data", (data) => {
        stderr += data.toString().trim();
      });

      child.on("close", (code) => {
        resolve(stdout === "admin");
      });

      child.on("error", () => {
        resolve(false);
      });
    } catch (err) {
      resolve(false);
    }
  });
};

/* Restart the current process with Administrator privileges */
const restartAsAdmin = () => {
  if (process.platform !== "win32") {
    console.log("\nAdministrator privileges are only required on Windows.");
    return false;
  }

  console.log("\nRestarting with Administrator privileges...");

  try {
    // Get the path to the current script or executable
    const executablePath = process.execPath;
    const scriptPath = process.argv[1] || "";

    // Build arguments - pass along any existing arguments
    const args = process.argv.slice(1);

    // Spawn PowerShell with RunAs Administrator
    const child = spawn(
      "powershell.exe",
      [
        "-Command",
        `Start-Process -FilePath "${executablePath}" -ArgumentList "${args.join(" ")}" -Verb RunAs`,
      ],
      {
        stdio: "inherit",
        shell: true,
      },
    );

    child.on("error", (err) => {
      console.error(
        "\nFailed to restart with Administrator privileges:",
        err.message,
      );
    });

    // Exit the current process after spawning the elevated process
    process.exit(0);
    return true;
  } catch (err) {
    console.error(
      "\nFailed to restart with Administrator privileges:",
      err.message,
    );
    return false;
  }
};

/* Exit with error message if not running as Administrator */
const requireAdmin = async () => {
  if (process.platform !== "win32") {
    return true; // Non-Windows platforms don't need admin check
  }

  const adminStatus = await isAdmin();

  if (!adminStatus) {
    console.log("\n❌ ERROR: This tool requires Administrator privileges!");
    console.log(
      "\nPlease right-click the executable and select 'Run as administrator'.",
    );
    console.log("\nExiting...");
    process.exit(1);
  }

  return true;
};

/* Import Files to Keep */
const essentialFiles = require("./essentialFiles");

const cleanMods = (filePath) => {
  if (fileSystem.existsSync(filePath)) {
    /* Ensure that software files and generated PDFs are not deleted */
    let files = fileSystem.readdirSync(filePath).filter((file) => {
      return (
        !essentialFiles.includes(file) &&
        file != "app.js" &&
        file != "essentialFiles.js"
      ); // Dirty solution for the weird filesystem in nexe
    });

    if (files.length < 1) {
      console.log("\nNo mod files found\n");
      return;
    }

    let newPaths = [];

    files.forEach((file, index) => {
      let newPath = path.join(filePath, "/modstore/", file);
      newPaths.push(newPath);
      files[index] = path.join(filePath, file);
    });

    if (!fileSystem.existsSync(path.join(filePath, "/modstore/"))) {
      fileSystem.mkdirSync(path.join(filePath, "/modstore/"));
    }

    files.forEach((file, index) => {
      try {
        fileSystem.renameSync(file, newPaths[index]);
      } catch (err) {
        console.error(`\nAn error occured when trying to move\n${file}\n`);
        console.error(err);
        console.log(`\n`);
        errors.push(err);
      }
    });
  }

  if (errors.length === 0) {
    finishClean();
  } else {
    console.log(
      `Some files could not be moved, please check the errors above.`,
    );
    console.log(`Please try the following:`);
    console.log(
      `- Ensure GTA V, Rockstar Launcher and Mod Managers are quit completely`,
    );
    console.log(`- Run "gta5cleaner" as an Adminstrator`);
    console.log(`- Move the files above into the modstore folder yourself`);
  }
};

const restoreMods = (filePath) => {
  filePathMods = path.join(filePath, "/modstore/");

  if (fileSystem.existsSync(filePathMods)) {
    // Get the current executable name to skip restoring it
    const executableName = path.basename(process.execPath);

    let files = fileSystem.readdirSync(filePathMods).filter((file) => {
      // Skip the cleaner executable itself (can't rename a running file)
      return (
        file !== executableName &&
        file !== "app.js" &&
        file !== "essentialFiles.js" &&
        !essentialFiles.includes(file)
      );
    });

    let newPaths = [];

    files.forEach((file, index) => {
      let newPath = path.join(filePath, file);
      newPaths.push(newPath);
      files[index] = path.join(filePathMods, file);
    });

    files.forEach((file, index) => {
      try {
        fileSystem.renameSync(file, newPaths[index]);
      } catch (err) {
        console.error(`\nAn error occured when trying to restore\n${file}\n`);
        console.error(err);
        console.log(`\n`);
        errors.push(err);
      }
    });

    if (errors.length === 0) {
      console.log("\nRestored Mods to GTA V!");
      // Use rmSync with recursive and force to delete folder and any leftover files
      fileSystem.rmSync(filePathMods, { recursive: true, force: true });
    } else {
      console.log(
        `Some files could not be restored, please check the errors above.`,
      );
      console.log(`Please try the following:`);
      console.log(`- Ensure that GTA V is quit completely`);
      console.log(`- Run "gta5cleaner" as an Adminstrator`);
      console.log(
        `- Copy the contents of the modstore folder into your GTA V main directory`,
      );
    }
  } else {
    console.log("Unable to restore mods, modstore folder does not exist!");
  }
};

const isValidGTA5Folder = (filePath) => {
  const directoryFiles = fileSystem.readdirSync(filePath);
  const required = ["GTA5.exe", "GTA5_Enhanced.exe"];

  /* Require at least one of the required files for a valid directory */
  for (const file of required) {
    if (directoryFiles.includes(file)) {
      return true;
    }
  }
  return false;
};

const finishClean = () => {
  console.log("\nMoved mods to modstore folder. You can now play Online.");
  console.log(
    "\nTo be extra safe, you should verify the integrity of your game files:\n",
  );
  console.log(
    `- Steam: https://help.steampowered.com/en/faqs/view/0C48-FCBD-DA71-93EB`,
  );
  console.log(
    `- Rockstar Launcher: https://support.rockstargames.com/articles/360036000713/`,
  );
  console.log(
    `- Epic Games Launcher: https://www.epicgames.com/help/en-US/technical-support-c90/general-support-c91/how-do-i-verify-game-files-in-the-epic-games-launcher-a3638`,
  );
  errors = [];
};

const terminate = () => {
  console.log("\nPress any key to exit");

  process.stdin.setRawMode(true);
  process.stdin.resume();
  process.stdin.on("data", process.exit.bind(process, 0));
};

const main = async () => {
  // Exit if not running as Administrator on Windows
  await requireAdmin();

  console.log("\nGTA V Mod Cleaner");

  const currentDirectory = process.cwd();

  if (isValidGTA5Folder(currentDirectory) === false) {
    console.log(
      `\nPlease place "gta5cleaner.exe" inside your GTA 5 install folder and try again.`,
    );
    return terminate();
  }

  console.log("\n=== GTA V MOD CLEANER ===\n");
  console.log("  1 - Clean mods (for GTA Online)");
  console.log("  2 - Restore mods (for Single Player)");
  terminal.question("\nEnter your choice [1-2]: ", (choice) => {
    terminal.close();

    if (choice === "1") {
      cleanMods(currentDirectory);
    } else if (choice === "2") {
      restoreMods(currentDirectory);
    } else {
      console.log("\nInvalid choice. Please enter 1 or 2.");
    }

    terminate();
  });
};

main();
