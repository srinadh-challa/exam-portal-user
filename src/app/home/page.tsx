"use client";

import React, { useState, useEffect } from "react";
import { Timer, Home, BookOpen, Brain, Code, Mail, RedoDot } from "lucide-react";

const ExamPortal = () => {
  const [timeLeft, setTimeLeft] = useState(60 * 60);
  const [examStarted, setExamStarted] = useState(false);
  const [currentSection, setCurrentSection] = useState("home");
  const userEmail = "sriram.lnrs@gmail.com";

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

  const formatTime = (seconds) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, "0")}:${secs.toString().padStart(2, "0")}`;
  };

  const handleAutoSubmit = () => {
    console.log("Auto-submitting exam...");
  };

  const handleStartExam = () => {
    setExamStarted(true);
    setCurrentSection("mcqs"); // Automatically move to first section
  };

  const handleSectionChange = (section) => {
    if (!examStarted && section !== "home") {
      return; // Prevent accessing other sections before exam starts
    }
    setCurrentSection(section);
  };

  const isTimeWarning = timeLeft <= 300; // 5 minutes or less

  const renderSectionContent = () => {
    if (currentSection === "home") {
      return (
        <div className="text-center py-12">
          <h1 className="text-4xl font-bold mb-4 text-blue-600">
            Welcome to the LNRS Assessment Portal
          </h1>
          <div className="max-w-2xl mx-auto">
            <p className="text-gray-600 mb-8 text-lg">
              This assessment consists of four sections:
            </p>
            <div className="grid grid-cols-2 gap-4 mb-8">
              <div className="p-4 bg-blue-50 rounded-lg">
                <BookOpen className="w-6 h-6 text-blue-600 mx-auto mb-2" />
                <h3 className="font-semibold text-blue-600">MCQs</h3>
                <p className="text-sm text-gray-600">Multiple choice questions to test your knowledge</p>
              </div>
              <div className="p-4 bg-blue-50 rounded-lg">
                <Brain className="w-6 h-6 text-blue-600 mx-auto mb-2" />
                <h3 className="font-semibold text-blue-600">Aptitude</h3>
                <p className="text-sm text-gray-600">Logical reasoning and problem-solving skills</p>
              </div>
              <div className="p-4 bg-blue-50 rounded-lg">
                <RedoDot className="w-6 h-6 text-blue-600 mx-auto mb-2" />
                <h3 className="font-semibold text-blue-600">AI</h3>
                <p className="text-sm text-gray-600">Artificial Intelligence concepts and applications</p>
              </div>
              <div className="p-4 bg-blue-50 rounded-lg">
                <Code className="w-6 h-6 text-blue-600 mx-auto mb-2" />
                <h3 className="font-semibold text-blue-600">Coding</h3>
                <p className="text-sm text-gray-600">Programming challenges and code implementation</p>
              </div>
            </div>
            <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 mb-8 text-left">
              <h3 className="font-semibold text-yellow-800 mb-2">Important Instructions:</h3>
              <ul className="list-disc list-inside text-yellow-700 space-y-1">
                <li>You have 60 minutes to complete all sections</li>
                <li>Each section must be completed in order</li>
                <li>You cannot return to previous sections</li>
                <li>Ensure stable internet connection before starting</li>
              </ul>
            </div>
            {!examStarted && (
              <button
                onClick={handleStartExam}
                className="bg-blue-600 text-white px-8 py-3 rounded-full hover:bg-blue-700
                  transition-all hover:scale-105 active:scale-95 shadow-md text-lg"
              >
                Begin Assessment
              </button>
            )}
          </div>
        </div>
      );
    }

    return (
      <div>
        <h2 className="text-2xl font-bold mb-6 text-blue-600">
          {currentSection.charAt(0).toUpperCase() + currentSection.slice(1)}
        </h2>
        {isTimeWarning && (
          <div className="mb-4 bg-red-50 text-red-600 p-4 rounded-lg border border-red-200">
            Warning: Less than 5 minutes remaining!
          </div>
        )}
        <div className="p-4 bg-gray-50 rounded-lg">
          <p className="text-gray-600">
            Content for {currentSection} section will be displayed here.
          </p>
        </div>
      </div>
    );
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100">
      {/* Header */}
      <header className="bg-white shadow-md backdrop-blur-sm bg-opacity-90 sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <div className="h-8 w-8 bg-blue-600 rounded-lg flex items-center justify-center">
              <span className="text-white font-bold">LT</span>
            </div>
            <div className="text-xl font-bold text-blue-600">
              LNRS Technologies
            </div>
          </div>

          <div className="flex items-center space-x-6">
            {examStarted ? (
              <div className={`flex items-center space-x-2 ${isTimeWarning ? 'animate-pulse text-red-600' : 'text-blue-600'} 
                font-mono text-lg px-4 py-2 rounded-full ${isTimeWarning ? 'bg-red-50' : 'bg-blue-50'}`}>
                <Timer className="w-5 h-5" />
                <span>{formatTime(timeLeft)}</span>
              </div>
            ) : (
              <div className="text-gray-600">
                Duration: 60 minutes
              </div>
            )}

            <div className="flex items-center space-x-2 bg-gray-50 px-4 py-2 rounded-full">
              <Mail className="w-5 h-5 text-gray-600" />
              <span className="text-gray-600">{userEmail}</span>
            </div>
          </div>
        </div>
      </header>

      {/* Main Layout */}
      <div className="flex flex-1 max-w-7xl mx-auto px-4 py-6 gap-6">
        {/* Sidebar */}
        <div className="w-64">
          <div className="bg-white rounded-lg shadow-lg sticky top-24 p-4">
            <div className="flex flex-col space-y-2">
              <button
                onClick={() => handleSectionChange("home")}
                className={`flex items-center space-x-2 w-full p-3 rounded-lg transition-all
                  ${currentSection === "home" ? 'bg-blue-50 text-blue-600' : 'hover:bg-gray-50'}`}
              >
                <Home className="w-5 h-5" />
                <span className="font-medium">Home</span>
              </button>

              {["mcqs", "aptitude", "ai", "coding"].map((section, index) => (
                <button
                  key={section}
                  onClick={() => handleSectionChange(section)}
                  disabled={!examStarted}
                  className={`flex items-center space-x-2 w-full p-3 rounded-lg transition-all
                    ${currentSection === section ? 'bg-blue-50 text-blue-600' : 'hover:bg-gray-50'}
                    ${!examStarted ? 'opacity-50 cursor-not-allowed' : ''}`}
                >
                  {index === 0 && <BookOpen className="w-5 h-5" />}
                  {index === 1 && <Brain className="w-5 h-5" />}
                  {index === 2 && <RedoDot className="w-5 h-5" />}
                  {index === 3 && <Code className="w-5 h-5" />}
                  <span className="font-medium">
                    Section {index + 1}: {section.toUpperCase()}
                  </span>
                </button>
              ))}

              {examStarted && (
                <button
                  onClick={handleAutoSubmit}
                  className="mt-4 w-full bg-blue-600 text-white p-3 rounded-lg hover:bg-blue-700
                    transition-all hover:scale-105 active:scale-95 shadow-md"
                >
                  Submit Exam
                </button>
              )}
            </div>
          </div>
        </div>

        {/* Main Content */}
        <div className="flex-1">
          <div className="bg-white rounded-lg shadow-lg p-6 h-full">
            {renderSectionContent()}
          </div>
        </div>
      </div>
    </div>
  );
};

export default ExamPortal;