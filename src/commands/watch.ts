import { Command } from "commander";
import { io } from "socket.io-client";
import { readDir, readFile } from "../utils/file";
import { logger, c } from "../utils/logger";
import chokidar from "chokidar";
import FrappeClient from "../utils/frappeClient";
import path from "node:path";
import { pull } from "./pull";
import { PushQueue } from "../queues/PushQueue";
import { PullQueue } from "../queues/PullQueue";
import { addBlockData } from "../services/addBlockData";

const CONFIG_FILE = "config.json";

const watchLocalChanges = (client: FrappeClient, debounceDelay: number) => {
    const WATCH_PATHS = ["pages", "components", "globals"];

    const pushQueueForPages = new PushQueue(client, "Page", debounceDelay);
    const pushQueueForComponents = new PushQueue(
        client,
        "Component",
        debounceDelay,
    );
    const pushQueueForGlobal = new PushQueue(client, "Global", debounceDelay);

    const watcher = chokidar.watch(WATCH_PATHS, {
        persistent: true,
        ignoreInitial: true, // don't fire for existing files on startup
        ignored: [
            /(^|[\/\\])\../, // ignore dotfiles
            /\.log$/i,
            /\.json$/i,
            /\.tmp$/i,
            /\.DS_Store/,
        ],
        awaitWriteFinish: {
            stabilityThreshold: 200, // wait 200ms after last change before firing
            pollInterval: 100,
        },
    });

    const abs = (filePath: string) => path.resolve(filePath);

    watcher
        .on("add", (p) => logger.info(`[ADD]    ${abs(p)}`))
        .on("unlink", (p) => logger.info(`[DELETE] ${abs(p)}`))
        .on("addDir", (p) => logger.info(`[MKDIR]  ${abs(p)}`))
        .on("unlinkDir", (p) => logger.info(`[RMDIR]  ${abs(p)}`))
        .on("error", (e) => logger.error(`[ERROR]  ${e}`))
        .on("ready", () =>
            logger.info(
                `Watching: ${WATCH_PATHS.map((p) => path.resolve(p)).join(", ")}\n`,
            ),
        )
        .on("change", async (p) => {
            logger.info(`[CHANGE] ${p}`);

            const pwd = process.cwd();
            const isChangeInPages = p.startsWith("pages/");
            const isChangeInComponents = p.startsWith("components/");
            const isChangeInGlobals = p.startsWith("globals/");

            // Only process changes to files within the pages directory
            if (isChangeInPages) {
                logger.info(`Page: Change detected in ${p}.`);
                const pageDir = path.resolve(
                    `${pwd}/${p.match(/^(pages\/[^\/]+\/)/)![0]}`,
                );

                if (pageDir) {
                    console.log(`Queuing page for push: ${pageDir}`, p);
                    pushQueueForPages.add(pageDir, p);
                }
                return;
            }

            if (isChangeInComponents) {
                logger.info(`Component: Change detected in ${p}.`);
                const componentDir = path.resolve(
                    `${pwd}/${p.match(/^(components\/[^\/]+\/)/)![0]}`,
                );

                if (componentDir) {
                    console.log(
                        `Queuing component for push: ${componentDir}`,
                        p,
                    );
                    pushQueueForComponents.add(componentDir, p);
                }
                return;
            }
        });
};

const watchRemoteChanges = (
    config: any,
    client: FrappeClient,
    debounceDelay: number,
) => {
    const pullQueueForPages = new PullQueue(client, "Page", debounceDelay);
    const pullQueueForComponents = new PullQueue(
        client,
        "Component",
        debounceDelay,
    );
    const pullQueueForGlobals = new PullQueue(client, "Global", debounceDelay);

    let url;
    let urlObject = new URL(config.siteUrl);
    let secure = urlObject.protocol === "https:";
    if (config.socketioPort) {
        urlObject.port = config.socketioPort;
    }
    url = `${urlObject.toString()}${config.siteName}`;
    logger.info(`Connecting to Socket.IO server at ${url}...`);

    const socket = io(url, {
        withCredentials: true,
        secure: secure,
        extraHeaders: {
            origin: config.siteUrl,
            Authorization: `token ${config.authToken}`,
        },
    });
    socket.on("connect", async () => {
        logger.info(`[CONNECTED] Socket ID: ${c.bold}${socket.id}${c.reset}`);
        global.socketId = socket.id!;
        await pull(client);
        socket?.emit("doctype_subscribe", "Builder Page");
        socket?.emit("doctype_subscribe", "Builder Component");
        socket?.emit("request:block_data");
    });

    socket.on("disconnect", (reason) => {
        logger.error(`[DISCONNECTED] ${reason}`);
    });

    socket.on("connect_error", (err) => {
        logger.error(`[CONNECTION ERROR] ${err.message}`);
    });

    socket.on("error", (err) => {
        logger.error(`[SOCKET ERROR] ${err}`);
    });

    socket.on("list_update", (document) => {
        console.log("Received list_update for document:", document);
        logger.info(`[LIST UPDATE] ${c.bold}${document.name}${c.reset}`);
        if (document.doctype === "Builder Page") {
            pullQueueForPages.add(document);
        } else if (document.doctype === "Builder Component") {
            pullQueueForComponents.add(document);
        } else {
            logger.warn(
                `Received list_update for unhandled doctype: ${document.doctype}`,
            );
        }
    });

    socket.on("block_data_update", (data) => {
        logger.info(`Received block_data_update for page ID: ${data.pageId}`); // Log the page ID
        const pwd = process.cwd();
        const allEntries = readDir(`${pwd}/pages`);
        const potentialDirs = allEntries.filter((entry) =>
            entry.endsWith(`_${data.pageId}`),
        );
        if (potentialDirs.length > 0) {
            addBlockData(`${pwd}/pages/${potentialDirs[0]}`, data.blockDataMap);
        }
        logger.info(`Block data update processed for page ID: ${data.pageId}`); // Log after processing
    });
};

export const watchCommand = new Command("watch")
    .description(
        "Watch for local and server changes, sync updates in real time, and manage Git merges automatically.",
    )
    .option(
        "--debounce <ms>",
        "Debounce delay in milliseconds for processing changes",
        "100",
    )
    .option("--only-local", "Watch only local file changes and sync to server")
    .option("--only-remote", "Watch only remote changes and sync to local")
    .action(async (options) => {
        logger.info("Starting watch mode...");
        const config = readFile(CONFIG_FILE);
        if (!config) {
            logger.error(
                "No configuration found. Please run the init command first.",
            );
            return;
        }

        const { siteUrl, authToken, socketioPort, siteName } =
            JSON.parse(config);

        const client = new FrappeClient(siteUrl, authToken);
        client.testConnection().then((isConnected) => {
            if (!isConnected) {
                logger.error(
                    "Failed to connect to the site. Please check your configuration and try again.",
                );
                return;
            }
            logger.info(
                "Connection to site successful. Initializing watchers...",
            );
        });
        if (!options.onlyLocal) {
            // sync remote changes to local before starting to watch for changes
            watchRemoteChanges(
                { siteUrl, authToken, socketioPort, siteName },
                client,
                parseInt(options.debounce),
            );
        }
        if (!options.onlyRemote) {
            watchLocalChanges(client, parseInt(options.debounce));
        }
    });
