import { mkdirSync, readdirSync, readFileSync, rmSync, writeFileSync, utimesSync } from "fs";

const readDir = (dirPath: string): string[] => {
    try {
        const files = readdirSync(dirPath);
        // console.log(`Directory read successfully: ${dirPath}`);
        return files;
    } catch (error) {
        console.error(`Error reading directory ${dirPath}:`, error);
        return [];
    }
}

const makeDir = (dirPath: string) => {
    try {
        mkdirSync(dirPath, { recursive: true });
        // console.log(`Directory created successfully: ${dirPath}`);
    } catch (error) {
        console.error(`Error creating directory ${dirPath}:`, error);
    }
};

const deleteDir = (dirPath: string) => {
    try {
        rmSync(dirPath, { recursive: true, force: true });
        // console.log(`Directory deleted successfully: ${dirPath}`);
    } catch (error) {
        console.error(`Error deleting directory ${dirPath}:`, error);
    }
};

const readFile = (filePath: string): string | null => {
    try {
        const content = readFileSync(filePath, "utf-8");
        // console.log(`File read successfully: ${filePath}`);
        return content;
    } catch (error) {
        console.error(`Error reading file ${filePath}:`, error);
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
                console.error(`Error setting modification time for file ${filePath}:`, error);
            }
        }
        // console.log(`File written successfully: ${filePath}`);
    } catch (error) {
        console.error(`Error writing file ${filePath}:`, error);
    }
};

export { makeDir, deleteDir, readFile, writeFile, readDir };
