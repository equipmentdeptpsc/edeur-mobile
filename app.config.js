const fs = require('node:fs');
const path = require('node:path');
const baseConfig = require('./app.json').expo;

const UAT_ENV_FILE = path.join(__dirname, '.env.uat');

function readUatEnvironment() {
  if (!fs.existsSync(UAT_ENV_FILE)) return {};
  return fs.readFileSync(UAT_ENV_FILE, 'utf8').split(/\r?\n/).reduce((environment, line) => {
    const match = line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*?)\s*$/);
    if (!match || match[1].startsWith('#')) return environment;
    environment[match[1]] = match[2].replace(/^['"]|['"]$/g, '');
    return environment;
  }, {});
}

const uat = readUatEnvironment();
// EAS/CI values take precedence when supplied; local development can use an
// ignored .env.uat without committing any client configuration.
const uatValue = (key) => process.env[key] || uat[key];
const uatSource = ['EXPO_PUBLIC_EDEUR_MODE', 'EXPO_PUBLIC_SUPABASE_URL', 'EXPO_PUBLIC_SUPABASE_ANON_KEY', 'EXPO_PUBLIC_ERMS_API_URL']
  .some((key) => process.env[key]) ? 'EAS_OR_PROCESS_ENV' : fs.existsSync(UAT_ENV_FILE) ? 'LOCAL_ENV_UAT_FILE' : 'UNCONFIGURED';

module.exports = () => ({
  ...baseConfig,
  extra: {
    ...(baseConfig.extra ?? {}),
    canonicalUat: {
      mode: uatValue('EXPO_PUBLIC_EDEUR_MODE') || 'UAT',
      supabaseUrl: uatValue('EXPO_PUBLIC_SUPABASE_URL'),
      supabaseAnonKey: uatValue('EXPO_PUBLIC_SUPABASE_ANON_KEY'),
      apiBaseUrl: uatValue('EXPO_PUBLIC_ERMS_API_URL'),
      source: uatSource,
    },
  },
});
