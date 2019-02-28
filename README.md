# sfcc-preference-analyzer
_Analyze SFCC Site Exports and generate a report of Global / Site Preferences found_

This application can be used to analyze a "Site Export" folder
and create a report of the Site Preferences found and how their values
are configured for each instance type (All, Development, Staging, Production).

The report will be generated in the following formats: JSON, CSV, XLS

Some configuration options for the report can be found in the `config.json` file,
the following are the settings found in the configuration:
- securePreferences These preferences will be redacted
- jsonPreferences These preferences will have their JSON beautified
- prefCellAlignment The Cell Alignment for Preference Values
- allRowFont The font to be used on all rows
- allRowBorder The border to be used on all rows
- allRowAlignment The alignment for all rows
- headerColFill The Fill for "Header Columns"
- headerRowFill The Fill for the "Header Row"
- headerRowFont The Font for the "Header Row"
- headerRow The Header Row itself
- colHeaders Which columns should get the "Header" treament
- colValues Which columns should get the preference value treatment

*Requires Node: v8.0.0 and above*

## Run the Script
```
npm start
```

This will execute `node index.js` and will start an interactive prompt to gather variables for execution.

If you would like to skip the prompt, you can added the relevant variables as parameters to the script.

```
node ./bin/preference-analysis/index.js --folder=./sites/site_template --name=code-base
```

*Note in order to use the default parameter for the --folder option, you will need to install the Demo Data submodule, see below.*

Prompt Parameters:
* folder = Site Export / Import to analyze preferences for
* name = What name should be used for the export files?

## Test the Script
```
npm test
```

Please be sure to add the Demo Data sub-module by executing the following commands:
```
git submodule init
git submodule update
```
