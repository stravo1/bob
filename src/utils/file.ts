import { mkdirSync, readdirSync, readFileSync, rmSync, writeFileSync, utimesSync, existsSync as fsExistsSync, statSync as fsStatSync, appendFileSync as fsAppendFileSync } from "fs";
import { logger } from "./logger";

const fileExists = (filePath: string): boolean => {
    try {
        return fsExistsSync(filePath);
    } catch (error) {
        logger.error(`Error checking if file exists ${filePath}:`, error);
        return false;
    }
};

const getFileStats = (filePath: string) => {
    try {
        return fsStatSync(filePath);
    } catch (error) {
        logger.error(`Error getting file stats for ${filePath}:`, error);
        return null;
    }
};

const appendFile = (filePath: string, content: string) => {
    try {
        fsAppendFileSync(filePath, content, "utf-8");
    } catch (error) {
        logger.error(`Error appending to file ${filePath}:`, error);
    }
};

const readDir = (dirPath: string): string[] => {
    try {
        const files = readdirSync(dirPath);
        // console.log(`Directory read successfully: ${dirPath}`);
        return files;
    } catch (error) {
        logger.error(`Error reading directory ${dirPath}:`, error);
        return [];
    }
}

const makeDir = (dirPath: string) => {
    try {
        mkdirSync(dirPath, { recursive: true });
        // console.log(`Directory created successfully: ${dirPath}`);
    } catch (error) {
        logger.error(`Error creating directory ${dirPath}:`, error);
    }
};

const deleteDir = (dirPath: string) => {
    try {
        rmSync(dirPath, { recursive: true, force: true });
        // console.log(`Directory deleted successfully: ${dirPath}`);
    } catch (error) {
        logger.error(`Error deleting directory ${dirPath}:`, error);
    }
};

const readFile = (filePath: string): string | null => {
    try {
        const content = readFileSync(filePath, "utf-8");
        // console.log(`File read successfully: ${filePath}`);
        return content;
    } catch (error) {
        logger.error(`Error reading file ${filePath}:`, error);
        return null;
    }
};

const writeFile = (filePath: string, content: string, mtime?: string) => {
    try {
        writeFileSync(filePath, content, "utf-8");
        if (mtime) {
            const mtimeDate = new Date(mtime);
            try {
                utimesSync(filePath, mtimeDate, mtimeDate);
            } catch (error) {
                logger.error(`Error setting modification time for file ${filePath}:`, error);
            }
        }
        // console.log(`File written successfully: ${filePath}`);
    } catch (error) {
        logger.error(`Error writing file ${filePath}:`, error);
    }
};

export { makeDir, deleteDir, readFile, writeFile, readDir, fileExists, getFileStats, appendFile };
