# Sharepoint Upload

**Take it easy uploading files to SharePoint**. A powerful Node.js utility to upload large files to SharePoint using chunked uploads, with built-in support for authentication and progress tracking.

## Features

- Upload files to SharePoint with ease.
- Support for chunked uploads to handle large files.
- Overwrite existing files if necessary.
- Progress logging with upload percentage.
- Authentication using `node-sp-auth`.

## Table of Contents

- [Installation](#installation)
- [Usage](#usage)
- [Configuration](#configuration)
- [Methods](#methods)
- [Example](#example)
- [License](#license)

## Installation

To install `sharepoint-upload`, use npm or yarn:

```bash
npm install sharepoint-upload
```

or with yarn:

```bash
yarn add sharepoint-upload
```

## Usage

First, you need to instantiate the `SharepointUpload` class with the SharePoint URL and your credentials. Then you can upload files with the `upload` method.

### Basic Example

```javascript
const SharepointUpload = require('sharepoint-upload');

const uploader = new SharepointUpload({
  url: 'https://your-sharepoint-site.com/Documents/MyFolder',
  credentials: {
    username: 'your-username',
    password: 'your-password'
  },
  options: {
    verbose: true, // Enable progress logging
    logger: console  // Use console for logging
  }
});

(async () => {
  try {
    await uploader.upload('path/to/file.txt');
    console.log('File uploaded successfully!');
  } catch (error) {
    console.error('Error during upload:', error);
  }
})();
```

### Chunked Uploads

This utility splits large files into chunks (default 48MB) and uploads them in parts, ensuring reliable and efficient file transfer.

## Configuration

The `SharepointUpload` class accepts the following options:

- **url**: The SharePoint folder URL where the file will be uploaded.
- **credentials**: The credentials required for authentication, including:
  - `username`: Your SharePoint username.
  - `password`: Your SharePoint password.
- **options**: (Optional) Additional options for logging and verbosity.
  - `verbose`: If set to `true`, progress logs will be displayed during the upload.
  - `logger`: Specify a custom logger. Defaults to `console`.

### Example of Options

```javascript
const uploader = new SharepointUpload({
  url: 'https://your-sharepoint-site.com/Documents/MyFolder',
  credentials: {
    username: 'your-username',
    password: 'your-password'
  },
  options: {
    verbose: true, // Enable progress logging
    logger: customLoggerInstance // Use a custom logger instead of console
  }
});
```

## Methods

### `upload(filePath, options)`

Uploads a file to SharePoint.

#### Parameters:

- **filePath**: `string` – The path to the file to be uploaded.
- **options**: `object` (optional):
  - `fileName`: `string` – Custom name for the file in SharePoint. Defaults to the original filename.

#### Example

```javascript
await uploader.upload('path/to/file.txt', { fileName: 'new-file-name.txt' });
```

This method will split the file into chunks (if large enough) and upload it to the specified folder on SharePoint. If the file already exists, it will be overwritten.

## License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.
