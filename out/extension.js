"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || function (mod) {
    if (mod && mod.__esModule) return mod;
    var result = {};
    if (mod != null) for (var k in mod) if (k !== "default" && Object.prototype.hasOwnProperty.call(mod, k)) __createBinding(result, mod, k);
    __setModuleDefault(result, mod);
    return result;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.deactivate = exports.activate = void 0;
const vscode = __importStar(require("vscode"));
const fs = __importStar(require("fs"));
const path = __importStar(require("path"));
const yaml_1 = require("yaml");
const event_hubs_1 = require("@azure/event-hubs");
async function activate(context) {
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
    let settings;
    try {
        settings = (0, yaml_1.parse)(settingsContent);
    }
    catch (error) {
        if (error instanceof Error) {
            vscode.window.showErrorMessage('Failed to parse settings.yml: ' + error.message);
        }
        else {
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
        const producer = new event_hubs_1.EventHubProducerClient(connectionString);
        let totalMessagesSent = 0;
        const progressOptions = {
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
                    const message = {
                        deviceId: device,
                    };
                    // Add geocoordinates if applicable
                    if (settings.geosection?.type !== 'none' && settings.geosection) {
                        if (settings.geosection.type === 'round') {
                            const { lat, lon } = settings.geosection.center;
                            const radius = settings.geosection.bounds?.radius ?? 1;
                            message.lat = lat + Math.random() * radius - radius / 2;
                            message.lon = lon + Math.random() * radius - radius / 2;
                        }
                        else if (settings.geosection.type === 'square') {
                            const [latMin, latMax] = settings.geosection.bounds?.lat_range ?? [-90, 90];
                            const [lonMin, lonMax] = settings.geosection.bounds?.lon_range ?? [-180, 180];
                            message.lat = latMin + Math.random() * (latMax - latMin);
                            message.lon = lonMin + Math.random() * (lonMax - lonMin);
                        }
                        message.lat = parseFloat((message.lat).toFixed(5));
                        message.lon = parseFloat((message.lon).toFixed(5));
                    }
                    // Add value parameters
                    settings.values.forEach((param) => {
                        message[param.name] = generateRandomValue(param.min, param.max, param.type || 'float');
                    });
                    // Send message
                    const batch = await producer.createBatch();
                    batch.tryAdd({ body: message });
                    await producer.sendBatch(batch);
                    // Increment total message counter
                    totalMessagesSent++;
                    // Log the sent message
                    console.log(`Sent message for device ${device} (Total: ${totalMessagesSent} of ${settings.maxMessages * settings.nmbOfDevices})`);
                    // Update the progress
                    progress.report({
                        increment: Math.floor((totalMessagesSent / settings.maxMessages) * 100),
                        message: `Sending message ${totalMessagesSent} of ${settings.maxMessages * settings.nmbOfDevices}`,
                    });
                    // Delay between messages
                    await new Promise((resolve) => setTimeout(resolve, settings.delay * 1000));
                }
            }
            await producer.close();
            vscode.window.showInformationMessage('Messages successfully sent to Azure Event Hub!');
        });
    };
    context.subscriptions.push(vscode.commands.registerCommand('extension.sendMessages', async () => {
        try {
            await sendMessages();
        }
        catch (error) {
            if (error instanceof Error) {
                vscode.window.showErrorMessage('Failed to send messages: ' + error.message);
            }
            else {
                vscode.window.showErrorMessage('An unknown error occurred');
            }
        }
    }));
    vscode.window.showInformationMessage('Extension activated. Process is going...');
}
exports.activate = activate;
function deactivate() { }
exports.deactivate = deactivate;
// Helper function to generate a random value based on type
function generateRandomValue(min, max, type = 'float') {
    const value = min + Math.random() * (max - min);
    return type === 'int' ? Math.floor(value) : parseFloat(value.toFixed(5));
}
//# sourceMappingURL=extension.js.map