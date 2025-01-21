"use client"

import React, { useState, useEffect, useRef, ChangeEvent, useCallback } from "react";
import { Timer, Home, BookOpen, Brain, Code, Mail, RedoDot, ArrowLeft, ArrowRight, Camera, VideoOff, AlertCircle } from 'lucide-react';
import { ArrowsPointingOutIcon, ArrowsPointingInIcon } from "@heroicons/react/24/solid";

type AnswersType = {
  [key: string]: string;
};

interface TestCaseResult {
  status: "correct" | "wrong";
  actualOutput: string;
}

interface CodingQuestion {
  id: number;
  title: string;
  description: string;
  constraints: string[];
  examples: { input: string; output: string }[];
}

interface ExamSection {
  title: string;
  questions: CodingQuestion[];
}


const examSections: Record<string, ExamSection> = {
  mcqs: {
    title: "Multiple Choice Questions",
    questions: [
      { id: 1, text: "What is the capital of France?", options: ["London", "Berlin", "Paris", "Madrid"] },
      { id: 2, text: "Which programming language is known as the 'mother of all programming languages'?", options: ["C", "Assembly", "FORTRAN", "ALGOL"] },
      { id: 3, text: "Who is considered the father of computer science?", options: ["Alan Turing", "Charles Babbage", "John von Neumann", "Ada Lovelace"] },
      { id: 4, text: "What does CPU stand for?", options: ["Central Processing Unit", "Computer Processing Unit", "Central Program Utility", "Computer Program Unit"] },
      { id: 5, text: "Which company developed the Java programming language?", options: ["Microsoft", "Sun Microsystems", "IBM", "Oracle"] },
      { id: 6, text: "What is the primary function of RAM?", options: ["Permanent Storage", "Temporary Storage", "Processing Data", "Data Transfer"] },
      { id: 7, text: "What does HTML stand for?", options: ["Hyper Text Markup Language", "High Text Making Language", "Hyper Transfer Markup Language", "High Transfer Making Language"] },
      { id: 8, text: "Which protocol is used for sending emails?", options: ["HTTP", "FTP", "SMTP", "TCP"] },
      { id: 9, text: "What is the smallest unit of digital information?", options: ["Byte", "Bit", "Nibble", "Word"] },
      { id: 10, text: "Which company created React.js?", options: ["Google", "Facebook", "Amazon", "Microsoft"] },
    ]
  },
  aptitude: {
    title: "Aptitude Test",
    questions: [
      { id: 1, text: "If a train travels 420 kilometers in 7 hours, what is its speed in kilometers per hour?", options: ["50 km/h", "60 km/h", "65 km/h", "70 km/h"] },
      { id: 2, text: "A computer program runs in 0.08 seconds. How many times can it run in 2 minutes?", options: ["1200", "1500", "1800", "2000"] },
      { id: 3, text: "If 3 developers can build an app in 12 days, how many days will it take 4 developers?", options: ["9 days", "8 days", "10 days", "11 days"] },
      { id: 4, text: "What comes next in the sequence: 2, 6, 12, 20, ?", options: ["28", "30", "32", "34"] },
      { id: 5, text: "A server processes 4000 requests per minute. How many requests can it process in 2.5 hours?", options: ["600,000", "480,000", "520,000", "550,000"] },
      { id: 6, text: "Find the missing number: 8, 27, 64, ?, 216", options: ["125", "128", "132", "144"] },
      { id: 7, text: "If a code review takes 45 minutes, how many can be completed in a 6-hour workday?", options: ["8", "7", "6", "9"] },
      { id: 8, text: "What percentage of 250GB is 40GB?", options: ["16%", "20%", "15%", "18%"] },
      { id: 9, text: "Solve: (2^6 × 2^4) ÷ 2^7", options: ["8", "16", "32", "64"] },
      { id: 10, text: "If a function takes 100ms to execute, how many times can it run in 3 seconds?", options: ["30", "20", "25", "35"] }
    ]
  },
  ai: {
    title: "Artificial Intelligence",
    questions: [
      { id: 1, text: "Which of these is NOT a type of machine learning?", options: ["Supervised Learning", "Unsupervised Learning", "Peripheral Learning", "Reinforcement Learning"] },
      { id: 2, text: "What is the purpose of the activation function in neural networks?", options: ["Data Storage", "Introduce Non-linearity", "Data Cleaning", "Memory Management"] },
      { id: 3, text: "Which algorithm is commonly used for image classification?", options: ["Linear Regression", "CNN", "Decision Trees", "Bubble Sort"] },
      { id: 4, text: "What does NLP stand for in AI?", options: ["Natural Language Processing", "Neural Linear Programming", "Natural Learning Process", "Network Language Protocol"] },
      { id: 5, text: "Which loss function is typically used for binary classification?", options: ["Mean Squared Error", "Binary Cross-Entropy", "Categorical Cross-Entropy", "Hinge Loss"] },
      { id: 6, text: "What is the purpose of dropout in neural networks?", options: ["Speed up training", "Prevent overfitting", "Increase accuracy", "Data preprocessing"] },
      { id: 7, text: "Which of these is a popular deep learning framework?", options: ["Jenkins", "Docker", "TensorFlow", "Kubernetes"] },
      { id: 8, text: "What is the main purpose of feature scaling in machine learning?", options: ["Reduce memory usage", "Normalize input ranges", "Speed up processing", "Increase accuracy"] },
      { id: 9, text: "Which algorithm is used for recommendation systems?", options: ["Collaborative Filtering", "Bubble Sort", "Binary Search", "Quick Sort"] },
      { id: 10, text: "What is the purpose of backpropagation in neural networks?", options: ["Data cleaning", "Weight optimization", "Data storage", "Input validation"] }
    ]
  },
  coding: {
    title: "Coding Challenge",
    questions: [
      { id: 1, title: "Code 1", description: "Write a function to reverse a string.", constraints: ["1 <= s.length <= 10^5", "s[i] is a printable ascii character."], examples: [{ input: "hello", output: "olleh" }] },
      { id: 2, title: "Code 2", description: "Write a function to find the maximum element in an array.", constraints: ["1 <= arr.length <= 10^5", "-10^9 <= arr[i] <= 10^9"], examples: [{ input: "[1, 3, 2, 5, 4]", output: "5" }] }
    ]
  }
};

