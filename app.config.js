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
const value = (key) => process.env[key] || uat[key];
const source = process.env.EXPO_PUBLIC_EDEUR_MODE || process.env.EXPO_PUBLIC_SUPABASE_URL || process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY || process.env.EXPO_PUBLIC_ERMS_API_URL
  ? 'PROCESS_ENV'
  : 'LOCAL_ENV_UAT_FILE';

module.exports = () => ({
  ...baseConfig,
  extra: {
    ...(baseConfig.extra ?? {}),
    canonicalUat: {
      mode: value('EXPO_PUBLIC_EDEUR_MODE') || 'UAT',
      supabaseUrl: value('EXPO_PUBLIC_SUPABASE_URL'),
      supabaseAnonKey: value('EXPO_PUBLIC_SUPABASE_ANON_KEY'),
      apiBaseUrl: value('EXPO_PUBLIC_ERMS_API_URL'),
      source,
    },
  },
});
