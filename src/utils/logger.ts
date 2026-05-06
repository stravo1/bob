import { dirname } from "path";
import { appendFile, makeDir } from "./file";

const c = {
    green: "\x1b[32m",
    red: "\x1b[31m",
    yellow: "\x1b[33m",
    blue: "\x1b[34m",
    bold: "\x1b[1m",
    reset: "\x1b[0m",
};

const LOG_FILE = "app.log";

// Ensure logs directory exists
const ensureLogDir = () => {
    makeDir(dirname(LOG_FILE));
};

const writeToFile = (message: string) => {
    ensureLogDir();
    appendFile(LOG_FILE, message + "\n");
};

const formatMessage = (level: string, message: string): string => {
    const timestamp = new Date().toISOString();
    return `[${timestamp}] [${level}] ${message}`;
};

const logger = {
    info: (message: string) => {
        const formatted = formatMessage("INFO", message);
        const consoleOutput = `${c.green}${formatted}${c.reset}`;
        console.log(consoleOutput);
        writeToFile(formatted);
    },

    error: (message: string, error?: any) => {
        const errorMsg = error ? `${message} ${error}` : message;
        const formatted = formatMessage("ERROR", errorMsg);
        const consoleOutput = `${c.red}${formatted}${c.reset}`;
        console.error(consoleOutput);
        writeToFile(formatted);
    },

    warn: (message: string) => {
        const formatted = formatMessage("WARN", message);
        const consoleOutput = `${c.yellow}${formatted}${c.reset}`;
        console.warn(consoleOutput);
        writeToFile(formatted);
    },

    debug: (message: string) => {
        const formatted = formatMessage("DEBUG", message);
        const consoleOutput = `${c.blue}${formatted}${c.reset}`;
        console.log(consoleOutput);
        writeToFile(formatted);
    },
};

// Legacy function for backward compatibility
const log = (type: "response" | "error", message: string) => {
    if (type === "response") {
        logger.info(message);
    } else if (type === "error") {
        logger.error(message);
    }
};

export { logger, log, c };
