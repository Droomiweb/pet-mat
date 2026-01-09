// app/lib/breedGroups.js

export const BREED_COMPATIBILITY_GROUPS = {
  Dog: [
    {
      name: "Bully Breeds",
      breeds: ["Bulldog", "Bullmastiff", "Bull Mastiff", "Boxer", "Staffordshire Bull Terrier", "English Bulldog", "French Bulldog", "American Bulldog"]
    },
    {
      name: "Retrievers",
      breeds: ["Labrador Retriever", "Golden Retriever", "Labrador", "Golden"]
    },
    {
      name: "Germanic Working Dogs",
      breeds: ["German Shepherd", "Rottweiler", "Doberman Pinscher", "Doberman"]
    }
  ]
};

/**
 * Normalizes a breed name for comparison (lowercased, trimmed, and spaces removed).
 */
export function normalize(str) {
  if (!str) return "";
  return str.trim().toLowerCase().replace(/\s+/g, '');
}

/**
 * Returns an array of breeds that are compatible with the given breed.
 * Includes the breed itself.
 */
export function getCompatibleBreeds(breed, type) {
  if (!breed || !type) return [];
  
  // Normalize type (e.g., "dog" -> "Dog")
  const normalizedType = type.charAt(0).toUpperCase() + type.slice(1).toLowerCase();
  const typeGroups = BREED_COMPATIBILITY_GROUPS[normalizedType];
  if (!typeGroups) return [breed];

  // Handle comma-separated breeds (e.g., "Doberman, Doberman pinscher")
  const inputBreeds = breed.split(',').map(b => b.trim().toLowerCase());
  
  let compatibleBreeds = new Set(inputBreeds);

  inputBreeds.forEach(inputB => {
    const normB = inputB.replace(/\s+/g, '');
    const group = typeGroups.find(g => 
      g.breeds.some(b => normalize(b) === normB)
    );
    if (group) {
      group.breeds.forEach(gb => compatibleBreeds.add(gb.toLowerCase()));
    }
  });

  return Array.from(compatibleBreeds);
}
