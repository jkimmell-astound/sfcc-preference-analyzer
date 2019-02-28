/* eslint dot-notation: off */

const fs = require('fs')
const path = require('path')
const convert = require('xml-js')
const log = require('pretty-log') // Pretty Logging
const glob = require('glob')
const stringify = require('csv-stringify')
const Excel = require('exceljs')

const config = require('./config.json')

/**
 * Clean Preferences
 * This function is an array reducer and will re-ogranize the JSON data
 * found from parsing the JSON created from parsing the XML.
 *
 * @param {Object} acc The accumulator for the reducer
 * @param {Object} cur The current object being evalulated for the reducer
 *
 * @returns {Array} The "reduced" array of preferences
 */
function cleanPreferences (acc, cur) {
  cur.preferences.forEach((pref) => {
    if (!acc[pref.id]) {
      acc[pref.id] = { // eslint-disable-line no-param-reassign
        group: '',
        name: '',
        'all-instances': '',
        development: '',
        staging: '',
        production: ''
      }
    }

    acc[pref.id].group = pref.group // eslint-disable-line no-param-reassign
    acc[pref.id].name = pref.name // eslint-disable-line no-param-reassign

    let prefValue = pref.value

    if (config.securePreferences.indexOf(pref.id) > -1) {
      prefValue = '****REDACTED****'
    }

    if (config.jsonPreferences.indexOf(pref.id) > -1) {
      try {
        acc[pref.id][cur.environment] = JSON.stringify(JSON.parse(prefValue), null, 2) // eslint-disable-line no-param-reassign
      } catch (e) {
        log.error(`${pref.id} - ${e}`)
        acc[pref.id][cur.environment] = prefValue // eslint-disable-line no-param-reassign
      }
    } else {
      acc[pref.id][cur.environment] = prefValue // eslint-disable-line no-param-reassign
    }
  })

  return acc
}

/**
 * Given a JSON Object that was created from XML
 * Calculate all Preference: Group, Key, Name and Values for the Environments
 *
 * @param {Object} rawPreferences The raw json object, converted from XML
 * @param {Object} metaData Preference Info from the meta data (Group Name (ID), Preference Name)
 *
 * @returns {Object} Summary of the preferences found
 */
function parsePreferences (rawPreferences, metaData) {
  const environments = Object.keys(rawPreferences)

  const preferences = environments.map((environment) => {
    if (rawPreferences[environment].preference) {
      let returnObj = {
        environment: environment,
        preferences: []
      }

      rawPreferences[environment].preference.forEach((preference) => {
        let value = null

        if (preference['_text']) {
          value = preference['_text']
        }

        if (preference.value) {
          if (preference.value.map) {
            const values = preference.value.map((setValue) => {
              return setValue['_text']
            })

            value = values.join(' || ')
          } else {
            value = preference.value['_text']
          }
        }

        returnObj.preferences.push({
          id: preference['_attributes']['preference-id'],
          group: (metaData && metaData[preference['_attributes']['preference-id']]) ? metaData[preference['_attributes']['preference-id']].group : '',
          name: (metaData && metaData[preference['_attributes']['preference-id']]) ? metaData[preference['_attributes']['preference-id']].name : '',
          value: value
        })
      })

      return returnObj
    }

    return {
      environment: environment,
      preferences: []
    }
  })

  return preferences.reduce(cleanPreferences, {})
}

/**
 * Analyze a Preference file
 * - Get the contents of file
 * - Convert the XML to JSON
 * - Parse Standard Preferences
 * - Parse Custom Preferences
 *
 * @param {string} file Preference File to analyze
 * @param {Object} metaData Preference Info from the meta data (Group Name (ID), Preference Name)
 *
 * @returns {Object} Summary Object of the file.
 */
function analyzePreferencesFile (file, metaData) {
  log.debug(`Analyzing file: ${file}`)

  const fileContents = fs.readFileSync(file)

  const result = JSON.parse(
    convert.xml2json(fileContents, {
      compact: true,
      spaces: 4
    })
  )

  return {
    standard: parsePreferences(result.preferences['standard-preferences']),
    custom: parsePreferences(result.preferences['custom-preferences'], metaData)
  }
}

