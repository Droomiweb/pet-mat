// app/add-pet-profile/[petId]/page.js
"use client";
import { useEffect, useState, useRef } from "react";
import { useParams, useRouter } from "next/navigation";
import { useAuth } from "../../auth-provider";

// --- ICONS ---
const ArrowRightIcon = () => <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-5 h-5"><path strokeLinecap="round" strokeLinejoin="round" d="M13.5 4.5L21 12m0 0l-7.5 7.5M21 12H3" /></svg>;
const CheckIcon = () => <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={3} stroke="currentColor" className="w-5 h-5"><path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5" /></svg>;

// --- 3D ILLUSTRATIONS ---
const ProfileIllustration = () => (
  <svg viewBox="0 0 200 200" className="w-full h-full drop-shadow-2xl">
    {/* Abstract Profile Card */}
    <rect x="40" y="30" width="120" height="150" rx="10" fill="white" className="opacity-90" />
    <circle cx="100" cy="80" r="30" fill="#4A90E2" className="opacity-20" />
    <circle cx="100" cy="80" r="25" fill="#4A90E2" />
    
    {/* Lines representing text */}
    <rect x="60" y="120" width="80" height="8" rx="4" fill="#E2E8F0" />
    <rect x="60" y="135" width="60" height="8" rx="4" fill="#E2E8F0" />
    <rect x="60" y="150" width="70" height="8" rx="4" fill="#E2E8F0" />

    {/* Floating Elements */}
    <g className="animate-bounce" style={{ animationDuration: '3s' }}>
        <text x="130" y="60" fontSize="40">❓</text>
    </g>
    <g className="animate-pulse" style={{ animationDuration: '2s' }}>
        <text x="20" y="160" fontSize="30">✨</text>
    </g>
  </svg>
);

