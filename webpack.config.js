const path = require('path');

module.exports = {
    entry: './src/extension.ts',  // Your TypeScript entry file
    output: {
        path: path.resolve(__dirname, 'dist'),  // Ensure 'dist' is the directory for your bundled files
        filename: 'bundle.js',  // Output file name
    },
    resolve: {
        extensions: ['.ts', '.js'],  // File extensions to resolve
    },
    externals: {
        vscode: 'commonjs vscode',  // Exclude 'vscode' from the bundle, as it's provided by VS Code
    },
    module: {
        rules: [
            {
                test: /\.ts$/,  // Apply ts-loader for TypeScript files
                use: 'ts-loader',
                exclude: /node_modules/,
            },
        ],
    },
    target: 'node',  // VS Code extensions are Node.js-based
};
