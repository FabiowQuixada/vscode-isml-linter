# Isml Linter Extension for VS Code
VS Code extension for Isml Linter. You can also install the linter directly through npm and take advantage of its full-project lint feature, such as use it in the build process. More info here: https://www.npmjs.com/package/isml-linter. There you can also find a set of rules that can be applied to this extension.

# Phophet Compability
This extension is aimed for non-[Prophet](https://marketplace.visualstudio.com/items?itemName=SqrTT.prophet) users, as there is a compability issue with it. We will soon
create a PR to Prophet so it uses directly the Isml Linter npm package exactly the same way this extension does. Keep an eye on us!

# Sample Result
![Isml Linter sample use](./images/sample_use.png "Isml Linter Sample Use")

# Configuration
The isml linter configuration file is where the linting rules are defined.

Currently, the linter is still in a Beta version, thus the config file in the default vscode extensions directory (see below) is used. Ideally, the config file path should be configurable through user or workspace settings, so it could go into a project's repository.

The default configuration file path is displayed below, be it Windows or Unix system.


- (user_directory)/.vscode/extensions/fabiowquixada.vscode-isml-linter-(version)/ismllinter.config.js

Edit that file in order to customize the linter. By default, all rules are enabled. You can find more info on how to add or remove rules [here](https://www.npmjs.com/package/isml-linter).

# Contributors
 - Railan Barbosa (logo);
