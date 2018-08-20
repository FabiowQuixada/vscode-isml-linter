/* --------------------------------------------------------------------------------------------
 * Copyright (c) Microsoft Corporation. All rights reserved.
 * Licensed under the MIT License. See License.txt in the project root for license information.
 * ------------------------------------------------------------------------------------------ */

'use strict';

const path = require("path");
const vscode = require("vscode");
const vscodeLanguageClient = require("vscode-languageclient");
let client;

Object.defineProperty(exports, "__esModule", { value: true });

function activate(context) {
    
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
        documentSelector: [{ scheme: 'file', language: 'xml' }],
        synchronize: {
            fileEvents: vscode.workspace.createFileSystemWatcher('**/.clientrc')
        }
    };

    client = new vscodeLanguageClient.LanguageClient('isml-linter', 'Isml Linter', serverOptions, clientOptions);
    client.start();
}

function deactivate() {

    if (!client) {
        return undefined;
    }

    return client.stop();
}

exports.activate = activate;
exports.deactivate = deactivate;
