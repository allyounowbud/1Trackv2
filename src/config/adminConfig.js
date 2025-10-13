/**
 * Admin Configuration
 * Add admin email addresses here to grant admin access
 */

// List of admin email addresses (case-insensitive)
export const ADMIN_EMAILS = [
  // Add your admin emails here
  'admin@1track.com',
  'allyounowbud@gmail.com',
  'cjbal@example.com', // Add your email here if different
  // Add more admin emails as needed
];

// Admin user metadata keys to check
export const ADMIN_METADATA_KEYS = {
  role: 'admin',
  admin: true,
  isAdmin: true
};

// Database table and column for admin check (if using database-based admin)
// Disabled since users table doesn't exist in current schema
export const ADMIN_DATABASE_CONFIG = {
  table: null, // Set to null to disable database admin check
  column: null
};

// Admin permissions configuration
export const ADMIN_PERMISSIONS = {
  canManageDatabase: true,
  canManagePricing: true,
  canViewSystemHealth: true,
  canManageUsers: false, // Set to true if you want admin user management
  canAccessLogs: false   // Set to true if you want admin log access
};
