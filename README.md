
# Azure Event Hub Message Generator Extension

This VS Code extension allows you to generate and send random messages to an Azure Event Hub based on the configuration defined in a `settings.yml` file within your workspace.

## Features

- **Generate Random Messages**: Generates random messages for a configurable number of devices.
- **Customizable Geosection**: Supports both "square" and "round" geosection types for location data (optional).
- **Message Parameters**: Define different parameters with min and max values to simulate data for each message.
- **Azure Event Hub Integration**: Send the generated messages to Azure Event Hub.
- **Progress Reporting**: Visual progress is displayed in VS Code during message sending, with a notification when completed.
- **Environment Variable Support**: If the connection string is not defined in the `settings.yml` file, the extension will use the `AZURE_EVENTHUB_CONNECTION_STRING` environment variable.

## Installation

1. Clone or download the extension's repository.
2. Open the extension folder in VS Code.
3. Press `F5` to launch the extension in a new VS Code window.
4. In the new window, open a workspace and ensure the `settings.yml` file is placed in the workspace root folder.

## Configuration

The extension expects a `settings.yml` file in the workspace folder. Below is an example of the required configuration:

### Example `settings.yml`

```yaml
nmbOfDevices: 1  # Number of devices (default 1)
delay: 1         # Delay in seconds between messages (default 1)
maxMessages: 100 # Maximum number of messages to send (default 100)

geosection:
  type: square   # Geosection type: 'square' or 'round'
  center:
    lat: 0.0     # Latitude of the center (only for 'round' type)
    lon: 0.0     # Longitude of the center (only for 'round' type)
  bounds:
    radius: 1    # Radius in km (only for 'round' type)
    lat_range: [-90.0, 90.0]  # Latitude range for 'square' type
    lon_range: [-180.0, 180.0]  # Longitude range for 'square' type

azureEventHub:
  connectionString: "Endpoint=sb://<namespace>.servicebus.windows.net/;SharedAccessKeyName=<keyname>;SharedAccessKey=<key>;EntityPath=<hubname>"

values:
  - name: "Temperature"
    min: 0
    max: 10
  - name: "Size"
    min: 5
    max: 15
```

### Parameters Explained:
- **`nmbOfDevices`**: Number of devices for which messages will be generated (default: 1).
- **`delay`**: Delay in seconds between sending messages (default: 1).
- **`maxMessages`**: Total number of messages to be generated and sent (default: 100).
- **`geosection`**: Geographical range of coordinates to be included in the message (optional).
  - **`type`**: Set as `square` or `round`. Defines the type of geospatial area.
  - **`center`**: Latitude and longitude of the center for round geosections.
  - **`bounds`**: Bounds of the geosection, which can include radius (for `round`) or lat/lon ranges (for `square`).
- **`azureEventHub.connectionString`**: Azure Event Hub connection string (or set the environment variable `AZURE_EVENTHUB_CONNECTION_STRING` if not defined in the YAML).
- **`values`**: List of parameters to be included in each message (e.g., `Temperature`, `Size`), with a min and max value.

## Usage

1. Once the extension is installed and the `settings.yml` file is configured, open the Command Palette (`Ctrl+Shift+P`).
2. Search for `Send Messages to Event Hub` and select it to start sending messages to your Azure Event Hub.
3. The extension will generate messages for the defined number of devices and send them to Azure Event Hub. You will see the progress in the notification and status bar.

## Logging

- Logs will be displayed in the **VS Code Developer Console** (`Ctrl+Shift+I` to open the console).
- Progress is shown in the status bar during message generation.
- If any errors occur (e.g., invalid configuration or connection issues), they will be displayed in the VS Code notifications.

## Troubleshooting

- **No workspace folder open**: Ensure you have opened a workspace in VS Code before using the extension.
- **Missing `settings.yml` file**: Ensure the `settings.yml` file exists in the root of your workspace.
- **Missing Azure Event Hub connection string**: If the connection string is not defined in the `settings.yml` file, set the `AZURE_EVENTHUB_CONNECTION_STRING` environment variable.

## Known Limitations

### Port 5671 Connectivity
This application uses Azure Event Hubs, which relies on **AMQP** protocol over **port 5671** for communication. If the application fails to connect to the Event Hub, it could be due to network restrictions blocking this port.

#### How to Test
1. Open a terminal and run the following command to check if port 5671 is accessible:
   ```bash
   telnet <namespace>.servicebus.windows.net 5671

## Contributing

1. Fork the repository.
2. Make your changes and submit a pull request.
3. Ensure that all code is tested before submitting a PR.

## License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## Author

- **Aleksei Zhukov**
- **Email**: [aleksei.n.zhukov@gmail.com](mailto:aleksei.n.zhukov@gmail.com)
- **LinkedIn**: [linkedin.com/in/alekseizhukov](https://www.linkedin.com/in/alekseizhukov)
