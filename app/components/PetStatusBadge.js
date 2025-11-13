// app/components/PetStatusBadge.js
"use client";

// This component displays a colored badge for the pet's verification status
export default function PetStatusBadge({ status }) {
  let statusText = 'Unknown';
  let statusColor = 'bg-gray-500';

  switch (status) {
    case 'verified':
      statusText = 'Verified';
      statusColor = 'bg-green-500';
      break;
    case 'pending':
      statusText = 'Pending AI Review';
      statusColor = 'bg-yellow-500';
      break;
    case 'needs-review':
      statusText = 'Pending Admin Review';
      statusColor = 'bg-yellow-600';
      break;
    case 'rejected':
      statusText = 'Rejected';
      statusColor = 'bg-red-500';
      break;
    default:
      statusText = 'Pending';
      statusColor = 'bg-gray-400';
  }

  return (
    <span className={`px-2 py-1 ml-2 text-xs font-semibold text-white rounded-full ${statusColor}`}>
      {statusText}
    </span>
  );
}