/**
 * Analyze Sites
 * Scan a directory for "Sites" that have a preference configuration.
 *
 * @param {string} folder folder to analyze
 * @returns {Array} list of sites found
 */
function analyzeSites (folder) {
  const files = glob.sync(path.join(folder, 'sites', '*', 'preferences.xml'))

  /**
   * Path will be something like:
   * /home/jamie/sfcc-preference-analysis/demo_data/sites/SiteGenesis/preferences.xml
   * So we just need the 2 array element from the right, when we split on directory separators
   */
  return files.map((file) => {
    const parts = file.split('/') // @todo make this cross platform
    parts.pop()
    return parts.pop()
  })
}

/**
 * Analyze all global / site preferences for an entire Site Export.
 *
 * @param {string} folder Site Import / Export Folder to analyze
 * @param {Object} metaData Preference Info from the meta data (Group Name (ID), Preference Name)
 *
 * @returns {Object} Summary of the Site Export
 */
function analyzeEnvironment (folder, metaData) {
  const sites = analyzeSites(folder)

  if (!sites) {
    log.error('Not Sites Found!')
    return {}
  }

  const preferences = {
    global: analyzePreferencesFile(path.join(folder, 'preferences.xml')),
    sites: null
  }

  preferences.sites = sites.map((site) => {
    return {
      id: site,
      preferences: analyzePreferencesFile(path.join(folder, 'sites', site, 'preferences.xml'), metaData)
    }
  })

  return preferences
}

/**
 * Convert a preference JSON Object to CSV Rows
 *
 * @param {Object} preferences Preference Object to convert to CSV Rows
 * @param {string} site Site ID to tag the rows with, this can be 'global'
 * @param {string} type Type of preferences to work with: (standard|custom)
 *
 * @returns {Array} Generated CSV Rows
 */
function convertPreferencesToCSV (preferences, site, type) {
  let rows = []
  let prefKeys = Object.keys(preferences)

  prefKeys.forEach((prefKey) => {
    const prefs = preferences[prefKey]

    rows.push([
      site,
      type,
      prefs.group,
      prefKey,
      prefs.name,
      prefs['all-instances'],
      prefs.development,
      prefs.staging,
      prefs.production
    ])
  })

  return rows
}

/**
 * Generate a CSV array from supplied Preferences
 *
 * @param {Object} preferences Preferences to convert to csv
 * @returns {Array} generated CSV rows
 */
function generateCSV (preferences) {
  const csvHeaderRow = [
    'Site', 'Standard / Custom', 'Group', 'Key', 'Name', 'All Instances', 'Development', 'Staging', 'Production'
  ]

  let rows = [csvHeaderRow]

  rows = rows.concat(convertPreferencesToCSV(preferences.global.standard, 'global', 'standard'))
  rows = rows.concat(convertPreferencesToCSV(preferences.global.custom, 'global', 'custom'))

  preferences.sites.forEach((site) => {
    rows = rows.concat(convertPreferencesToCSV(site.preferences.standard, site.id, 'standard'))
    rows = rows.concat(convertPreferencesToCSV(site.preferences.custom, site.id, 'custom'))
  })

  return rows
}

/**
 * Write an array of CSV data to the actual file
 *
 * @param {string} fileName Name for the file
 * @param {Array} preferencesCSV Array of CSV Rows to write
 *
 * @returns {null} Does not return a value
 */
function saveCSV (fileName, preferencesCSV) {
  stringify(preferencesCSV, function (err, output) {
    if (err) {
      log.error(`Some error occured - ${err}`)
      return
    }

    fs.writeFile(fileName, output, 'utf8', (err) => {
      if (err) {
        log.error(`Some error occured - ${err}`)
      }
    })
  })
}

/**
 * Save an array of CSV Rows to an Excel Spreadsheet, with some basic formatting
 *
 * @param {string} fileName Name of file to save
 * @param {Array} preferencesCSV Array of CSV Rows and Columns
 *
 * @returns {null} Does not return a value
 */