const codingQuestions = [
  {
    id: 1,
    title: "Code 1",
    description: "Write a function to reverse a string.",
    constraints: [
      "1 <= s.length <= 10^5",
      "s[i] is a printable ascii character."
    ],
    examples: [
      {
        input: "hello",
        output: "olleh"
      }
    ]
  },
  {
    id: 2,
    title: "Code 2",
    description: "Write a function to find the maximum element in an array.",
    constraints: [
      "1 <= arr.length <= 10^5",
      "-10^9 <= arr[i] <= 10^9"
    ],
    examples: [
      {
        input: "[1, 3, 2, 5, 4]",
        output: "5"
      }
    ]
  }
];

const ExamPortal = () => {
  const [timeLeft, setTimeLeft] = useState<number>(60 * 60);
  const [examStarted, setExamStarted] = useState<boolean>(false);
  const [currentSection, setCurrentSection] = useState<string>("home");
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState<number>(0);
  const [cameraEnabled, setCameraEnabled] = useState<boolean>(false);
  const [isRecording, setIsRecording] = useState<boolean>(false);
  const [cameraError, setCameraError] = useState<string | null>(null);
  const [answers, setAnswers] = useState<AnswersType>({});
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const [isContainerVisible, setIsContainerVisible] = useState(false);
  const [isSection4Visible, setIsSection4Visible] = useState(true);

  const [progress, setProgress] = useState<Record<string, number>>({
    mcqs: 0,
    aptitude: 0,
    ai: 0,
    coding: 0
  });
  
  const [code, setCode] = useState<string>("// Start coding here...");
  const [language, setLanguage] = useState<string>("Python");
  const [isFullScreen, setIsFullScreen] = useState<boolean>(false);
  const [output, setOutput] = useState<TestCaseResult[]>([]);
  const [showOutputSection, setShowOutputSection] = useState<boolean>(false);
  const [showCodingOptions, setShowCodingOptions] = useState(false);
  const [selectedCodingQuestion, setSelectedCodingQuestion] = useState<CodingQuestion | null>(null);

  const userEmail = "sriram.lnrs@gmail.com";

  const testCases = [
    { input: "i like this program very much", expected: "much very program this like i" },
    { input: "pqr mno", expected: "mno pqr" }
  ];

  // Initialize camera when exam starts
  useEffect(() => {
    if (examStarted && !cameraEnabled) {
      initializeCamera();
    }
    return () => {
      if (mediaRecorderRef.current) {
        mediaRecorderRef.current.stop();
      }
      if (videoRef.current?.srcObject instanceof MediaStream) {
        const tracks = videoRef.current.srcObject.getTracks();
        tracks.forEach(track => track.stop());
      }
    };
  }, [examStarted]);

  const initializeCamera = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: true,
        audio: true
      });
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
      }
      setCameraEnabled(true);
      startRecording(stream);
    } catch (error) {
      console.error("Error accessing camera:", error);
      setCameraError("Unable to access camera. Please ensure camera permissions are granted.");
    }
  };

  const startRecording = (stream: MediaStream) => {
    try {
      const mediaRecorder = new MediaRecorder(stream);
      mediaRecorderRef.current = mediaRecorder;

      mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          // Here you would typically send the recorded chunk to your server
          console.log("Recording data available", event.data);
        }
      };

      mediaRecorder.start(1000); // Capture in 1-second chunks
      setIsRecording(true);
    } catch (error) {
      console.error("Error starting recording:", error);
      setCameraError("Unable to start recording. Please refresh and try again.");
    }
  };


  useEffect(() => {
    let timer: NodeJS.Timeout | undefined;
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

  const formatTime = (seconds: number): string => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, "0")}:${secs.toString().padStart(2, "0")}`;
  };

  const handleAutoSubmit = () => {
    console.log("Auto-submitting exam...", answers);
  };

  const handleSubmitConfirmation = () => {
    if (window.confirm("Are you sure you want to submit your exam? This action cannot be undone.")) {
      handleAutoSubmit();
    }
  };

  const handleStartExam = () => {
    setExamStarted(true);
    setCurrentSection("mcqs");
    setCurrentQuestionIndex(0);
  };  

  const handleSectionChange = (section: keyof typeof examSections) => {
    setCurrentSection(section);
    if (section === "coding") {
      setShowCodingOptions(false);
      setIsContainerVisible(false);
      setSelectedCodingQuestion(null);
    }
  };

  const handleQuestionChange = (index: number) => {
    setCurrentQuestionIndex(index);
  };

  const handleNextQuestion = useCallback(() => {
    if (currentQuestionIndex < examSections[currentSection].questions.length - 1) {
      setCurrentQuestionIndex(currentQuestionIndex + 1);
    } else if (Object.keys(examSections).indexOf(currentSection) < Object.keys(examSections).length - 1) {
      const sections = Object.keys(examSections);
      const nextSection = sections[sections.indexOf(currentSection) + 1];
      setCurrentSection(nextSection);
      setCurrentQuestionIndex(0);
    }
  }, [currentQuestionIndex, currentSection, examSections]);

  const handlePreviousQuestion = useCallback(() => {
    if (currentQuestionIndex > 0) {
      setCurrentQuestionIndex(currentQuestionIndex - 1);
    } else if (Object.keys(examSections).indexOf(currentSection) > 0) {
      const sections = Object.keys(examSections);
      const prevSection = sections[sections.indexOf(currentSection) - 1];
      setCurrentSection(prevSection);
      setCurrentQuestionIndex(examSections[prevSection].questions.length - 1);
    }
  }, [currentQuestionIndex, currentSection, examSections]);

  const handleAnswerSelect = (questionId: number, answer: string) => {
    setAnswers(prev => ({
      ...prev,
      [`${currentSection}-${questionId}`]: answer
    }));
    setProgress(prev => ({
      ...prev,
      [currentSection]: Object.keys(answers).filter(key => key.startsWith(currentSection)).length + 1
    }));
    // Remove automatic progression
  };

  const isTimeWarning = timeLeft <= 300;

  const expectedOutputs = ["much very program this like i", "mno pqr"];

  const handleLanguageChange = (e: ChangeEvent<HTMLSelectElement>) => {
    setLanguage(e.target.value);
    setCode(`// Start coding in ${e.target.value.toLowerCase()} here...`);
  };

  const toggleFullScreen = () => {
    const compilerElement = document.getElementById('compiler-container');
    if (!compilerElement) return;

    if (!document.fullscreenElement) {
      compilerElement.requestFullscreen().catch(err => {
        console.error(`Error attempting to enable full-screen mode: ${err.message}`);
      });
    } else {
      if (document.exitFullscreen) {
        document.exitFullscreen();
      }
    }
    setIsFullScreen(!isFullScreen);
  };

  const handleRun = () => {
    const results: TestCaseResult[] = testCases.map((testCase, index) => {
      let actualOutput = ""; 
      try {
        // Here you would actually run the code against test cases
        // For demo, we'll simulate output
        actualOutput = testCase.input.split(" ").reverse().join(" ");
      } catch (error) {
        actualOutput = "Error executing code";
      }

      return {
        status: actualOutput === testCase.expected ? "correct" : "wrong",
        actualOutput
      };
    });

    setOutput(results);
    setShowOutputSection(true);
  };

  const handleReset = () => {
    setCode("// Start coding here...");
    setOutput([]);
    setShowOutputSection(false);
  };

  const handleCodingQuestionSelect = (questionId: number) => {
    const question = codingQuestions[questionId - 1];
    setSelectedCodingQuestion(question);
    setIsContainerVisible(true);
    setCode("// Write your code here..."); 
    setOutput([]);
    setShowOutputSection(false);
  };

  const handleSubmitCode = () => {
    // Here you would typically send the code to a server for evaluation
    console.log("Submitting code:", code);
    // For demonstration, we'll just show an alert
    alert("Code submitted successfully!");
  };

  useEffect(() => {
    const handleKeyPress = (event: KeyboardEvent) => {
      if (event.key === 'ArrowRight') {
        handleNextQuestion();
      } else if (event.key === 'ArrowLeft') {
        handlePreviousQuestion();
      }
    };

    window.addEventListener('keydown', handleKeyPress);

    return () => {
      window.removeEventListener('keydown', handleKeyPress);
    };
  }, [handleNextQuestion, handlePreviousQuestion]);

  return (
  <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 dark:from-gray-900 dark:to-gray-800">
    {/* Header */}
    <header className="bg-white dark:bg-gray-800 shadow-md backdrop-blur-sm bg-opacity-90 sticky top-0 z-50">
      <div className="max-w-7xl mx-auto px-4 py-4 flex items-center justify-between">
        <div className="flex items-center space-x-2">
          <div className="h-8 w-8 bg-blue-600 rounded-lg flex items-center justify-center">
            <span className="text-white font-bold">LT</span>
          </div>
          <div className="text-xl font-bold text-blue-600 dark:text-blue-400">
            LNRS Technologies
          </div>
        </div>

        <div className="flex items-center space-x-6">
          {examStarted && (
            <div className="flex items-center space-x-4">
              {/* Recording Status */}
              {isRecording && (
                <div className="flex items-center space-x-2 bg-red-50 dark:bg-red-900/30 px-3 py-2 rounded-full">
                  <div className="w-2 h-2 rounded-full bg-red-600 dark:bg-red-400 animate-pulse" />
                  <span className="text-red-600 dark:text-red-400 text-sm font-medium">Recording</span>
                </div>
              )}
            </div>
          )}

          {examStarted ? (
            <div className={`flex items-center space-x-2 ${isTimeWarning ? 'animate-pulse text-red-600 dark:text-red-400' : 'text-blue-600 dark:text-blue-400'} 
              font-mono text-lg px-4 py-2 rounded-full ${isTimeWarning ? 'bg-red-50 dark:bg-red-900/30' : 'bg-blue-50 dark:bg-blue-900/30'}`}>
              <Timer className="w-5 h-5" />
              <span>{formatTime(timeLeft)}</span>
            </div>
          ) : (
            <div className="text-gray-600 dark:text-gray-300">
              Duration: 60 minutes
            </div>
          )}

          <div className="flex items-center space-x-2">
            <div className="flex items-center space-x-2 bg-gray-50 dark:bg-gray-700 px-4 py-2 rounded-full">
              <Mail className="w-5 h-5 text-gray-600 dark:text-gray-300" />
              <span className="text-gray-600 dark:text-gray-300">{userEmail}</span>
            </div>
            <div className="flex items-center space-x-2 bg-gray-50 dark:bg-gray-700 px-3 py-2 rounded-full">
              {examStarted && (
                <div className="relative">
                  <video
                    ref={videoRef}
                    autoPlay
                    playsInline
                    muted
                    className="w-24 h-16 rounded-lg object-cover"
                  />
                  {isRecording && (
                    <div className="absolute top-1 right-1 flex items-center space-x-1 bg-black bg-opacity-50 rounded-full px-2 py-1">
                      <div className="w-2 h-2 rounded-full bg-red-600 animate-pulse" />
                      <span className="text-xs text-white">REC</span>
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </header>

    {/* Camera Error Alert */}
    {cameraError && (
      <div className="max-w-7xl mx-auto px-4 mt-4">
        <div className="bg-red-50 dark:bg-red-900/30 border border-red-200 dark:border-red-700 text-red-600 dark:text-red-400 px-4 py-3 rounded-lg flex items-center space-x-2">
          <AlertCircle className="h-4 w-4" />
          <p>{cameraError}</p>
        </div>
      </div>
    )}

    {/* Three-column Layout */}
    <div className="flex max-w-7xl mx-auto px-4 py-6 mt-16">
      {/* Column 1: Sections Menu */}
      <div className="w-48 flex-shrink-0">
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-lg sticky top-24 p-4">
          <div className="flex flex-col space-y-2">
            <button
              onClick={() => handleSectionChange("home")}
              className={`flex items-center space-x-2 w-full p-3 rounded-lg transition-all
                ${currentSection === "home" ? 'bg-blue-50 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400' : 'hover:bg-gray-50 dark:hover:bg-gray-700'}`}
            >
              <Home className="w-5 h-5" />
              <span className="font-medium">Home</span>
            </button>

            {Object.entries(examSections).map(([section, data], index) => (
              <div key={section} className="flex flex-col">
                <button
                  onClick={() => handleSectionChange(section)}
                  disabled={!examStarted}
                  className={`flex items-center justify-between w-full p-3 rounded-lg transition-all
                    ${currentSection === section ? 'bg-blue-50 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400' : 'hover:bg-gray-50 dark:hover:bg-gray-700'}
                    ${!examStarted ? 'opacity-50 cursor-not-allowed' : ''}`}
                >
                  <div className="flex items-center space-x-2">
                    {index === 0 && <BookOpen className="w-5 h-5" />}
                    {index === 1 && <Brain className="w-5 h-5" />}
                    {index === 2 && <RedoDot className="w-5 h-5" />}
                    {index === 3 && <Code className="w-5 h-5" />}
                    <span className="font-medium">Section {index + 1}</span>
                  </div>
                  <span className="text-sm">{progress[section]}/{data.questions.length}</span>
                </button>
              </div>
            ))}
            {examStarted && (
              <button onClick={handleSubmitConfirmation} className="mt-4 w-full bg-blue-600 dark:bg-blue-500 text-white p-3 rounded-lg hover:bg-blue-700 dark:hover:bg-blue-600
                  transition-all hover:scale-105 active:scale-95 shadow-md">Submit
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Column 2: Question Numbers */}
      {examStarted && currentSection !== "home" && (
        <div className="w-15 flex-shrink-0 ml-4">
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-lg sticky top-24 p-2">
            <h3 className="font-small text-gray-600 dark:text-gray-300 mb-3">Questions</h3>
            <div className="flex flex-col space-y-2">
              {examSections[currentSection].questions.map((_, idx) => (
                <button
                  key={idx}
                  onClick={() => handleQuestionChange(idx)}
                  className={`p-2 rounded-lg text-sm font-medium w-16 transition-all
                    ${currentQuestionIndex === idx
                      ? 'bg-blue-600 dark:bg-blue-500 text-white w-16'
                      : answers[`${currentSection}-${idx + 1}`]
                        ? 'bg-green-100 dark:bg-green-900/30 text-green-800 dark:text-green-400'
                        : 'bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600'
                    }`}
                >
                  {idx + 1}
                </button>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Column 3: Main Content */}
      <div className="flex-1 ml-4">
        {isSection4Visible && (
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg p-6">
            {currentSection === "home" ? (
              <div className="text-center py-12">
                <h1 className="text-4xl font-bold mb-4 text-blue-600 dark:text-blue-400">
                  Welcome to the LNRS Assessment Portal
                </h1>

                <div className="max-w-2xl mx-auto text-left mb-8 space-y-6">
                  <div className="bg-blue-50 dark:bg-blue-900/30 p-6 rounded-xl">
                    <h2 className="text-xl font-semibold mb-4 text-gray-800 dark:text-gray-100">
                      Important Instructions
                    </h2>
                    <ul className="space-y-3 text-gray-700 dark:text-gray-300">
                      <li className="flex items-start space-x-2">
                        <span className="text-blue-600 dark:text-blue-400 font-bold">•</span>
                        <span>Duration: The exam is 60 minutes long. A timer will be displayed at the top of the screen.</span>
                      </li>
                      <li className="flex items-start space-x-2">
                        <span className="text-blue-600 dark:text-blue-400 font-bold">•</span>
                        <span>Sections: The exam consists of 4 sections - MCQs, Aptitude, AI, and Coding. Each section contains 10 questions.</span>
                      </li>
                      <li className="flex items-start space-x-2">
                        <span className="text-blue-600 dark:text-blue-400 font-bold">•</span>
                        <span>Navigation: You can move between questions using the Previous/Next buttons or click question numbers directly.</span>
                      </li>
                      <li className="flex items-start space-x-2">
                        <span className="text-blue-600 dark:text-blue-400 font-bold">•</span>
                        <span>Webcam: Your webcam must be enabled throughout the exam for proctoring purposes.</span>
                      </li>
                      <li className="flex items-start space-x-2">
                        <span className="text-blue-600 dark:text-blue-400 font-bold">•</span>
                        <span>Browser: Do not close or refresh your browser during the exam. This may result in loss of answers.</span>
                      </li>
                    </ul>
                  </div>

                  <div className="bg-yellow-50 dark:bg-yellow-900/30 p-6 rounded-xl">
                    <h2 className="text-xl font-semibold mb-4 text-gray-800 dark:text-gray-100">
                      Before You Begin
                    </h2>
                    <ul className="space-y-3 text-gray-700 dark:text-gray-300">
                      <li className="flex items-start space-x-2">
                        <span className="text-yellow-600 dark:text-yellow-400 font-bold">•</span>
                        <span>Ensure you have a stable internet connection</span>
                      </li>
                      <li className="flex items-start space-x-2">
                        <span className="text-yellow-600 dark:text-yellow-400 font-bold">•</span>
                        <span>Check that your webcam is working properly</span>
                      </li>
                      <li className="flex items-start space-x-2">
                        <span className="text-yellow-600 dark:text-yellow-400 font-bold">•</span>
                        <span>Find a quiet, well-lit place to take the exam</span>
                      </li>
                      <li className="flex items-start space-x-2">
                        <span className="text-yellow-600 dark:text-yellow-400 font-bold">•</span>
                        <span>Keep your ID proof ready for verification</span>
                      </li>
                    </ul>
                  </div>
                </div>

                {!examStarted && (
                  <div className="space-y-4">
                    <p className="text-red-600 dark:text-red-400 font-medium">
                      By clicking "Begin Assessment", you agree to be monitored via webcam throughout the exam duration.
                    </p>
                    <button
                      onClick={handleStartExam}
                      className="bg-blue-600 dark:bg-blue-500 text-white px-8 py-3 rounded-full hover:bg-blue-700 dark:hover:bg-blue-600
                      transition-all hover:scale-105 active:scale-95 shadow-md text-lg"
                    >
                      Begin Assessment
                    </button>
                  </div>
                )}
              </div>
            ) : currentSection === "coding" ? (
              <div className="p-6">
                <div className="space-y-4">
                  <button
                    onClick={() => handleCodingQuestionSelect(1)}
                    className="w-full text-left p-4 rounded-lg bg-white hover:bg-gray-50 border border-gray-200 transition-colors"
                  >
                    Code 1
                  </button>
                  <button
                    onClick={() => handleCodingQuestionSelect(2)}
                    className="w-full text-left p-4 rounded-lg bg-white hover:bg-gray-50 border border-gray-200 transition-colors"
                  >
                    Code 2
                  </button>
                </div>
              </div>
            ) : (
              <div className="space-y-6">
                <div>
                  <div className="bg-white dark:bg-gray-800 rounded-lg">
                    <h3 className="text-xl font-semibold mb-4 text-gray-800 dark:text-gray-100">
                      Question {currentQuestionIndex + 1}
                    </h3>
                    <p className="text-gray-700 dark:text-gray-300 text-lg mb-6">
                      {examSections[currentSection].questions[currentQuestionIndex].text}
                    </p>
                    <div className="space-y-3">
                      {examSections[currentSection].questions[currentQuestionIndex].options.map((option, idx) => (
                        <button                          key={idx}
                          onClick={() => handleAnswerSelect(currentQuestionIndex + 1, option)}
                          className={`w-full text-left p-4 rounded-xl transition-all ${
                            answers[`${currentSection}-${currentQuestionIndex+ 1}`] === option
                              ? "bg-blue-100 dark:bg-blue-900/50 border-blue-500 dark:border-blue-400 border-2"
                              : "bg-gray-50 dark:bg-gray-700 hover:bg-gray-100 dark:hover:bg-gray-600 border-2 border-transparent"
                          }`}
                        >
                          <span className="flex items-center space-x-3">
                            <span className="w-8 h-8 flex items-center justify-center rounded-full bg-blue-50 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 font-medium">
                              {String.fromCharCode(65 + idx)}
                            </span>
                            <span className="text-gray-800 dark:text-gray-200">{option}</span>
                          </span>
                        </button>
                      ))}
                    </div>
                  </div>
                </div>
                <div className="flex justify-between items-center mt-6">
                  <button
                    onClick={handlePreviousQuestion}
                    disabled={currentQuestionIndex === 0                    && Object.keys(examSections).indexOf(currentSection) === 0}
                    className="flex items-center space-x-2 px-6 py-3 bg-gray-100 dark:bg-gray-700 rounded-lg 
                      hover:bg-gray-200 dark:hover:bg-gray-600 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
                  >
                    <ArrowLeft className="w-5 h-5" />
                    <span className="text-gray-800 dark:text-gray-200">Previous</span>
                  </button>

                  <button
                    onClick={handleNextQuestion}
                    className="flex items-center space-x-2 px-6 py-3 bg-blue-600 dark:bg-blue-500 text-white rounded-lg 
                      hover:bg-blue-700 dark:hover:bg-blue-600 transition-all"
                  >
                    <span>Next</span>
                    <ArrowRight className="w-5 h-5" />
                  </button>
                </div>
              </div>
            )}
          </div>
        )}
        {isContainerVisible && selectedCodingQuestion && (
          <div className="fixed inset-0 bg-gray-900 z-50 overflow-hidden flex">
            {/* Left side - Question */}
            <div className="w-1/3 p-6 overflow-y-auto border-r border-gray-700">
              <h2 className="text-xl font-bold text-white mb-4">{selectedCodingQuestion.title}</h2>
              <div className="space-y-6 text-gray-300">
                <p>{selectedCodingQuestion.description}</p>
                
                <div>
                  <h3 className="text-lg font-semibold mb-2">Problem Constraints</h3>
                  <ul className="list-disc pl-5 space-y-1">
                    {selectedCodingQuestion.constraints.map((constraint, idx) => (
                      <li key={idx}>{constraint}</li>
                    ))}
                  </ul>
                </div>

                <div>
                  <h3 className="text-lg font-semibold mb-2">Examples</h3>
                  {selectedCodingQuestion.examples.map((example, index) => (
                    <div key={index} className="flex space-x-4">
                      <div className="bg-gray-700 text-gray-300 p-2 rounded">Input: {example.input}</div>
                      <div className="bg-gray-700 text-gray-300 p-2 rounded">Output: {example.output}</div>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* Right side - Code Editor */}
            <div id="compiler-container" className="w-2/3 flex flex-col">
              <div className="bg-gray-800 p-2 border-b border-gray-700 flex justify-between items-center">
                <select
                  value={language}
                  onChange={handleLanguageChange}
                  className="bg-gray-700 text-gray-300 px-3 py-1 rounded outline-none"
                >
                  <option value="Python">Python</option>
                  <option value="Java">Java</option>
                  <option value="C">C</option>
                  <option value="C++">C++</option>
                  <option value="JavaScript">JavaScript</option>
                  <option value="R">R</option>
                  <option value="SQL">SQL</option>
                </select>
                <button
                  onClick={toggleFullScreen}
                  className="bg-gray-600 hover:bg-gray-700 text-white p-2 rounded"
                >
                  {isFullScreen ? (
                    <ArrowsPointingInIcon className="h-5 w-5" />
                  ) : (
                    <ArrowsPointingOutIcon className="h-5 w-5" />
                  )}
                </button>
              </div>
              
              <textarea
                className="flex-grow bg-gray-900 text-gray-300 p-4 font-mono text-sm outline-none resize-none"
                value={code}
                onChange={(e) => setCode(e.target.value)}
              />

              <div className="bg-gray-800 p-4 flex justify-between items-center">
                <button
                  onClick={() => {
                    setIsContainerVisible(false);
                    setSelectedCodingQuestion(null);
                  }}
                  className="bg-gray-600 hover:bg-gray-700 text-white px-4 py-2 rounded"
                >
                  Go Back
                </button>

                <div className="flex space-x-2">
                  <button
                    onClick={handleRun}
                    className="bg-blue-500 hover:bg-blue-600 text-white px-4 py-2 rounded"
                  >
                    Run
                  </button>
                  <button
                    onClick={handleSubmitCode}
                    className="bg-green-500 hover:bg-green-600 text-white px-4 py-2 rounded"
                  >
                    Submit
                  </button>
                  <button
                    onClick={handleReset}
                    className="bg-red-500 hover:bg-red-600 text-white px-4 py-2 rounded"
                  >
                    Reset
                  </button>
                </div>
              </div>

              {showOutputSection && (
                <div className="bg-gray-800 border-t border-gray-700 p-4 max-h-48 overflow-y-auto">
                  <h3 className="text-gray-300 text-sm font-semibold mb-2">Output</h3>
                  {output.map((result, index) => (
                    <div key={index} className="mb-2">
                      <div className="bg-gray-700 text-gray-300 p-2 rounded mb-1">
                        {`Test Case ${index + 1}`}
                      </div>
                      <div className="bg-gray-700 text-gray-300 p-2 rounded mb-1">
                        {`Expected: ${testCases[index].expected}`}
                      </div>
                      <div className="bg-gray-700 text-gray-300 p-2 rounded flex items-center">
                        {`Actual: ${result.actualOutput}`}
                        {result.status === "correct" ? (
                          <span className="text-green-500 ml-2">✅</span>
                        ) : (
                          <span className="text-red-500 ml-2">❌</span>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  </div>
  );
};

export default ExamPortal;