export default function AddPetProfile() {
  const router = useRouter();
  const params = useParams();
  const { petId } = params;
  const { user, loading: authLoading } = useAuth();

  const [pet, setPet] = useState(null);
  const [questions, setQuestions] = useState([]);
  const [answers, setAnswers] = useState({});
  const [currentQIndex, setCurrentQIndex] = useState(0);
  const [currentAnswer, setCurrentAnswer] = useState("");
  
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState(null);

  // 3D Tilt
  const [rotate, setRotate] = useState({ x: 0, y: 0 });
  const cardRef = useRef(null);

  const handleMouseMove = (e) => {
    if (!cardRef.current) return;
    const card = cardRef.current;
    const rect = card.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    const centerX = rect.width / 2;
    const centerY = rect.height / 2;
    const rotateX = ((y - centerY) / centerY) * -10; 
    const rotateY = ((x - centerX) / centerX) * 10;
    setRotate({ x: rotateX, y: rotateY });
  };
  const handleMouseLeave = () => setRotate({ x: 0, y: 0 });

  useEffect(() => {
    if (authLoading || !user || !petId) return;

    const init = async () => {
      try {
        setLoading(true);
        const petRes = await fetch(`/api/pet/${petId}`);
        if (!petRes.ok) throw new Error("Failed to fetch pet.");
        const petData = await petRes.json();
        setPet(petData);

        const qRes = await fetch("/api/generate-questions", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ 
            petName: petData.name, 
            petType: petData.type,
            petBreed: petData.breed 
          }),
        });
        
        if (!qRes.ok) throw new Error("Failed to generate questions.");
        const qData = await qRes.json();
        setQuestions(qData.questions);
      } catch (err) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };
    init();
  }, [petId, user, authLoading]);

  const handleNext = (e) => {
    e.preventDefault();
    if (!currentAnswer.trim()) return;

    const newAnswers = { ...answers, [currentQIndex]: currentAnswer };
    setAnswers(newAnswers);

    if (currentQIndex < questions.length - 1) {
      // Move to next question
      setCurrentAnswer(answers[currentQIndex + 1] || ""); // Load existing if any
      setCurrentQIndex(prev => prev + 1);
    } else {
      // Submit
      submitProfile(newAnswers);
    }
  };

  const handleBack = () => {
    if (currentQIndex > 0) {
        // Save current progress before going back
        const newAnswers = { ...answers, [currentQIndex]: currentAnswer };
        setAnswers(newAnswers);
        
        setCurrentQIndex(prev => prev - 1);
        setCurrentAnswer(answers[currentQIndex - 1] || "");
    }
  };

  const submitProfile = async (finalAnswers) => {
    setSubmitting(true);
    try {
      const qaPairs = questions.map((q, index) => ({
        question: q,
        answer: finalAnswers[index] || "No answer."
      }));

      const res = await fetch("/api/generate-pet-profile", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ petId, qaPairs }),
      });

      if (!res.ok) throw new Error("Failed to save profile.");
      router.push("/Profile?profile_success=true");
    } catch (err) {
      setError(err.message);
      setSubmitting(false);
    }
  };

  if (authLoading || loading) {
    return (
        <div className="min-h-screen flex items-center justify-center bg-[#E2F4EF]">
            <div className="flex flex-col items-center gap-4">
                <div className="w-12 h-12 border-4 border-[#4A90E2] border-t-transparent rounded-full animate-spin"></div>
                <p className="text-[#4A90E2] font-bold animate-pulse">Preparing Interview...</p>
            </div>
        </div>
    );
  }

  const progressPercentage = ((currentQIndex + 1) / questions.length) * 100;
  const isLastQuestion = currentQIndex === questions.length - 1;

  return (
    <div className="min-h-screen w-full flex items-center justify-center p-0 md:p-4 relative overflow-hidden bg-[#E2F4EF]">
      
      {/* Background Animation */}
      <div className="bg-animation">
        {[...Array(6)].map((_, i) => <div key={i} className="paw-print"></div>)}
      </div>

      <div className="w-full max-w-5xl bg-white/95 md:rounded-[2.5rem] shadow-2xl overflow-hidden flex flex-col md:flex-row min-h-[100dvh] md:min-h-[600px] glass-panel z-10">

        {/* --- LEFT: 3D PANEL --- */}
        <div 
          className="w-full md:w-1/2 h-48 md:h-auto bg-gradient-to-br from-[#4A90E2] to-[#50E3C2] flex flex-col justify-center items-center p-6 relative perspective-1000 overflow-hidden shrink-0"
          onMouseMove={handleMouseMove}
          onMouseLeave={handleMouseLeave}
          style={{ perspective: "1000px" }}
        >
          <div className="absolute top-0 left-0 w-full h-full bg-[url('/imgs/pattern.png')] opacity-10 pointer-events-none"></div>

          <div 
            ref={cardRef}
            className="relative w-full max-w-xs flex flex-col items-center justify-center transition-transform duration-200 ease-out preserve-3d"
            style={{ 
              transform: `rotateX(${rotate.x}deg) rotateY(${rotate.y}deg)`,
              transformStyle: "preserve-3d"
            }}
          >
            <h2 
                className="text-2xl md:text-3xl font-extrabold mb-4 text-white drop-shadow-lg transition-all text-center"
                style={{ transform: "translateZ(60px)" }}
            >
                Getting to Know<br/>{pet?.name}
            </h2>
            
            <div 
                className="w-32 h-32 md:w-48 md:h-48 relative rounded-full border-4 md:border-8 border-white/30 shadow-2xl mb-4 bg-white/10 backdrop-blur-sm flex items-center justify-center p-4"
                style={{ transform: "translateZ(40px)" }}
            >
                <ProfileIllustration />
            </div>

            <p 
                className="text-center text-white text-sm md:text-lg font-medium opacity-90 px-2"
                style={{ transform: "translateZ(30px)" }}
            >
                "Just a few fun questions to build {pet?.name}'s unique AI personality!"
            </p>
          </div>
        </div>

        {/* --- RIGHT: QUESTION FORM --- */}
        <div className="w-full md:w-1/2 p-6 md:p-10 flex flex-col justify-center bg-white md:bg-white/60 backdrop-blur-md flex-1 rounded-t-[2rem] md:rounded-none -mt-6 md:mt-0 z-20 shadow-[0_-10px_20px_rgba(0,0,0,0.1)] md:shadow-none">
          
          {/* Header & Progress */}
          <div className="mb-8">
            <div className="flex justify-between items-end mb-2">
                <span className="text-xs font-bold text-gray-400 uppercase tracking-wider">Question {currentQIndex + 1} of {questions.length}</span>
                <span className="text-xs font-bold text-[#4A90E2]">{Math.round(progressPercentage)}%</span>
            </div>
            <div className="w-full bg-gray-200 rounded-full h-2">
                <div 
                    className="bg-gradient-to-r from-[#4A90E2] to-[#50E3C2] h-2 rounded-full transition-all duration-500 ease-out" 
                    style={{ width: `${progressPercentage}%` }}
                ></div>
            </div>
          </div>

          {/* Question Card */}
          <form onSubmit={handleNext} className="flex-1 flex flex-col">
            <div className="mb-6 flex-1">
                <h1 className="text-xl md:text-2xl font-bold text-gray-800 mb-4 leading-relaxed">
                    {questions[currentQIndex]}
                </h1>
                
                <textarea
                    autoFocus
                    value={currentAnswer}
                    onChange={(e) => setCurrentAnswer(e.target.value)}
                    placeholder="Type your answer here..."
                    className="w-full h-32 p-4 text-lg bg-white border-2 border-gray-200 rounded-2xl focus:border-[#4A90E2] focus:ring-4 focus:ring-blue-50 outline-none transition-all resize-none shadow-sm text-gray-700 placeholder-gray-400"
                    required
                />
            </div>

            {/* Actions */}
            <div className="flex gap-3 mt-auto">
                {currentQIndex > 0 && (
                    <button 
                        type="button" 
                        onClick={handleBack}
                        className="px-6 py-3 rounded-xl border-2 border-gray-200 font-bold text-gray-600 hover:bg-gray-50 transition-colors"
                    >
                        Back
                    </button>
                )}
                
                <button 
                    type="submit" 
                    disabled={!currentAnswer.trim() || submitting}
                    className="flex-1 bg-gradient-to-r from-[#4A90E2] to-[#3A75B9] hover:from-[#3A75B9] hover:to-[#2b5c94] text-white font-bold py-3 px-6 rounded-xl shadow-lg hover:shadow-xl hover:-translate-y-0.5 transition-all duration-200 disabled:opacity-50 disabled:translate-y-0 flex items-center justify-center gap-2"
                >
                    {submitting ? (
                        <>Building Profile...</>
                    ) : isLastQuestion ? (
                        <>Finish <CheckIcon /></>
                    ) : (
                        <>Next <ArrowRightIcon /></>
                    )}
                </button>
            </div>
          </form>

        </div>
      </div>
    </div>
  );
}