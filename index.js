/**
 * The following script can be used to analyze a "Site Export" folder
 * and create a report of the Site Preferences found and how their values
 * are configured for each instance type (All, Development, Staging, Production).
 *
 * The report will be generated in the following formats: JSON, CSV, XLS
 *
 * This script can be run using the following commands:
 * `npm run analyzePreferences`
 * `node ./bin/preference-analysis/index.js`
 * `node ./bin/preference-analysis/index.js --folder=./sites/site_template --name=code-base` Auto-Filling answers for prompt
 *
 * Some configuration options for the report can be found in the `config.json` file,
 * the following are the settings found in the configuration:
 * - securePreferences These preferences will be redacted
 * - jsonPreferences These preferences will have their JSON beautified
 * - prefCellAlignment The Cell Alignment for Preference Values
 * - allRowFont The font to be used on all rows
 * - allRowBorder The border to be used on all rows
 * - allRowAlignment The alignment for all rows
 * - headerColFill The Fill for "Header Columns"
 * - headerRowFill The Fill for the "Header Row"
 * - headerRowFont The Font for the "Header Row"
 * - headerRow The Header Row itself
 * - colHeaders Which columns should get the "Header" treament
 * - colValues Which columns should get the preference value treatment
 *
 * @example <caption>JSON Report</caption>
 * {
 *   "global": {
 *     "standard": {
 *       "ActiveLocales": {
 *         "group": "",
 *         "name": "",
 *         "all-instances": "en:en_US:fr:fr_FR",
 *         "development": "",
 *         "staging": "",
 *         "production": ""
 *       },
 *       "CustomCartridges": {
 *         "group": "",
 *         "name": "",
 *         "all-instances": "app_brand_a_core:app_brand_b_core:app_brand_core",
 *         "development": "",
 *         "staging": "",
 *         "production": ""
 *       }
 *   }
 * }
 *
 * @example <caption>CSV / XLS Report</caption>
 * global,standard,,ActiveLocales,,en:en_US:fr:fr_FR,,,
 * global,standard,,CustomCartridges,,app_brand_a_core:app_brand_b_core:app_brand_core,,,
 * global,standard,,CustomProductListColumns,,custom.color:custom.refinementColor,,,
 * global,standard,,InstanceTimezone,,US/Eastern,,,
 */

const path = require('path')

const log = require('pretty-log') // Pretty Logging
const prompt = require('prompt') // Interactive Command Line Prompt
const optimist = require('optimist') // Handle the parameters passed to this script

const util = require('./util')

const outputDirectory = path.join(__dirname, 'output')

const schema = {
  properties: {
    folder: {
      message: 'Site Export / Import to analyze preferences for',
      required: true,
      default: path.join(__dirname, 'demo_data')
    },
    name: {
      pattern: /[A-Za-z0-9 \-_]/,
      message: 'What name should be used for the export files?',
      default: 'code-base',
      required: true
    }
  }
}

// Allows users to auto-fill answers for the prompt: node ./bin/preference-analysis/index.js --folder=./sites/site_template --name=code-base
prompt.override = optimist.argv

prompt.start()

/**
 * Prompt the user for the necessary variables then:
 * - Analyze the Meta Data for Export
 * - Analyze the Preferences / Environments from the Export, creating the JSON report
 * - Generate CSV from the JSON Object
 * - Generate XLS from the CSV
 */
prompt.get(schema, function (err, results) {
  if (err) {
    log.error(err)
    return
  }

  const metaData = util.analyzeMeta(results.folder)

  const preferences = util.analyzeEnvironment(results.folder, metaData)
  const preferencesCSV = util.generateCSV(preferences)

  util.saveCSV(path.join(outputDirectory, `report-${results.name}.csv`), preferencesCSV)
  util.saveXLS(path.join(outputDirectory, `report-${results.name}.xls`), preferencesCSV)
  util.saveJSON(path.join(outputDirectory, `report-${results.name}.json`), preferences)

  log.success(`Reports have been successfully saved to: ${path.join(outputDirectory, 'report-*')}`)
})
