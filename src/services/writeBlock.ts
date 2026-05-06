import {
    deleteDir,
    makeDir,
    readDir,
    writeFile,
    fileExists,
    getFileStats,
} from "../utils/file";
import { safeFileName } from "../utils/misc";

const writeBlock = async (
    block: Record<string, any>,
    outputDir: string,
    serverMtime?: string,
) => {
    const dirName =
        block.blockId == "root"
            ? `${outputDir}/root`
            : `${outputDir}/${safeFileName(block.blockName || block.element || "unnamed")}_${block.blockId}`;
    const clientScript = block.blockClientScript as string;
    const dataScript = block.blockDataScript as string;

    if (!fileExists(dirName)) {
        makeDir(dirName);
    }

    if (clientScript) {
        const clientScriptPath = `${dirName}/client_script.js`;
        writeFile(clientScriptPath, clientScript, serverMtime);
    }
    if (dataScript) {
        const dataScriptPath = `${dirName}/data_script.py`;
        writeFile(dataScriptPath, dataScript, serverMtime);
    }

    const children = block.children as Record<string, unknown>[];
    if (children && children.length > 0) {
        for (const child of children) {
            await writeBlock(child, dirName, serverMtime);
        }
    }
    // delete blockDirs which are not present in the children list
    // get list of blockDirs in the output directory
    if (((block.children as Record<string, unknown>[]) || []).length > 0) {
        const path = await import("path");
        const blockDirs = readDir(dirName);
        for (const blockDir of blockDirs) {
            // const blockName = blockDir.split("_").slice(-1)[0];
            const fullPath = path.join(dirName, blockDir);
            if (
                !children.some(
                    (child: any) =>
                        safeFileName(
                            `${child.blockName || child.element || "unnamed"}_${child.blockId}`,
                        ) === blockDir,
                ) &&
                getFileStats(fullPath)?.isDirectory()
            ) {
                deleteDir(fullPath);
                console.log(
                    `Deletedd local directory for removed block: ${blockDir}`,
                );
            }
        }
    }

    block.children = block.children
        ? (block.children as Record<string, unknown>[]).map(
              (child) => child.blockId,
          )
        : [];

    delete block.blockClientScript;
    delete block.blockDataScript;

    const blockDataPath = `${dirName}/block.json`;
    writeFile(blockDataPath, JSON.stringify(block, null, 2), serverMtime);
    return dirName;
};

export default writeBlock;
