// app/components/PetStatusBadge.js

// 1. DIRECTIVE
// "use client" ensures this component renders correctly within the Next.js App Router,
// though as a pure presentational component, it's lightweight.
"use client";

// 2. COMPONENT DEFINITION
export default function PetStatusBadge({ status }) {
  // Initialize default values (fallback state)
  let statusText = 'Unknown';
  let statusColor = 'bg-gray-500';

  // 3. STATUS LOGIC
  // Determine the badge appearance based on the specific status string
  // stored in the Pet database model.
  switch (status) {
    case 'verified':
      statusText = 'Verified';
      statusColor = 'bg-green-500'; // Green = Good/Trust
      break;
    case 'pending':
      // This usually means AI is still analyzing the certificate
      statusText = 'Pending AI Review';
      statusColor = 'bg-yellow-500'; // Yellow = Wait
      break;
    case 'needs-review':
      // AI failed or was unsure; human admin needs to look
      statusText = 'Pending Admin Review';
      statusColor = 'bg-yellow-600'; // Darker Yellow = Action Required
      break;
    case 'rejected':
      statusText = 'Rejected';
      statusColor = 'bg-red-500'; // Red = Bad
      break;
    default:
      // Fallback for pets created before verification system was added
      statusText = 'Pending';
      statusColor = 'bg-gray-400';
  }

  // 4. RENDER
  return (
    <span className={`px-2 py-1 ml-2 text-xs font-semibold text-white rounded-full ${statusColor}`}>
      {statusText}
    </span>
  );
}