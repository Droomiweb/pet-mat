// app/add-pet-profile/[petId]/page.js
"use client";
import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { useAuth } from "../../auth-provider";

export default function AddPetProfile() {
  const router = useRouter();
  const params = useParams();
  const { petId } = params;
  const { user, loading: authLoading } = useAuth();

  const [pet, setPet] = useState(null);
  const [questions, setQuestions] = useState([]);
  const [answers, setAnswers] = useState({});
  const [currentQIndex, setCurrentQIndex] = useState(0);
  
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  
  useEffect(() => {
    if (authLoading || !user || !petId) return;

    const fetchPetAndQuestions = async () => {
      try {
        setLoading(true);
        setError(null);
        
        const petRes = await fetch(`/api/pet/${petId}`);
        if (!petRes.ok) throw new Error("Failed to fetch pet details.");
        const petData = await petRes.json();
        setPet(petData);

        // --- FIX 1: Pass petBreed to the API ---
        const qRes = await fetch("/api/generate-questions", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ 
            petName: petData.name, 
            petType: petData.type,
            petBreed: petData.breed // <--- Added this
          }),
        });
        
        if (!qRes.ok) throw new Error("Failed to generate AI questions.");
        const qData = await qRes.json();
        setQuestions(qData.questions);

      } catch (err) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };

    fetchPetAndQuestions();
  }, [petId, user, authLoading]);

  const handleAnswer = (answer) => {
    const newAnswers = { ...answers, [currentQIndex]: answer };
    setAnswers(newAnswers);
    
    if (currentQIndex < questions.length - 1) {
      setCurrentQIndex(currentQIndex + 1);
    } else {
      submitProfile(newAnswers);
    }
  };

  const submitProfile = async (finalAnswers) => {
    setLoading(true);
    setError(null);
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

      if (!res.ok) throw new Error("Failed to save your AI profile.");
      
      router.push("/Profile?profile_success=true");

    } catch (err) {
      setError(err.message);
      setLoading(false);
    }
  };

  if (authLoading || loading) {
    return (
      <div className="flex flex-col justify-center items-center min-h-screen bg-[#E2F4EF]">
        <div className="loader"></div>
        <p className="text-primary font-semibold mt-4">
          {pet ? `Generating profile questions for ${pet.name}...` : "Loading..."}
        </p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex justify-center items-center min-h-screen bg-[#E2F4EF]">
        <div className="text-red-600 p-4 bg-white rounded-lg shadow-xl">{error}</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#E2F4EF] p-4 flex justify-center items-center relative pt-20">
      <div className="w-full max-w-lg my-8 glass-container shadow-2xl z-10 p-8">
        
        {questions.length > 0 && pet ? (
          <div className="flex flex-col items-center">
            <h1 className="text-primary text-2xl font-bold text-center mb-2">
              Tell us about {pet.name}
            </h1>
            <p className="text-gray-600 mb-6 text-center">
              Your answers will create a unique AI personality profile.
            </p>
            
            <div className="w-full bg-gray-200 rounded-full h-2.5 mb-6">
              <div 
                className="bg-[#4A90E2] h-2.5 rounded-full transition-all duration-300" 
                style={{ width: `${((currentQIndex + 1) / questions.length) * 100}%` }}
              ></div>
            </div>

            <div className="w-full text-center">
              <h2 className="text-xl font-semibold text-gray-800 mb-6 min-h-[60px]">
                {questions[currentQIndex]}
              </h2>
              
              <form 
                onSubmit={(e) => {
                  e.preventDefault();
                  const answer = e.target.elements.answer.value;
                  if (answer.trim()) {
                    handleAnswer(answer);
                    e.target.reset(); // <--- FIX 2: CLEARS THE TEXT AREA
                  }
                }}
                className="w-full flex flex-col items-center"
              >
                <textarea
                  name="answer"
                  rows="3"
                  className="input-style w-full"
                  placeholder="Type your answer here..."
                  required
                  // Note: We removed 'autoFocus' to prevent jumping on mobile
                ></textarea>
                <button type="submit" className="btn-primary mt-4 w-full max-w-xs">
                  {currentQIndex < questions.length - 1 ? "Next Question" : "Finish & Create Profile"}
                </button>
              </form>
            </div>
          </div>
        ) : (
          <p>No questions found.</p>
        )}
      </div>
    </div>
  );
}