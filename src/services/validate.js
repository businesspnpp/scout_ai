// validate.js — input validation at all system entry points
// Applied before any file is processed or API is called.

const ALLOWED_IMAGE_TYPES = new Set([
  'image/jpeg', 'image/jpg', 'image/png', 'image/webp',
]);

const ALLOWED_VIDEO_TYPES = new Set([
  'video/mp4', 'video/quicktime', 'video/x-msvideo',
  'video/webm', 'video/mpeg', 'video/x-matroska', 'video/ogg',
]);

const VALID_POSITIONS = new Set(['ST', 'CAM', 'CM', 'CDM', 'RW', 'LW', 'CB', 'RB', 'LB', 'GK']);

const MAX_IMAGE_MB = 20;
const MAX_VIDEO_MB = 500;

/**
 * Validate a headshot image file.
 * @param {File} file
 * @returns {string|null} error message, or null if valid
 */
export function validateHeadshotFile(file) {
  if (!file) return null;
  if (!ALLOWED_IMAGE_TYPES.has(file.type)) {
    return `Invalid image type "${file.type}". Use JPEG, PNG, or WebP.`;
  }
  if (file.size > MAX_IMAGE_MB * 1_048_576) {
    return `Image too large (${(file.size / 1_048_576).toFixed(1)} MB). Max ${MAX_IMAGE_MB} MB.`;
  }
  return null;
}

/**
 * Validate a video file before processing or upload.
 * @param {File} file
 * @returns {string|null} error message, or null if valid
 */
export function validateVideoFile(file) {
  if (!file) return null;
  // Allow empty type (some drag-dropped files report no MIME), but reject clearly wrong types
  if (file.type && !ALLOWED_VIDEO_TYPES.has(file.type) && !file.type.startsWith('video/')) {
    return `Invalid file type "${file.type}". Use MP4, MOV, WebM, or AVI.`;
  }
  if (file.size > MAX_VIDEO_MB * 1_048_576) {
    return `Video too large (${(file.size / 1_048_576).toFixed(1)} MB). Max ${MAX_VIDEO_MB} MB.`;
  }
  if (file.size === 0) {
    return 'Video file is empty.';
  }
  return null;
}

/**
 * Validate the player form fields before analysis.
 * @param {{ name: string, age: string, position: string, region: string }} form
 * @returns {string[]} array of error messages (empty = valid)
 */
export function validatePlayerForm(form) {
  const errors = [];

  const name = (form.name ?? '').trim();
  if (!name) {
    errors.push('Player name is required.');
  } else if (name.length < 2) {
    errors.push('Player name must be at least 2 characters.');
  } else if (name.length > 100) {
    errors.push('Player name must be under 100 characters.');
  }

  if (form.age) {
    const age = parseInt(form.age, 10);
    if (isNaN(age) || age < 14 || age > 45) {
      errors.push('Age must be a number between 14 and 45.');
    }
  }

  if (form.position && !VALID_POSITIONS.has(form.position)) {
    errors.push('Invalid position. Choose from: ST, CAM, CM, CDM, RW, LW, CB, RB, LB, GK.');
  }

  if (form.region && form.region.length > 150) {
    errors.push('Region must be under 150 characters.');
  }

  return errors;
}