async function saveXLS (fileName, preferencesCSV) {
  let workbook = new Excel.Workbook()
  let worksheet = workbook.addWorksheet('Preference Report')

  worksheet.columns = config.headerRow

  // Remove pre-existing header row
  preferencesCSV.shift()

  worksheet.addRows(preferencesCSV)

  // Values
  for (let i = 1; i <= preferencesCSV.length; i++) { // eslint-disable-line no-plusplus
    config.colHeaders.forEach((col) => {
      worksheet.getCell(`${col}${i}`).alignment = config.prefCellAlignment
    })

    worksheet.getRow(i).font = config.allRowFont
    worksheet.getRow(i).border = config.allRowBorder
    worksheet.getRow(i).alignment = config.allRowAlignment
  }

  // Header Columns
  config.colHeaders.forEach((col) => {
    worksheet.getColumn(col).fill = config.headerColFill
  })

  // Header Row
  worksheet.getRow(1).fill = config.headerRowFill
  worksheet.getRow(1).font = config.headerRowFont

  worksheet.properties.defaultRowHeight = 20

  await workbook.xlsx.writeFile(fileName)
}

/**
 * Analyze the Custom Site Preferences found in the Meta Data
 * and create an array of preferences (with their name) and their corresponding attribute group
 *
 * @param {string} folder Site Import / Export Folder to analyze
 * @returns {Object} Summary of the Site Preferences and their group
 */
function analyzeMeta (folder) {
  const metaDataFile = path.join(folder, 'meta', 'system-objecttype-extensions.xml')

  const fileContents = fs.readFileSync(metaDataFile)

  const result = JSON.parse(
    convert.xml2json(fileContents, {
      compact: true,
      spaces: 4
    })
  )

  let prefs

  result.metadata['type-extension'].forEach((typeExt) => {
    if (typeExt['_attributes']['type-id'] === 'SitePreferences') {
      prefs = typeExt['custom-attribute-definitions']['attribute-definition'].map((fullPref) => {
        const prefID = fullPref['_attributes']['attribute-id']

        let prefGroupID
        let prefGroupName

        // console.log(JSON.stringify(typeExt['group-definitions']['attribute-group'], null, 2));

        const groups = Array.isArray(typeExt['group-definitions']['attribute-group']) ? typeExt['group-definitions']['attribute-group'] : [typeExt['group-definitions']['attribute-group']]

        groups.forEach((attrGroup) => {
          const groupID = attrGroup['_attributes']['group-id']
          const groupName = attrGroup['display-name']['_text']

          if (Array.isArray(attrGroup.attribute)) {
            attrGroup.attribute.forEach((groupPref) => {
              if (groupPref['_attributes']['attribute-id'] === prefID) {
                prefGroupID = groupID
                prefGroupName = groupName
              }
            })
          } else if (attrGroup.attribute['_attributes']['attribute-id'] === prefID) {
            prefGroupID = groupID
            prefGroupName = groupName
          }
        })

        return {
          id: prefID,
          groupID: prefGroupID,
          groupName: prefGroupName,
          name: fullPref['display-name']['_text']
        }
      })
    }
  })

  return prefs.reduce((acc, curr) => {
    acc[curr.id] = { // eslint-disable-line no-param-reassign
      group: `${curr.groupName} (${curr.groupID})`,
      name: curr.name
    }

    return acc
  }, {})
}

/**
 * Save a Preference JSON Object to a file
 *
 * @param {string} fileName File name to save to
 * @param {*} preferences Preference JSON Object to Save
 *
 * @returns {null} Does not return a value
 */
function saveJSON (fileName, preferences) {
  fs.writeFileSync(fileName, JSON.stringify(preferences, null, 2))
}

module.exports = {
  generateCSV: generateCSV,
  analyzeEnvironment: analyzeEnvironment,
  analyzeSites: analyzeSites,
  analyzePreferencesFile: analyzePreferencesFile,
  analyzeMeta: analyzeMeta,
  saveCSV: saveCSV,
  saveXLS: saveXLS,
  saveJSON: saveJSON
}
