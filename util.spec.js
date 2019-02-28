const util = require('./util')
const path = require('path')

/**
 * Disable Console Log
 */
console.log = jest.fn()

const folder = path.join(__dirname, 'demo_data')
const singleFile = path.join(__dirname, 'demo_data', 'sites', 'SiteGenesis', 'preferences.xml')

const mockMeta = require('./mock/meta.json')
const mockPreferences = require('./mock/preferences.json')
const mockSiteGenesisSitePreferences = require('./mock/siteGenesisSitePreferences.json')
const mockCSV = require('./mock/csv.json')

test('Util -> analyzeSites -> Should return the correct list of sites', () => {
  const expected = [ 'SiteGenesis', 'SiteGenesisGlobal' ]
  const sites = util.analyzeSites(folder)

  expect(sites).toEqual(expected)
})

test('Util -> analyzeMeta -> Should return the correct list of meta data', () => {
  const meta = util.analyzeMeta(folder)

  expect(meta).toEqual(mockMeta)
})

test('Util -> analyzeEnvironment -> Should return the correct list of preferences', () => {
  const preferences = util.analyzeEnvironment(folder, mockMeta)

  expect(preferences).toEqual(mockPreferences)
})

test('Util -> analyzePreferencesFile -> Should return the correct list of preferences for a single file', () => {
  const preferences = util.analyzePreferencesFile(singleFile, mockMeta)

  expect(preferences).toEqual(mockSiteGenesisSitePreferences)
})

test('Util -> generateCSV -> Should return the correct list of preferences for a single file', () => {
  const csv = util.generateCSV(mockPreferences)

  expect(csv).toEqual(mockCSV)
})
