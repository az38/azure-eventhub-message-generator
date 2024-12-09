# Change Log

All notable changes to the "azure-eventhub-message-generator" extension will be documented in this file.

## [1.0.4] - 2024-12-??
### Added
- **Timestamp Parameter**: 
  - Introduced a new `timestamp` parameter in the `settings.yml` configuration. 
  - Includes the UTC timestamp when the message is generated.
- **idKeyName** to allow the use of custom keys for entity identifiers. Default is still `deviceId`.

### Changed
- **Support for generic entity types**. Renamed `nmbOfDevices` to `entityCount` and key name is now customizable via `idKeyName`.


## [1.0.3] - 2024-12-08
### Added
- **Value Type Configuration**: You can now specify the type (`int` or `float`) for values in the `settings.yml` file. By default, the type is `float`.

### Changed
- **Geocoordinates Precision**: All float values, including geocoordinates, are now explicitly rounded to 5 decimal places for precision and consistency.

## [1.0.0] - 2024-12-01

- **Initial release**