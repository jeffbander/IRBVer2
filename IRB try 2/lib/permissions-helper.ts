/**
 * Helper function to check permissions in all formats
 * Handles: JSON strings, objects, and arrays
 * This ensures compatibility across the entire application
 */
export function hasPermission(permissions: any, permission: string | string[]): boolean {
  if (!permissions) return false;

  const permsToCheck = Array.isArray(permission) ? permission : [permission];

  let parsedPermissions = permissions;

  // Handle JSON string format from database (e.g., '{"view_studies": true}')
  if (typeof permissions === 'string') {
    try {
      parsedPermissions = JSON.parse(permissions);
    } catch (error) {
      console.error('Failed to parse permissions string:', error);
      return false;
    }
  }

  // Handle object format (e.g., {view_studies: true})
  if (typeof parsedPermissions === 'object' && !Array.isArray(parsedPermissions)) {
    return permsToCheck.some(perm => parsedPermissions[perm] === true);
  }

  // Handle array format (legacy)
  if (Array.isArray(parsedPermissions)) {
    return permsToCheck.some(perm => parsedPermissions.includes(perm));
  }

  return false;
}
