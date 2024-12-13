import * as vscode from 'vscode';
import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';
import { parse } from 'yaml';
import { EventHubProducerClient } from '@azure/event-hubs';

interface Settings {
    azureEventHub: { connectionString: string };
    entityCount: number;
    idKeyName?: string; // New optional property for the ID key name
    startId?: number; // New parameter for starting ID, defaults to 1
    delay: number;
    maxMessages: number;
    timestamp?: {
        enabled: boolean;
    };
    geosection?: {
        type: string;
        center?: { lat: number; lon: number };
        bounds?: {
            radius?: number;
            lat_range?: [number, number];
            lon_range?: [number, number];
        };
    };
    values: { name: string; min: number; max: number; type?: 'int' | 'float' }[];
    concurrencyLimit?: number;
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

    const async = require('async');

    const sendMessages = async () => {
        const producer = new EventHubProducerClient(connectionString);
    
        let totalMessagesSent = 0;
        const totalTasks = settings.maxMessages * settings.entityCount;
        const startId = settings.startId || 1; // Default to 1 if not defined in the settings
        const availableCpuCores = os.cpus().length; // Get number of CPU cores
    
        // Get concurrencyLimit from settings.yml, fallback to CPU cores, or use a sensible default (e.g., 1)
        const concurrencyLimit = settings.concurrencyLimit || Math.max(1, availableCpuCores);
        
        const progressOptions: vscode.ProgressOptions = {
            location: vscode.ProgressLocation.Notification,
            title: 'Sending messages to Azure Event Hub...',
            cancellable: false,
        };
    
        vscode.window.withProgress(progressOptions, async (progress) => {
            progress.report({ increment: 0, message: 'Starting message generation' });
    
            // Generate all tasks in a flat array, starting from startId
            const tasks = Array.from({ length: totalTasks }, (_, index) => {
                const entityId = startId + Math.floor(index / settings.entityCount); // Increment entityId based on startId
                return generateMessage(entityId, settings);
            });
    
            const queue = async.queue(async (message: any, callback: any) => {
                try {
                    const batch = await producer.createBatch();
                    batch.tryAdd({ body: message });
                    await producer.sendBatch(batch);
    
                    totalMessagesSent++;
                    const progressPercentage = Math.floor((totalMessagesSent / totalTasks) * 100);
    
                    // Update progress
                    progress.report({
                        increment: progressPercentage,
                        message: `Sent message ${totalMessagesSent} of ${totalTasks}`,
                    });
                } catch (error) {
                    console.error('Error sending message:', error);
                } finally {
                    callback();
                }
            }, concurrencyLimit);
    
            // Push all tasks to the queue
            tasks.forEach((message) => queue.push(message));
    
            // Wait for the queue to drain
            await new Promise<void>((resolve) => {
                queue.drain(() => resolve());
            });
    
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

// Helper function to generate a random value based on type
function generateRandomValue(min: number, max: number, type: 'int' | 'float' = 'float') {
    const value = min + Math.random() * (max - min);
    return type === 'int' ? Math.floor(value) : parseFloat(value.toFixed(5));
}


function generateMessage(entityId: number, settings: Settings): any {
    const idKeyName = settings.idKeyName || 'deviceId'; // Default to 'deviceId' if not defined
    const message: any = { [idKeyName]: entityId }; // Use dynamic key for the ID

    // Add timestamp if enabled
    if (settings.timestamp?.enabled) {
        const date = new Date();
        message.timestamp = date.toISOString();
    }

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

        message.lat = parseFloat((message.lat).toFixed(5))
        message.lon = parseFloat((message.lon).toFixed(5))
    }

    // Add value parameters
    settings.values.forEach((param) => {
        message[param.name] = generateRandomValue(param.min, param.max, param.type || 'float');
    });

    return message;
}

