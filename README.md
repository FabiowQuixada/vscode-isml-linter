# Isml Linter Extension for VS Code
VS Code extension for Isml Linter. You can also install the linter directly through npm and take advantage of its full-project lint feature. More info here: https://www.npmjs.com/package/isml-linter. There you can also find a set of rules that can be applied to this extension.

# Configuration
The isml linter configuration file is where the linting rules are defined.

Currently, the linter is still in a Beta version, thus the config file in the default vscode extensions directory (see below) is used. Ideally, the config file path should be configurable through user or workspace settings, so it could go into a project's repository.

The default configuration file for different operational systems are displayed below.

On Unix:

- ~/.vscode/extensions/fabiowquixada.vscode-isml-linter-(version)/.ismllinter.json

On Windows:

- %USERPROFILE%\\.vscode\extensions\fabiowquixada.vscode-isml-linter-(version)\.ismllinter.json

Edit that file in order to customize the linter. You can find more info on how to add or remove rules [here](https://github.com/FabiowQuixada/isml-linter).

# Contributors
 - Railan Barbosa (logo);
