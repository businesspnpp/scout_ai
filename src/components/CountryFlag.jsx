// CountryFlag.jsx — renders a real flag image via flagcdn.com
import { countryCode } from '../data/countryFlags.js';

/**
 * Renders a flag image for a country name.
 * Uses flagcdn.com which works on all platforms (unlike emoji on Windows).
 *
 * @param {string} name  - Country name e.g. "South Africa"
 * @param {number} size  - Height in px (width auto-scales). Default 13.
 */
export default function CountryFlag({ name, size = 13 }) {
  const code = countryCode(name);
  if (!code) return null;
  return (
    <img
      src={`https://flagcdn.com/w40/${code}.png`}
      crossOrigin="anonymous"
      width={Math.round(size * 1.4)}
      height={size}
      alt={name}
      style={{
        display: 'inline-block',
        verticalAlign: 'middle',
        borderRadius: 1,
        objectFit: 'cover',
        flexShrink: 0,
      }}
    />
  );
}
