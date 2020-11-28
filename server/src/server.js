/* --------------------------------------------------------------------------------------------
 * Copyright (c) Microsoft Corporation. All rights reserved.
 * Licensed under the MIT License. See License.txt in the project root for license information.
 * ------------------------------------------------------------------------------------------ */

'use strict';

const IsmlLinter = require('isml-linter');
const path = require('path');
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

const CRLF_LINE_BREAK = '\r\n';
const LF_LINE_BREAK   = '\n';
const CR_LINE_BREAK   = '\r';

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

function getLineBreakChar(string) {
    const indexOfLF = string.indexOf(LF_LINE_BREAK, 1);

    if (indexOfLF === -1) {
        if (string.indexOf(CR_LINE_BREAK) !== -1) return CR_LINE_BREAK;

        return LF_LINE_BREAK;
    }

    if (string[indexOfLF - 1] === CR_LINE_BREAK) return CRLF_LINE_BREAK;

    return LF_LINE_BREAK;
}

function validateTextDocument(textDocument) {
    return __awaiter(this, void 0, void 0, function* () {

        if (!textDocument.uri.endsWith('.isml')) {
            return;
        }

        const diagnostics = [];

        try {
            const templatePath      = URI.default.parse(textDocument.uri).fsPath;
            const projectIsmlConfig = getIsmlConfig(templatePath);

            IsmlLinter.setConfig(projectIsmlConfig);

            const documentContent = textDocument.getText();
            const isCrlfLineBreak = getLineBreakChar(documentContent) === CRLF_LINE_BREAK;
            const result          = IsmlLinter.parse(templatePath, documentContent);

            if (result.errors) {
                for (const brokenRule in result.errors) {

                    result.errors[brokenRule][templatePath].forEach( function(occurrence) {

                        let startPos = occurrence.globalPos;

                        if (isCrlfLineBreak) {
                            startPos += occurrence.lineNumber - 1;
                        }

                        const diagnostic = {
                            severity : vscodeLanguageServer.DiagnosticSeverity.Error,
                            range    : {
                                start : textDocument.positionAt(startPos),
                                end   : textDocument.positionAt(startPos + occurrence.length)
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

function getEslintConfigPath(projectRootDir) {
    const eslintConfigFileNameList = ['.eslintrc.json', '.eslintrc.js', '.eslintrc'];

    for (let i = 0; i < eslintConfigFileNameList.length; i++) {
        const configFileName = configFileNameList[i];
        const configFilePath = projectRootDir + '/' + configFileName;

        try {
            console.log('trying to load eslint config: ' + projectRootDir + '/' + configFilePath)
            require(configFilePath);

            return configFilePath;
        } catch (error) {
            // TODO
        }
    }

    return null;
}

function getIsmlConfig(templatePath) {
    const cartridgeDir       = templatePath.substring(0, templatePath.indexOf('\\cartridges\\'))
        || templatePath.substring(0, templatePath.indexOf('\\spec\\'));
    const projectRootDir     = cartridgeDir.split('\\').join('/');
    const configFileNameList = ['ismllinter.config.js', '.ismllinter.json', '.ismllintrc.js'];

    console.log('template path: ' + templatePath);
    console.log('cartridge dir: ' + cartridgeDir)
    console.log('project root dir: ' + projectRootDir)

    for (let i = 0; i < configFileNameList.length; i++) {
        const configFileName = configFileNameList[i];
        var configFilePath = projectRootDir + '/' + configFileName;

        try {
            console.log('trying to load isml config: ' + configFilePath)
            const config = require(configFilePath);

            delete config.ignore;
            delete config.enableCache;
            delete config.ignoreUnparseable;

            console.log('Using: ' + configFilePath);
            console.log('eslint config: ' + config.eslintConfig);

            if (!config.eslintConfig) {
                const eslintConfigPath = getEslintConfigPath(projectRootDir);

                if (eslintConfigPath) {
                    config.eslintConfig = eslintConfigPath;
                }
            }

            console.log(JSON.stringify(config.rules, null, 4));


            return config;
        } catch (error) {
            // TODO
        }
    }

    console.log('no isml-linter config file found.')

    return null;
}

documents.listen(connection);
connection.listen();
