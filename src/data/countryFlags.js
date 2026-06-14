// countryFlags.js — country name → flag emoji lookup
// Converts ISO 3166-1 alpha-2 code to regional indicator flag emoji

const toFlag = code =>
  code.toUpperCase().replace(/./g, c => String.fromCodePoint(c.charCodeAt(0) + 127397));

const NAME_TO_CODE = {
  // ── Africa ──────────────────────────────────────────────────────────────
  'south africa':         'ZA',
  'nigeria':              'NG',
  'ghana':                'GH',
  'kenya':                'KE',
  'ethiopia':             'ET',
  'cameroon':             'CM',
  'senegal':              'SN',
  'mali':                 'ML',
  'ivory coast':          'CI',
  "cote d'ivoire":        'CI',
  'côte d\'ivoire':       'CI',
  'morocco':              'MA',
  'algeria':              'DZ',
  'tunisia':              'TN',
  'egypt':                'EG',
  'tanzania':             'TZ',
  'uganda':               'UG',
  'zimbabwe':             'ZW',
  'zambia':               'ZM',
  'mozambique':           'MZ',
  'angola':               'AO',
  'botswana':             'BW',
  'namibia':              'NA',
  'rwanda':               'RW',
  'guinea':               'GN',
  'guinea-bissau':        'GW',
  'equatorial guinea':    'GQ',
  'burkina faso':         'BF',
  'niger':                'NE',
  'sudan':                'SD',
  'south sudan':          'SS',
  'gabon':                'GA',
  'congo':                'CG',
  'republic of congo':    'CG',
  'dr congo':             'CD',
  'democratic republic of the congo': 'CD',
  'somalia':              'SO',
  'eritrea':              'ER',
  'togo':                 'TG',
  'benin':                'BJ',
  'liberia':              'LR',
  'sierra leone':         'SL',
  'gambia':               'GM',
  'the gambia':           'GM',
  'cape verde':           'CV',
  'mauritius':            'MU',
  'madagascar':           'MG',
  'malawi':               'MW',
  'lesotho':              'LS',
  'eswatini':             'SZ',
  'swaziland':            'SZ',
  'djibouti':             'DJ',
  'comoros':              'KM',
  'seychelles':           'SC',
  'libya':                'LY',
  'mauritania':           'MR',
  'central african republic': 'CF',
  'chad':                 'TD',
  'burundi':              'BI',
  'sao tome and principe':'ST',
  'western sahara':       'EH',
  // ── Rest of world ────────────────────────────────────────────────────────
  'united kingdom':       'GB',
  'england':              'GB',
  'scotland':             'GB',
  'wales':                'GB',
  'france':               'FR',
  'germany':              'DE',
  'spain':                'ES',
  'portugal':             'PT',
  'italy':                'IT',
  'netherlands':          'NL',
  'holland':              'NL',
  'belgium':              'BE',
  'brazil':               'BR',
  'argentina':            'AR',
  'colombia':             'CO',
  'mexico':               'MX',
  'usa':                  'US',
  'united states':        'US',
  'canada':               'CA',
  'australia':            'AU',
  'japan':                'JP',
  'china':                'CN',
  'south korea':          'KR',
  'korea':                'KR',
  'india':                'IN',
  'turkey':               'TR',
  'sweden':               'SE',
  'norway':               'NO',
  'denmark':              'DK',
  'switzerland':          'CH',
  'austria':              'AT',
  'poland':               'PL',
  'ukraine':              'UA',
  'russia':               'RU',
  'czech republic':       'CZ',
  'czechia':              'CZ',
  'croatia':              'HR',
  'serbia':               'RS',
  'greece':               'GR',
  'new zealand':          'NZ',
  'saudi arabia':         'SA',
  'qatar':                'QA',
  'uae':                  'AE',
  'united arab emirates': 'AE',
};

/**
 * Returns the lowercase ISO 3166-1 alpha-2 code for a country name.
 * Falls back to '' if not found.
 */
export function countryCode(name) {
  if (!name) return '';
  const key = name.trim().toLowerCase();
  const code = NAME_TO_CODE[key];
  if (code) return code.toLowerCase();
  for (const [k, v] of Object.entries(NAME_TO_CODE)) {
    if (key.includes(k) || k.includes(key)) return v.toLowerCase();
  }
  return '';
}

/**
 * Returns a flag emoji (kept for backward compat).
 * On Windows emoji flags don't render — prefer the CountryFlag component.
 */
export function countryFlag(name) {
  if (!name) return '';
  const key = name.trim().toLowerCase();
  const code = NAME_TO_CODE[key];
  if (code) return toFlag(code);
  for (const [k, v] of Object.entries(NAME_TO_CODE)) {
    if (key.includes(k) || k.includes(key)) return toFlag(v);
  }
  return '';
}
