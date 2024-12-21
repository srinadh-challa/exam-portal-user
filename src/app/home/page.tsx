"use client";

import React, { useState, useEffect } from "react";
import { Timer, Home, BookOpen, Brain, Code, Mail, RedoDot} from "lucide-react";

const ExamPortal = () => {
  const [timeLeft, setTimeLeft] = useState(60 * 60); // 60 minutes in seconds
  const [examStarted, setExamStarted] = useState(false);
  const [currentSection, setCurrentSection] = useState("home");
  const userEmail = "user@example.com";

  useEffect(() => {
    let timer;
    if (examStarted && timeLeft > 0) {
      timer = setInterval(() => {
        setTimeLeft((prev) => {
          if (prev <= 1) {
            clearInterval(timer);
            handleAutoSubmit();
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
    }
    return () => clearInterval(timer);
  }, [examStarted, timeLeft]);

  const formatTime = (seconds: any) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, "0")}:${secs.toString().padStart(2, "0")}`;
  };

  const handleAutoSubmit = () => {
    console.log("Auto-submitting exam...");
  };

  const handleStartExam = () => {
    setExamStarted(true);
  };

  const handleSectionChange = (section) => {
    setCurrentSection(section);
  };

  return (
    <div className="flex flex-col h-screen bg-gray-100">
      {/* Header */}
      <header className="bg-white shadow-sm">
        <div className="max-w-7xl mx-auto px-4 py-4 flex items-center justify-between">
          <div className="text-xl font-bold">LNRS Technologies</div>

          <div className="flex items-center space-x-6">
            {examStarted ? (
              <div className="flex items-center space-x-2 text-red-600">
                <Timer className="w-5 h-5" />
                <span>{formatTime(timeLeft)}</span>
              </div>
            ) : (
              <button
                onClick={handleStartExam}
                className="bg-green-600 text-white px-4 py-2 rounded hover:bg-green-700"
              >
                Start Exam
              </button>
            )}

            <div className="flex items-center space-x-2">
              <Mail className="w-5 h-5" />
              <span>{userEmail}</span>
            </div>
          </div>
        </div>
      </header>

      {/* Main Layout */}
      <div className="flex flex-1">
        {/* Sidebar */}
        <div className="w-64 bg-white shadow-lg">
          <div className="flex flex-col h-full">
            <div className="p-4">
              <button
                onClick={() => handleSectionChange("home")}
                className="flex items-center space-x-2 w-full p-2 rounded hover:bg-gray-100"
              >
                <Home className="w-5 h-5" />
                <span>Home</span>
              </button>
            </div>

            <div className="flex-1 px-4 space-y-6">
              <button
                onClick={() => handleSectionChange("mcqs")}
                className="flex items-center space-x-2 w-full p-2 rounded hover:bg-gray-100"
              >
                <BookOpen className="w-5 h-5" />
                <span>Section 1: MCQs</span>
              </button>

              <button
                onClick={() => handleSectionChange("aptitude")}
                className="flex items-center space-x-2 w-full p-2 rounded hover:bg-gray-100"
              >
                <Brain className="w-5 h-5" />
                <span>Section 2: Aptitude</span>
              </button>

              <button
                onClick={() => handleSectionChange("ai")}
                className="flex items-center space-x-2 w-full p-2 rounded hover:bg-gray-100"
              >
                <RedoDot className="w-5 h-5" />
                <span>Section 3: AI</span>
              </button>

              <button
                onClick={() => handleSectionChange("coding")}
                className="flex items-center space-x-2 w-full p-2 rounded hover:bg-gray-100"
              >
                <Code className="w-5 h-5" />
                <span>Section 4: Coding</span>
              </button>
            </div>

            <div className="p-4">
              <button
                onClick={handleAutoSubmit}
                className="w-full bg-blue-600 text-white p-2 rounded hover:bg-blue-700"
              >
                Submit Exam
              </button>
            </div>
          </div>
        </div>

        {/* Main Content */}
        <div className="flex-1">
          <main className="max-w-7xl mx-auto px-4 py-6">
            <div className="bg-white rounded-lg shadow p-6">
              <h2 className="text-xl font-semibold mb-4">
                {currentSection.charAt(0).toUpperCase() + currentSection.slice(1)}
              </h2>
              {/* Section content */}
            </div>
          </main>
        </div>
      </div>
    </div>
  );
};

export default ExamPortal;
