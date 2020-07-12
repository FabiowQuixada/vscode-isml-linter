/* --------------------------------------------------------------------------------------------
 * Copyright (c) Microsoft Corporation. All rights reserved.
 * Licensed under the MIT License. See License.txt in the project root for license information.
 * ------------------------------------------------------------------------------------------ */

'use strict';

const IsmlLinter = require('isml-linter');
const vscodeLanguageServer = require("vscode-languageserver");
const URI = require('vscode-uri');

const connection = vscodeLanguageServer.createConnection(vscodeLanguageServer.ProposedFeatures.all);
const documents = new vscodeLanguageServer.TextDocuments();
const defaultSettings = { maxNumberOfProblems: 1000 };
const globalSettings = defaultSettings;
const documentSettings = new Map();
let hasConfigurationCapability = false;
let hasWorkspaceFolderCapability = false;
let hasDiagnosticRelatedInformationCapability = false;

const __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : new P(function (resolve) { resolve(result.value); }).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};

Object.defineProperty(exports, "__esModule", { value: true });

connection.onInitialize( params => {

    const capabilities = params.capabilities;
    
    hasConfigurationCapability = capabilities.workspace && !!capabilities.workspace.configuration;
    hasWorkspaceFolderCapability = capabilities.workspace && !!capabilities.workspace.workspaceFolders;
    hasDiagnosticRelatedInformationCapability =
        capabilities.textDocument &&
        capabilities.textDocument.publishDiagnostics &&
        capabilities.textDocument.publishDiagnostics.relatedInformation;

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

connection.onDidChangeConfiguration( change => {

    if (hasConfigurationCapability) {
        documentSettings.clear();
    }
    else {
        globalSettings = ((change.settings.ismlLinter || defaultSettings));
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
            return;
        }

        const diagnostics = [];

        try {
            const path   = URI.default.parse(textDocument.uri).fsPath;
            const result = IsmlLinter.parse(path, textDocument.getText());

            if (result.errors) {
                for (const brokenRule in result.errors) {

                    result.errors[brokenRule][path].forEach( function(occurrence) {

                        const diagnostic = {
                            severity : vscodeLanguageServer.DiagnosticSeverity.Error,
                            range    : {
                                start : textDocument.positionAt(occurrence.globalPos),
                                end   : textDocument.positionAt(occurrence.globalPos + occurrence.length)
                            },
                            message  : occurrence.message
                        };

                        diagnostics.push(diagnostic);
                    });
                }
            }

            if (result.INVALID_TEMPLATE.length) {
                const occurrence = result.INVALID_TEMPLATE[0]
                const diagnostic = {
                    severity : vscodeLanguageServer.DiagnosticSeverity.Error,
                    range    : {
                        start : textDocument.positionAt(occurrence.globalPos),
                        end   : textDocument.positionAt(occurrence.globalPos + occurrence.length)
                    },
                    message  : occurrence.message
                };

                diagnostics.push(diagnostic);
            }

        } catch (error) {
            // TODO Log error in a better way and stop throwing the error to the user;
            console.log(error);

            const diagnostic = {
                severity : vscodeLanguageServer.DiagnosticSeverity.Error,
                range    : {
                    start : textDocument.positionAt(0),
                    end   : textDocument.positionAt(1)
                },
                message  : error.stack
            };

            diagnostics.push(diagnostic);
        }

        connection.sendDiagnostics({ uri: textDocument.uri, diagnostics });
    });
}

documents.listen(connection);
connection.listen();
