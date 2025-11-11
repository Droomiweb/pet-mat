// app/pregnancy-support/page.js
"use client";
import { useState } from 'react';
import Link from 'next/link';
import { useAuth } from '../auth-provider';

// Simple SVG Icon components for the page
const VetIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 inline-block mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 01-3-3V5a3 3 0 116 0v3a3 3 0 01-3 3z" />
  </svg>
);
const CommunityIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 inline-block mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M17 20h5v-2a3 3 0 00-5.356-2.37M11 20H2v-2a3 3 0 015.356-2.37M14 7a4 4 0 10-8 0 4 4 0 008 0z" />
  </svg>
);

export default function PregnancySupportPage() {
  const [activeTab, setActiveTab] = useState('early');
  const { user } = useAuth();

  const tabs = [
    { id: 'early', title: 'Early Pregnancy (Weeks 1-4)' },
    { id: 'mid', title: 'Mid-Pregnancy (Weeks 5-7)' },
    { id: 'delivery', title: 'Preparing for Delivery (Weeks 8-9)' },
    { id: 'post', title: 'Post-Delivery Care' },
  ];

  return (
    <div className="min-h-screen bg-[#F4F7F9] p-4 md:p-10">
      <div className="max-w-5xl mx-auto">
        {/* Header */}
        <h1 className="text-4xl font-extrabold text-[#333333] mb-8 text-center border-b-4 border-[#4A90E2] pb-4">
          Pet Pregnancy & Delivery Support
        </h1>

        {/* Support Links */}
        <div className="grid md:grid-cols-2 gap-6 mb-10">
          <Link href="/AiDoc" className="block p-6 bg-white rounded-2xl shadow-lg hover:shadow-xl transition-shadow border-l-4 border-[#50E3C2]">
            <h2 className="text-2xl font-bold text-[#4A90E2] flex items-center"><VetIcon /> Ask Dr. Paws (AI Vet)</h2>
            <p className="text-primary mt-2">Get instant answers to your non-emergency questions about nutrition, behavior, and symptoms.</p>
          </Link>
          <Link href="/community" className="block p-6 bg-white rounded-2xl shadow-lg hover:shadow-xl transition-shadow border-l-4 border-[#FF9A00]">
            <h2 className="text-2xl font-bold text-[#333333] flex items-center"><CommunityIcon /> Community Hub</h2>
            <p className="text-primary mt-2">Share experiences and ask other pet owners for advice, support, and vet recommendations.</p>
          </Link>
        </div>

        {/* Main Content Area */}
        <div className="bg-white rounded-2xl shadow-2xl p-6 md:p-10">
          {/* Tab Navigation */}
          <div className="mb-6 border-b border-gray-200">
            <nav className="flex flex-wrap -mb-px" aria-label="Tabs">
              {tabs.map(tab => (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm mr-8 ${
                    activeTab === tab.id
                      ? 'border-[#4A90E2] text-[#4A90E2]'
                      : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                  }`}
                >
                  {tab.title}
                </button>
              ))}
            </nav>
          </div>

          {/* Tab Content */}
          <div className="text-primary leading-relaxed space-y-4">
            {activeTab === 'early' && (
              <div id="early">
                <h3 className="text-2xl font-bold text-[#333333] mb-3">Early Pregnancy: What to Expect</h3>
                <p>During the first few weeks, you may not see many changes. However, internal development is happening rapidly!</p>
                <ul className="list-disc list-inside space-y-2 pl-4 mt-4">
                  <li><strong>Nutrition:</strong> Continue with high-quality adult pet food. No major changes are needed *yet*, but avoid overfeeding.</li>
                  <li><strong>Exercise:</strong> Normal walks and playtime are perfectly fine. Avoid extremely strenuous activities or rough play.</li>
                  <li><strong>Vet Visit:</strong> Schedule a visit around week 3-4 to confirm the pregnancy via ultrasound or a blood test. This is the most important step.</li>
                  <li><strong>Behavior:</strong> You might notice slight changes, like being more affectionate or having a reduced appetite (morning sickness is real for pets, too!).</li>
                </ul>
              </div>
            )}

            {activeTab === 'mid' && (
              <div id="mid">
                <h3 className="text-2xl font-bold text-[#333333] mb-3">Mid-Pregnancy: Growth & Care</h3>
                <p>This is when you'll start to see physical changes. Your pet's appetite will increase as the babies grow.</p>
                <ul className="list-disc list-inside space-y-2 pl-4 mt-4">
                  <li><strong>Nutrition:</strong> This is the time to slowly transition to a high-quality, nutrient-dense **puppy or kitten food**. This provides the extra calories and protein she needs.</li>
                  <li><strong>Feeding Schedule:</strong> Offer smaller, more frequent meals, as her stomach capacity is reduced.</li>
                  <li><strong>Exercise:</strong> Continue with gentle walks. Avoid jumping or running. Short, calm walks are ideal.</li>
                  <li><strong>Nesting:</strong> You may notice her starting to look for a quiet, safe place to give birth. This is normal nesting behavior.</li>
                </ul>
              </div>
            )}
            
            {activeTab === 'delivery' && (
              <div id="delivery">
                <h3 className="text-2xl font-bold text-[#333333] mb-3">Preparing for Delivery (Whelping/Queening)</h3>
                <p>The time is near! Your goal is to create a safe, warm, and quiet environment.</p>
                <h4 className="text-lg font-semibold mt-4">Whelping/Nesting Box Checklist:</h4>
                <ul className="list-disc list-inside space-y-2 pl-4 mt-4">
                  <li>A comfortable, appropriately sized box (cardboard or plastic) with low sides for the mother to get in/out, but high enough to keep babies in.</li>
                  <li>Line the box with clean towels, blankets, or newspaper that can be easily changed.</li>
                  <li>Place the box in a warm, quiet, and draft-free area of your home, away from high traffic.</li>
                  <li>Have clean scissors (for umbilical cords, *only if necessary*) and unwaxed dental floss (to tie cords) sterilized and ready.</li>
                  <li>Plenty of clean, dry towels for cleaning the babies.</li>
                  <li>A heating pad (set to LOW, and placed *under* half of the nesting box) or a safe heat lamp. Babies cannot regulate their own temperature.</li>
                  <li>Your vet's emergency phone number, posted clearly nearby.</li>
                </ul>
                <h4 className="text-lg font-semibold mt-4">Signs of Labor:</h4>
                <ul className="list-disc list-inside space-y-2 pl-4 mt-4">
                  <li>Restlessness, panting, and pacing.</li>
                  <li>Loss of appetite.</li>
                  <li>A drop in rectal temperature (below 99°F / 37.2°C) usually occurs 12-24 hours before labor begins.</li>
                </ul>
              </div>
            )}
            
            {activeTab === 'post' && (
              <div id="post">
                <h3 className="text-2xl font-bold text-[#333333] mb-3">Post-Delivery & Puppy/Kitten Care</h3>
                <p>Congratulations! The mother will do most of the work, but you are her key support system.</p>
                <h4 className="text-lg font-semibold mt-4">For the Mother:</h4>
                <ul className="list-disc list-inside space-y-2 pl-4 mt-4">
                  <li>Provide constant access to fresh water and high-quality puppy/kitten food. She needs a *lot* of calories to produce milk.</li>
                  <li>She may not want to leave the babies, even to eat or use the bathroom. Bring food and water to her.</li>
                  <li>Watch for signs of complications like fever, foul-smelling discharge, or rejection of the babies. Call your vet immediately if you notice these.</li>
                </ul>
                <h4 className="text-lg font-semibold mt-4">For the Babies:</h4>
                <ul className="list-disc list-inside space-y-2 pl-4 mt-4">
                  <li>Ensure they are all nursing within the first few hours. The first milk (colostrum) is vital for immunity.</li>
                  <li>Keep them warm! This is the most critical task. Ensure the nesting box is warm and draft-free.</li>
                  <li>Check that the mother is cleaning them. If not, you may need to gently stimulate them with a warm, damp cloth to help them urinate/defecate.</li>
                  <li>Schedule a vet checkup for the mother and the entire litter within 24-48 hours of birth.</li>
                </ul>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}