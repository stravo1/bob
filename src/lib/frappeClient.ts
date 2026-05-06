class FrappeClient {
    siteUrl: string;
    authToken: string;
    hasCliSaveEndpoint: boolean = false;

    constructor(siteUrl: string, authToken: string) {
        this.siteUrl = siteUrl;
        this.authToken = authToken;
        this.testIfCliSaveEndpointExists();
    }

    async testConnection(): Promise<boolean> {
        try {
            const response = await fetch(
                `${this.siteUrl}/api/method/frappe.auth.get_logged_user`,
                {
                    headers: {
                        Authorization: `token ${this.authToken}`,
                    },
                },
            );
            if (!response.ok) {
                console.error(
                    response.status,
                    response.statusText ||
                        "Unknown error occurred while testing connection",
                );
                return false;
            }
            return response.ok;
        } catch (error) {
            console.error("Error occurred while testing connection:", error);
            return false;
        }
    }

    async testIfCliSaveEndpointExists(): Promise<void> {
        try {
            const response = await fetch(
                `${this.siteUrl}/api/method/builder.api.test_save_from_cli`,
                {
                    method: "GET",
                    headers: {
                        "Content-Type": "application/json",
                        Authorization: `token ${this.authToken}`,
                    },
                },
            );
            this.hasCliSaveEndpoint = response.ok;
            if (!response.ok) {
                console.warn(
                    `CLI save endpoint test returned status ${response.status}. CLI save functionality will be disabled.`,
                );
            }
        } catch (error) {
            console.warn(
                `Error occurred while testing CLI save endpoint: ${error}. CLI save functionality will be disabled.`,
            );
            this.hasCliSaveEndpoint = false;
        }
    }

    async getPages(): Promise<any> {
        try {
            const response = await fetch(
                encodeURI(`${this.siteUrl}/api/resource/Builder Page`),
                {
                    headers: {
                        Authorization: `token ${this.authToken}`,
                    },
                },
            );
            if (!response.ok) {
                console.error(
                    response.status,
                    response.statusText ||
                        "Unknown error occurred while fetching pages",
                );
                return [];
            }
            return (await response.json()).data;
        } catch (error) {
            console.error("Error occurred while fetching pages:", error);
            return [];
        }
    }

    async getPage(pageName: string, fields: string[] = []): Promise<any> {
        try {
            const response = await fetch(
                encodeURI(
                    `${this.siteUrl}/api/resource/Builder Page/${pageName}`,
                ),
                {
                    headers: {
                        Authorization: `token ${this.authToken}`,
                    },
                },
            );
            if (!response.ok) {
                console.error(
                    response.status,
                    response.statusText ||
                        "Unknown error occurred while fetching page details",
                );
                return null;
            }
            if (fields.length > 0) {
                const pageData = (await response.json()).data;
                const filteredData: any = {};
                fields.forEach((field) => {
                    filteredData[field] = pageData[field];
                });
                return filteredData;
            }
            return (await response.json()).data;
        } catch (error) {
            console.error("Error occurred while fetching page details:", error);
            return null;
        }
    }

    async updatePage(
        pageName: string,
        updateMap: Record<string, unknown>,
        lastModified?: string,
    ): Promise<any> {
        try {
            let url = `${this.siteUrl}/api/resource/Builder Page/${pageName}`;
            let body = {};
            let method = "PUT";

            if (this.hasCliSaveEndpoint) {
                url = `${this.siteUrl}/api/method/builder.api.save_from_cli`;
                method = "POST";
                body = {
                    page_name: pageName,
                    update_map: updateMap,
                    last_known_server_mtime: lastModified,
                };
            } else {
                console.warn(
                    "CLI save endpoint not available. Falling back to standard resource update. This may cause conflicts if the page was modified on the server since last fetch.",
                );
                body = updateMap;
            }
            const response = await fetch(encodeURI(url), {
                method,
                headers: {
                    "Content-Type": "application/json",
                    Authorization: `token ${this.authToken}`,
                },
                body: JSON.stringify(body),
            });
            if (!response.ok) {
                console.log(JSON.stringify(response));
                console.error(
                    response.status,
                    response.statusText ||
                        "Unknown error occurred while updating page",
                );
                return null;
            }
            return (await response.json()).data;
        } catch (error) {
            console.error("Error occurred while updating page:", error);
            return null;
        }
    }
}

export default FrappeClient;
