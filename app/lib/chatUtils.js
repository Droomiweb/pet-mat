// A helper function to create a stable, sorted conversation ID
// (petId, 'owner-uid', 'requester-uid') => "petId_owner-uid_requester-uid"
// (petId, 'requester-uid', 'owner-uid') => "petId_owner-uid_requester-uid"
// See? The result is the same.

/**
 * Creates a stable, shared conversation ID for a pet-specific chat.
 * @param {string} petId - The ID of the pet.
 * @param {string} uid1 - The first user's UID (e.g., current user).
 * @param {string} uid2 - The second user's UID (e.g., pet owner).
 * @returns {string} The stable, sorted conversation ID.
 */
export const createConversationId = (petId, uid1, uid2) => {
  if (!petId || !uid1 || !uid2) {
    throw new Error("petId, uid1, and uid2 are all required");
  }
  
  // Sort the UIDs alphabetically to ensure consistency
  const sortedUIDs = [uid1, uid2].sort();
  
  // Return the stable ID
  return `${petId}_${sortedUIDs[0]}_${sortedUIDs[1]}`;
};