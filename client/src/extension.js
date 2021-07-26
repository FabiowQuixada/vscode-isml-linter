/* --------------------------------------------------------------------------------------------
 * Copyright (c) Microsoft Corporation. All rights reserved.
 * Licensed under the MIT License. See License.txt in the project root for license information.
 * ------------------------------------------------------------------------------------------ */

const path                 = require('path');
const vscode               = require('vscode');
const vscodeLanguageClient = require('vscode-languageclient');
let client;

Object.defineProperty(exports, '__esModule', { value: true });

function activate(context) {

    // TODO: This is not the best way, but that's the way the isml-linter package will understand
    // it's running in a production environment. Will work on a better solution soon;
    process.env.NODE_ENV = 'prod';

    const serverModule = context.asAbsolutePath(path.join('server', 'src', 'server.js'));
    const debugOptions = { execArgv: ['--nolazy', '--inspect=6009'] };

    const serverOptions = {
        run: { module: serverModule, transport: vscodeLanguageClient.TransportKind.ipc },
        debug: {
            module: serverModule,
            transport: vscodeLanguageClient.TransportKind.ipc,
            options: debugOptions
        }
    };

    const clientOptions = {
        documentSelector: [{ scheme: 'file', language: 'xml' }, { scheme: 'file', language: 'isml' }],
        synchronize: {
            fileEvents: vscode.workspace.createFileSystemWatcher('**/.clientrc')
        }
    };

    client = new vscodeLanguageClient.LanguageClient('isml-linter', 'ISML Linter', serverOptions, clientOptions);
    client.start();
}

function deactivate() {

    if (!client) {
        return undefined;
    }

    return client.stop();
}

exports.activate   = activate;
exports.deactivate = deactivate;
