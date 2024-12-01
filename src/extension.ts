import * as vscode from 'vscode';
import * as fs from 'fs';
import * as path from 'path';
import { parse } from 'yaml';
import { EventHubProducerClient } from '@azure/event-hubs';

interface Settings {
    nmbOfDevices: number;
    delay: number;
    maxMessages: number;
    geosection?: {
        type: string;
        center?: { lat: number; lon: number };
        bounds?: {
            radius?: number;
            lat_range?: [number, number];
            lon_range?: [number, number];
        };
    };
    azureEventHub: { connectionString: string };
    values: { name: string; min: number; max: number }[];
}

export async function activate(context: vscode.ExtensionContext) {
    const workspaceFolders = vscode.workspace.workspaceFolders;

    if (!workspaceFolders) {
        vscode.window.showErrorMessage('No workspace folder is open.');
        return;
    }

    const workspacePath = workspaceFolders[0].uri.fsPath;
    const settingsPath = path.join(workspacePath, 'settings.yml');

    if (!fs.existsSync(settingsPath)) {
        vscode.window.showErrorMessage('settings.yml file not found in the workspace.');
        return;
    }

    // Read and parse the YAML file
    const settingsContent = fs.readFileSync(settingsPath, 'utf8');
    let settings: Settings;
    try {
        settings = parse(settingsContent) as Settings;
    } catch (error: unknown) {
        if (error instanceof Error) {
            vscode.window.showErrorMessage('Failed to parse settings.yml: ' + error.message);
        } else {
            vscode.window.showErrorMessage('An unknown error occurred');
        }
        return;
    }

    // Check if connectionString is defined in the YAML; if not, use the environment variable
    const connectionString = settings.azureEventHub.connectionString || process.env.AZURE_EVENTHUB_CONNECTION_STRING;

    if (!connectionString) {
        vscode.window.showErrorMessage('Azure Event Hub connection string is not provided in settings.yml or environment variables.');
        return;
    }

    const sendMessages = async () => {
        const producer = new EventHubProducerClient(connectionString);

        let totalMessagesSent = 0;
        const progressOptions: vscode.ProgressOptions = {
            location: vscode.ProgressLocation.Notification,
            title: 'Sending messages to Azure Event Hub...',
            cancellable: false,
        };

        vscode.window.withProgress(progressOptions, async (progress) => {
            // Update the progress
            progress.report({ increment: 0, message: 'Starting message generation' });

            for (let i = 0; i < settings.maxMessages; i++) {
                for (let device = 0; device < settings.nmbOfDevices; device++) {
                    // Generate message
                    const message: any = {
                        deviceId: device,
                    };

                    // Add geocoordinates if applicable
                    if (settings.geosection?.type !== 'none' && settings.geosection) {
                        if (settings.geosection.type === 'round') {
                            const { lat, lon } = settings.geosection.center!;
                            const radius = settings.geosection.bounds?.radius ?? 1;
                            message.lat = lat + Math.random() * radius - radius / 2;
                            message.lon = lon + Math.random() * radius - radius / 2;
                        } else if (settings.geosection.type === 'square') {
                            const [latMin, latMax] = settings.geosection.bounds?.lat_range ?? [-90, 90];
                            const [lonMin, lonMax] = settings.geosection.bounds?.lon_range ?? [-180, 180];
                            message.lat = latMin + Math.random() * (latMax - latMin);
                            message.lon = lonMin + Math.random() * (lonMax - lonMin);
                        }
                    }

                    // Add value parameters
                    settings.values.forEach((param) => {
                        message[param.name] = param.min + Math.random() * (param.max - param.min);
                    });

                    // Send message
                    const batch = await producer.createBatch();
                    batch.tryAdd({ body: message });
                    await producer.sendBatch(batch);

                    // Increment total message counter
                    totalMessagesSent++;

                    // Log the sent message
                    console.log(`Sent message for device ${device} (Total: ${totalMessagesSent} of ${settings.maxMessages})`);

                    // Update the progress
                    progress.report({
                        increment: Math.floor((totalMessagesSent / settings.maxMessages) * 100),
                        message: `Sending message ${totalMessagesSent} of ${settings.maxMessages}`,
                    });

                    // Delay between messages
                    await new Promise((resolve) => setTimeout(resolve, settings.delay * 1000));
                }
            }

            await producer.close();
            vscode.window.showInformationMessage('Messages successfully sent to Azure Event Hub!');
        });
    };

    context.subscriptions.push(
        vscode.commands.registerCommand('extension.sendMessages', async () => {
            try {
                await sendMessages();
            } catch (error: unknown) {
                if (error instanceof Error) {
                    vscode.window.showErrorMessage('Failed to send messages: ' + error.message);
                } else {
                    vscode.window.showErrorMessage('An unknown error occurred');
                }
            }
        })
    );

    vscode.window.showInformationMessage('Extension activated. Process is going...');
}

export function deactivate() {}
