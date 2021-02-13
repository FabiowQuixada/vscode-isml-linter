const IsmlLinter = require('isml-linter');
const fs         = require('fs');

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

        if (fs.existsSync(configFilePath)) {
            console.log('Loading eslint config file: ' + configFilePath);
            return configFilePath;
        }
    }

    console.log('No eslint config file found.');

    return null;
}

function getIsmlConfig(templatePath) {
    const cartridgeDir       = templatePath.substring(0, templatePath.indexOf('\\cartridges\\'))
        || templatePath.substring(0, templatePath.indexOf('\\spec\\'));
    const projectRootDir     = cartridgeDir.split('\\').join('/');
    const configFileNameList = ['ismllinter.config.js', '.ismllinter.json', '.ismllintrc.js'];

    console.log('Template path: '          + templatePath);
    console.log('Cartridge directory: '    + cartridgeDir);
    console.log('Project root directory: ' + projectRootDir);

    for (let i = 0; i < configFileNameList.length; i++) {
        const configFileName = configFileNameList[i];
        const configFilePath = projectRootDir + '/' + configFileName;

        if (fs.existsSync(configFilePath)) {

            console.log('Loading isml config file: ' + configFilePath);
            const config              = require(configFilePath);
            const isEslintRuleEnabled = config.rules && 'eslint-to-isscript' in config.rules;

            delete config.ignore;
            delete config.enableCache;
            delete config.ignoreUnparseable;

            if (isEslintRuleEnabled && !config.eslintConfig) {
                const eslintConfigPath = getEslintConfigPath(projectRootDir);

                if (eslintConfigPath) {
                    config.eslintConfig = eslintConfigPath;
                }
            }

            return config;
        }
    }

    console.log('no isml-linter config file found.');

    return null;
}

function getOccurrenceList(occurrenceList, documentData, severity) {
    const diagnostics = [];

    if (occurrenceList) {
        for (const brokenRule in occurrenceList) {
            try {
                occurrenceList[brokenRule][documentData.templatePath].forEach(function (occurrence) {

                    let startPos = occurrence.globalPos;

                    if (documentData.isCrlfLineBreak) {
                        startPos           += occurrence.lineNumber - 1;
                        const lineBreakQty = (occurrence.line.match(new RegExp(LF_LINE_BREAK, 'g')) || []).length;

                        occurrence.length += lineBreakQty;
                    }

                    const diagnostic = {
                        severity : severity,
                        range    : {
                            start : documentData.textDocument.positionAt(startPos),
                            end   : documentData.textDocument.positionAt(startPos + occurrence.length)
                        },
                        message  : occurrence.message
                    };

                    diagnostics.push(diagnostic);
                });
            } catch (e) {
                diagnostics.push({
                    severity : vscodeLanguageServer.DiagnosticSeverity.Error,
                    range    : {
                        start : textDocument.positionAt(0),
                        end   : textDocument.positionAt(1)
                    },
                    message  : `An error has occurred while checking '${brokenRule}' rule: ${e.stack}`
                });
            }
        }
    }

    return diagnostics;
}

function getInvalidTemplateOccurrence(occurrenceList, documentData, severity) {
    const diagnostics = [];

    if (occurrenceList.length > 0) {
        const occurrence = occurrenceList[0];

        let startPos = occurrence.globalPos;

        if (documentData.isCrlfLineBreak) {
            startPos += occurrence.lineNumber - 1;
        }

        const diagnostic = {
            severity : severity,
            range    : {
                start : documentData.textDocument.positionAt(startPos),
                end   : documentData.textDocument.positionAt(startPos + occurrence.length)
            },
            message  : occurrence.message
        };

        diagnostics.push(diagnostic);
    }

    return diagnostics;
}

function run(textDocument, templatePath, severityLevels) {
    const projectIsmlConfig = getIsmlConfig(templatePath);

    IsmlLinter.setConfig(projectIsmlConfig);

    const documentContent = textDocument.getText();
    const isCrlfLineBreak = getLineBreakChar(documentContent) === CRLF_LINE_BREAK;
    const lintResult      = IsmlLinter.parse(templatePath, documentContent);

    const documentData = {
        textDocument,
        templatePath,
        isCrlfLineBreak
    };

    const errorList   = getOccurrenceList(lintResult.errors, documentData, severityLevels.ERROR);
    const warningList = getOccurrenceList(lintResult.warnings, documentData, severityLevels.WARNING);
    const invalidList = getInvalidTemplateOccurrence(lintResult.INVALID_TEMPLATE, documentData, severityLevels.ERROR);

    const diagnostics = errorList.concat(warningList, invalidList);

    return diagnostics;
}

module.exports.run = run;
