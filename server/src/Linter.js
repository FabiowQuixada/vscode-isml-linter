const IsmlLinter = require('isml-linter');

const CRLF_LINE_BREAK = '\r\n';
const LF_LINE_BREAK   = '\n';
const CR_LINE_BREAK   = '\r';

function getLineBreakChar(string) {
    const indexOfLF = string.indexOf(LF_LINE_BREAK, 1);

    if (indexOfLF === -1) {
        if (string.indexOf(CR_LINE_BREAK) !== -1) return CR_LINE_BREAK;

        return LF_LINE_BREAK;
    }

    if (string[indexOfLF - 1] === CR_LINE_BREAK) return CRLF_LINE_BREAK;

    return LF_LINE_BREAK;
}

function getEslintConfigPath(projectRootDir) {
    const eslintConfigFileNameList = ['.eslintrc.json', '.eslintrc.js', '.eslintrc'];

    for (let i = 0; i < eslintConfigFileNameList.length; i++) {
        const configFileName = eslintConfigFileNameList[i];
        const configFilePath = projectRootDir + '/' + configFileName;

        try {
            console.log('trying to load eslint config: ' + projectRootDir + '/' + configFilePath);
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
    console.log('cartridge dir: ' + cartridgeDir);
    console.log('project root dir: ' + projectRootDir);

    for (let i = 0; i < configFileNameList.length; i++) {
        const configFileName = configFileNameList[i];
        const configFilePath = projectRootDir + '/' + configFileName;

        try {
            console.log('trying to load isml config: ' + configFilePath);
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
            console.log('An error has occurred: ' + error + error.stack);
            // TODO
        }
    }

    console.log('no isml-linter config file found.');

    return null;
}

function addErrorOccurrencesToDiagnostics(result, textDocument, templatePath, isCrlfLineBreak, diagnostics, severity) {
    if (result.errors) {
        for (const brokenRule in result.errors) {

            result.errors[brokenRule][templatePath].forEach(function (occurrence) {

                let startPos = occurrence.globalPos;

                if (isCrlfLineBreak) {
                    startPos           += occurrence.lineNumber - 1;
                    const lineBreakQty = (occurrence.line.match(new RegExp(LF_LINE_BREAK, 'g')) || []).length;

                    occurrence.length += lineBreakQty;
                }

                const diagnostic = {
                    severity : severity,
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
}

function addWarningOccurrencesToDiagnostics(result, textDocument, templatePath, isCrlfLineBreak, diagnostics, severity) {
    if (result.warnings) {
        for (const brokenRule in result.warnings) {

            result.warnings[brokenRule][templatePath].forEach(function (occurrence) {

                let startPos = occurrence.globalPos;

                if (isCrlfLineBreak) {
                    startPos           += occurrence.lineNumber - 1;
                    const lineBreakQty = (occurrence.line.match(new RegExp(LF_LINE_BREAK, 'g')) || []).length;

                    occurrence.length += lineBreakQty;
                }

                const diagnostic = {
                    severity : severity,
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
}

function addInvalidTemplateOccurrenceToDiagnostis(result, textDocument, isCrlfLineBreak, diagnostics, severity) {
    if (result.INVALID_TEMPLATE.length) {
        const occurrence = result.INVALID_TEMPLATE[0];

        let startPos = occurrence.globalPos;

        if (isCrlfLineBreak) {
            startPos += occurrence.lineNumber - 1;
        }

        const diagnostic = {
            severity: severity,
            range: {
                start: textDocument.positionAt(startPos),
                end: textDocument.positionAt(startPos + occurrence.length)
            },
            message: occurrence.message
        };

        diagnostics.push(diagnostic);
    }
}

function run(textDocument, templatePath, vscodeLanguageServer) {
    const projectIsmlConfig = getIsmlConfig(templatePath);

    IsmlLinter.setConfig(projectIsmlConfig);

    const documentContent = textDocument.getText();
    const isCrlfLineBreak = getLineBreakChar(documentContent) === CRLF_LINE_BREAK;
    const result          = IsmlLinter.parse(templatePath, documentContent);
    const diagnostics     = [];

    const errorSeverity   = vscodeLanguageServer.DiagnosticSeverity.Error;
    const warningSeverity = vscodeLanguageServer.DiagnosticSeverity.Warning;

    addErrorOccurrencesToDiagnostics(        result, textDocument, templatePath, isCrlfLineBreak, diagnostics, errorSeverity);
    addWarningOccurrencesToDiagnostics(      result, textDocument, templatePath, isCrlfLineBreak, diagnostics, warningSeverity);
    addInvalidTemplateOccurrenceToDiagnostis(result, textDocument, isCrlfLineBreak, diagnostics, errorSeverity);

    return diagnostics;
}

module.exports.run = run;
