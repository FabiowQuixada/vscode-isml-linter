/* --------------------------------------------------------------------------------------------
 * Copyright (c) Microsoft Corporation. All rights reserved.
 * Licensed under the MIT License. See License.txt in the project root for license information.
 * ------------------------------------------------------------------------------------------ */

const Linter               = require('./Linter');
const vscodeLanguageServer = require('vscode-languageserver');
const URI                  = require('vscode-uri');

const connection               = vscodeLanguageServer.createConnection(vscodeLanguageServer.ProposedFeatures.all);
const documents                = new vscodeLanguageServer.TextDocuments();
const documentSettings         = new Map();
let hasConfigurationCapability = false;

const __awaiter = this && this.__awaiter || function (thisArg, _arguments, P, generator) {
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator['throw'](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : new P(function (resolve) { resolve(result.value); }).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};

Object.defineProperty(exports, '__esModule', { value: true });

connection.onInitialize( params => {

    const capabilities = params.capabilities;

    hasConfigurationCapability = capabilities.workspace && !!capabilities.workspace.configuration;

    return {
        capabilities: {
            textDocumentSync: documents.syncKind
        }
    };
});

connection.onInitialized( () => {
    if (hasConfigurationCapability) {
        connection.client.register(vscodeLanguageServer.DidChangeConfigurationNotification.type, undefined);
    }
});

connection.onDidChangeConfiguration( () => {

    if (hasConfigurationCapability) {
        documentSettings.clear();
    }

    documents.all().forEach(validateTextDocument);
});

documents.onDidClose( e => {
    documentSettings.delete(e.document.uri);
});

documents.onDidChangeContent( change => {
    validateTextDocument(change.document);
});

function validateTextDocument(textDocument) {
    return __awaiter(this, void 0, void 0, function* () {

        if (!textDocument.uri.endsWith('.isml')) {
            yield;
        }

        const diagnostics = [];

        try {
            const templatePath = URI.default.parse(textDocument.uri).fsPath;

            const severityLevels = {
                ERROR   : vscodeLanguageServer.DiagnosticSeverity.Error,
                WARNING : vscodeLanguageServer.DiagnosticSeverity.Warning
            };

            const lintResult = Linter.run(textDocument, templatePath, severityLevels, vscodeLanguageServer);

            diagnostics.push(...lintResult);

        } catch (error) {
            console.log('An error has occurred: ' + error + ' ' + error.stack);

            const diagnostic = {
                severity : vscodeLanguageServer.DiagnosticSeverity.Error,
                range    : {
                    start : textDocument.positionAt(0),
                    end   : textDocument.positionAt(1)
                },
                message  : error.isCustom ? error.message : error.stack
            };

            diagnostics.push(diagnostic);
        }

        connection.sendDiagnostics({ uri: textDocument.uri, diagnostics });
    });
}

documents.listen(connection);
connection.listen();
