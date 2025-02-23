"use client"
import type React from "react"
import { useState, useEffect, useRef, useCallback } from "react"
import axios from "axios"
import {
  Timer,
  Home,
  BookOpen,
  Brain,
  Code,
  Mail,
  RedoDot,
  ArrowLeft,
  AlertCircle,
  Camera,
  ArrowRight,
} from "lucide-react"
import { ArrowsPointingOutIcon, ArrowsPointingInIcon } from "@heroicons/react/24/solid"
import { toast, ToastContainer } from "react-toastify"
import "react-toastify/dist/ReactToastify.css"
import MonacoEditor from "@monaco-editor/react"

const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:5000/api"

interface Question {
  _id: string
  text: string
  options?: string[]
  section: string
  testCases?: {
    input: string
    output: string
  }[]
}

interface TestCaseResult {
  status: "correct" | "wrong" | "running"
  actualOutput: string
  expectedOutput?: string
  testCaseNumber?: number
  executionTime?: number
}

interface ExamSection {
  title: string
  questions: Question[]
}

interface CompilationResult {
  output: string
  error: string | null
  testCaseResults?: TestCaseResult[]
}

function ExamPortal() {
  const [isMobileDevice, setIsMobileDevice] = useState<boolean>(false)
  const [timeLeft, setTimeLeft] = useState<number>(60 * 60)
  const [examStarted, setExamStarted] = useState<boolean>(false)
  const [currentSection, setCurrentSection] = useState<string>("home")
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState<number>(0)
  const [isRecording, setIsRecording] = useState<boolean>(false)
  const [cameraError, setCameraError] = useState<string | null>(null)
  const [answers, setAnswers] = useState<Record<string, string>>({})
  const [examSections, setExamSections] = useState<Record<string, ExamSection>>({})
  const [isLoading, setIsLoading] = useState<boolean>(true)
  const videoRef = useRef<HTMLVideoElement>(null)
  const mediaRecorderRef = useRef<MediaRecorder | null>(null)
  const [isFullScreen, setIsFullScreen] = useState<boolean>(false)
  const [code, setCode] = useState<string>("// Start coding here...")
  const [showOutputSection, setShowOutputSection] = useState<boolean>(false)
  const [isContainerVisible, setIsContainerVisible] = useState(false)
  const [language, setLanguage] = useState<string>("javascript")
  const [selectedCodingQuestion, setSelectedCodingQuestion] = useState<Question | null>(null)
  const [isFullScreenExam, setIsFullScreenExam] = useState<boolean>(false)
  const [examId, setExamId] = useState<string | null>(null)
  const [examCompleted, setExamCompleted] = useState<boolean>(false)
  const [userEmail, setUserEmail] = useState<string>("")
  const [isCameraReady, setIsCameraReady] = useState<boolean>(false)
  const [recordedChunks, setRecordedChunks] = useState<Blob[]>([])
  const [compilationResult, setCompilationResult] = useState<CompilationResult | null>(null)
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false)
  const [currentTestCase, setCurrentTestCase] = useState<number>(0)
  const [testCaseProgress, setTestCaseProgress] = useState<{
    total: number
    passed: number
    running: boolean
  }>({ total: 0, passed: 0, running: false })
  const [testResults, setTestResults] = useState<TestCaseResult[]>([])
  const [tabSwitchCount, setTabSwitchCount] = useState<number>(0)

  const [progress, setProgress] = useState<Record<string, number>>({
    mcqs: 0,
    aptitude: 0,
    ai: 0,
    coding: 0,
  })

  useEffect(() => {
    const isMobile = () => {
      return /Android|iOS|iPad|iPhone|iPod/i.test(navigator.userAgent)
    }
    setIsMobileDevice(isMobile())
  }, [])

  useEffect(() => {
    if (examStarted) {
      const handleVisibilityChange = () => {
        if (document.hidden) {
          setTabSwitchCount((prevCount) => {
            const newCount = prevCount + 1
            if (newCount >= 3) {
              handleAutoSubmit()
              toast.error("Exam terminated due to multiple tab switches.")
            } else {
              toast.warning(`Warning: Tab switch detected. ${3 - newCount} more will terminate the exam.`)
            }
            return newCount
          })
        }
      }

      document.addEventListener("visibilitychange", handleVisibilityChange)

      return () => {
        document.removeEventListener("visibilitychange", handleVisibilityChange)
      }
    }
  }, [examStarted])

  // Add this useEffect hook near the other useEffect hooks
  useEffect(() => {
    if (examStarted) {
      console.log(`Tab switch count: ${tabSwitchCount}`)
    }
  }, [examStarted, tabSwitchCount])

  // Updated uploadRecording function with retry mechanism
  const uploadRecording = useCallback(
    async (retries = 3) => {
      if (recordedChunks.length === 0 || !examId) return

      try {
        const blob = new Blob(recordedChunks, { type: "video/webm" })
        const formData = new FormData()
        formData.append("video", blob, "recording.webm")

        const token = localStorage.getItem("token")
        if (!token) {
          throw new Error("Authentication token not found")
        }

        await axios.post(`${API_URL}/exams/${examId}/recording`, formData, {
          headers: {
            Authorization: `Bearer ${token}`,
            "Content-Type": "multipart/form-data",
          },
          timeout: 60000,
        })

        toast.success("Video recording uploaded successfully")
      } catch (error) {
        console.error("Failed to upload recording:", error)
        if (retries > 0) {
          toast.info("Retrying video upload...")
          await new Promise((resolve) => setTimeout(resolve, 2000))
          return uploadRecording(retries - 1)
        }
        if (axios.isAxiosError(error)) {
          if (error.code === "ECONNABORTED") {
            toast.error("Video upload timed out. The exam will be submitted without the video.")
          } else if (error.response?.status === 500) {
            console.error("Server error details:", error.response?.data)
            toast.error("Server error during video upload. The exam will be submitted without the video.")
          } else {
            toast.error(`Failed to upload recording: ${error.response?.data?.message || "Please try again."}`)
          }
        } else {
          toast.error("Failed to upload recording. The exam will be submitted without the video.")
        }
      } finally {
        setRecordedChunks([])
      }
    },
    [recordedChunks, examId],
  )

  // Updated handleAutoSubmit function with improved error handling and retry mechanism
  const handleAutoSubmit = useCallback(
    async (retries = 3) => {
      if (!examId || isSubmitting) return

      setIsSubmitting(true)
      try {
        const token = localStorage.getItem("token")
        if (!token) {
          throw new Error("Authentication token not found. Please log in again.")
        }

        if (mediaRecorderRef.current && mediaRecorderRef.current.state === "recording") {
          mediaRecorderRef.current.stop()
        }

        await uploadRecording()

        const response = await axios.post(
          `${API_URL}/exams/${examId}/end`,
          {},
          {
            headers: {
              Authorization: `Bearer ${token}`,
            },
            timeout: 30000,
          },
        )

        if (response.data.success) {
          setExamCompleted(true)
          toast.success("Exam submitted successfully")
        } else {
          throw new Error(response.data.message || "Failed to submit exam")
        }
      } catch (error) {
        console.error("Error auto-submitting exam:", error)
        if (retries > 0) {
          toast.info("Retrying exam submission...")
          await new Promise((resolve) => setTimeout(resolve, 2000))
          setIsSubmitting(false)
          return handleAutoSubmit(retries - 1)
        }
        if (axios.isAxiosError(error)) {
          if (error.code === "ECONNABORTED") {
            toast.error("Exam submission timed out. Please try again or contact support.")
          } else if (error.response) {
            console.error("Server error details:", error.response.data)
            toast.error(`Failed to submit exam: ${error.response.data.message || "Server error occurred"}`)
          } else {
            toast.error("Network error. Please check your connection and try again.")
          }
        } else if (error instanceof Error) {
          toast.error(`Failed to submit exam: ${error.message}`)
        } else {
          toast.error("Failed to submit exam. Please try again or contact support.")
        }
      } finally {
        setIsSubmitting(false)
      }
    },
    [examId, uploadRecording, isSubmitting],
  )

  // Load user email
  useEffect(() => {
    const storedEmail = localStorage.getItem("userEmail")
    if (storedEmail) {
      setUserEmail(storedEmail)
    }
  }, [])

  // Fetch questions
  useEffect(() => {
    const fetchQuestions = async () => {
      try {
        setIsLoading(true)
        const token = localStorage.getItem("token")
        if (!token) {
          throw new Error("No authentication token found")
        }

        const response = await axios.get(`${API_URL}/questions/user`, {
          headers: { Authorization: `Bearer ${token}` },
        })
        const questions = response.data.data

        const sections: Record<string, ExamSection> = {
          mcqs: { title: "Multiple Choice Questions", questions: [] },
          aptitude: { title: "Aptitude Test", questions: [] },
          ai: { title: "Artificial Intelligence", questions: [] },
          coding: { title: "Coding Challenge", questions: [] },
        }

        questions.forEach((question: Question) => {
          if (sections[question.section]) {
            sections[question.section].questions.push(question)
          }
        })

        setExamSections(sections)
      } catch (error) {
        console.error("Error fetching questions:", error)
        toast.error("Failed to load questions. Please try again.")
      } finally {
        setIsLoading(false)
      }
    }

    fetchQuestions()
  }, [])

  // Timer effect
  useEffect(() => {
    let timer: NodeJS.Timeout | undefined
    if (examStarted && timeLeft > 0) {
      timer = setInterval(() => {
        setTimeLeft((prev) => {
          if (prev <= 1) {
            clearInterval(timer)
            handleAutoSubmit()
            return 0
          }
          return prev - 1
        })
      }, 1000)
    }
    return () => clearInterval(timer)
  }, [examStarted, timeLeft, handleAutoSubmit])

  // Check camera permissions
  const checkPermissions = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: true, audio: true })
      stream.getTracks().forEach((track) => track.stop())
      return true
    } catch (error) {
      console.error("Permission check failed:", error)
      setCameraError("Please allow camera and microphone access.")
      return false
    }
  }

  // Start recording
  const startRecording = useCallback(
    (stream: MediaStream) => {
      if (!examId) return

      try {
        const options = { mimeType: "video/webm;codecs=vp8,opus" }

        if (!MediaRecorder.isTypeSupported(options.mimeType)) {
          options.mimeType = "video/webm"
        }

        const mediaRecorder = new MediaRecorder(stream, options)
        mediaRecorderRef.current = mediaRecorder

        const tempChunks: Blob[] = []

        mediaRecorder.ondataavailable = (event) => {
          if (event.data.size > 0) {
            tempChunks.push(event.data)
          }
        }

        mediaRecorder.onstop = async () => {
          if (tempChunks.length > 0) {
            setRecordedChunks(tempChunks)
            await uploadRecording()
          }
        }

        mediaRecorder.start()
        setIsRecording(true)
      } catch (error) {
        console.error("Error starting recording:", error)
        setCameraError("Unable to start recording. Please refresh and try again.")
        setIsRecording(false)
      }
    },
    [examId, uploadRecording],
  )

  // Initialize camera
  const initializeCamera = useCallback(async () => {
    if (videoRef.current?.srcObject instanceof MediaStream) {
      videoRef.current.srcObject.getTracks().forEach((track) => track.stop())
    }

    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: true, audio: true })

      if (videoRef.current) {
        videoRef.current.srcObject = stream
        videoRef.current.onloadedmetadata = () => {
          videoRef.current?.play().catch((error) => {
            console.error("Error playing video:", error)
            setCameraError("Error playing video. Check camera settings.")
          })
        }
      }

      setIsCameraReady(true)
      setCameraError(null)
      startRecording(stream)
    } catch (error) {
      console.error("Camera initialization failed:", error)
      setCameraError("Failed to access the camera. Ensure permissions are granted.")
    }
  }, [startRecording])

  // Camera effect
  useEffect(() => {
    if (examStarted && !isCameraReady) {
      initializeCamera()
    }

    return () => {
      if (videoRef.current?.srcObject instanceof MediaStream) {
        videoRef.current.srcObject.getTracks().forEach((track) => track.stop())
      }
    }
  }, [examStarted, isCameraReady, initializeCamera])

  // Modify the handleStartExam function to call toggleFullScreenExam
  const handleStartExam = async () => {
    try {
      setIsLoading(true)

      const token = localStorage.getItem("token")
      if (!token) {
        throw new Error("Authentication token not found. Please log in again.")
      }

      const hasPermissions = await checkPermissions()
      if (!hasPermissions) {
        throw new Error("Camera and microphone permissions are required to start the exam.")
      }

      const response = await axios.post(
        `${API_URL}/exams/start`,
        { duration: 60 },
        {
          headers: {
            Authorization: `Bearer ${token}`,
            "Content-Type": "application/json",
          },
        },
      )

      if (response.data && response.data.exam && response.data.exam._id) {
        setExamId(response.data.exam._id)
        setExamStarted(true)
        setCurrentSection("mcqs")
        await initializeCamera()

        // Call toggleFullScreenExam here
        await toggleFullScreenExam()
      } else {
        throw new Error("Invalid response from server")
      }
    } catch (error) {
      console.error("Error starting exam:", error)
      if (error instanceof Error) {
        toast.error(error.message)
      } else {
        toast.error("Failed to start exam. Please check your connection and try again.")
      }
    } finally {
      setIsLoading(false)
    }
  }

  // Submit answer
  const handleAnswerSubmit = async (questionId: string, answer: string) => {
    if (!examId) {
      console.error("Exam ID is not set")
      toast.error("Unable to submit answer. Please try again.")
      return
    }

    try {
      const token = localStorage.getItem("token")
      if (!token) {
        throw new Error("Authentication token not found. Please log in again.")
      }

      const currentQuestion = examSections[currentSection]?.questions[currentQuestionIndex]
      if (!currentQuestion) {
        throw new Error("Invalid question")
      }

      const response = await axios.post(
        `${API_URL}/exams/${examId}/answer`,
        {
          questionId: currentQuestion._id,
          section: currentSection,
          questionNumber: currentQuestionIndex + 1,
          answer,
        },
        {
          headers: {
            Authorization: `Bearer ${token}`,
            "Content-Type": "application/json",
          },
        },
      )

      if (response.status === 200) {
        setAnswers((prev) => ({
          ...prev,
          [questionId]: answer,
        }))
      } else {
        throw new Error("Unexpected response from server")
      }
    } catch (error) {
      console.error("Error submitting answer:", error)
      if (axios.isAxiosError(error)) {
        if (error.response?.status === 500) {
          console.error("Server error details:", error.response.data)
          toast.error("Server error. Please try submitting again.")
        } else {
          toast.error(`Failed to submit answer: ${error.response?.data?.message || "Please try again."}`)
        }
      } else {
        toast.error("Failed to submit answer. Please try again.")
      }
    }
  }

  // Submit confirmation
  const handleSubmitConfirmation = () => {
    if (window.confirm("Are you sure you want to submit your exam? This action cannot be undone.")) {
      handleAutoSubmit().catch((error) => {
        console.error("Error during manual submission:", error)
        toast.error("Failed to submit exam. Please try again or contact support.")
      })
    }
  }

  // Format time
  const formatTime = (seconds: number): string => {
    const mins = Math.floor(seconds / 60)
    const secs = seconds % 60
    return `${mins.toString().padStart(2, "0")}:${secs.toString().padStart(2, "0")}`
  }

  // Section change
  const handleSectionChange = (section: string) => {
    setCurrentSection(section)
    setCurrentQuestionIndex(0)
    if (section === "coding") {
      setIsContainerVisible(false)
      setSelectedCodingQuestion(null)
    }
  }

  // Question change
  const handleQuestionChange = (index: number) => {
    setCurrentQuestionIndex(index)
  }

  // Next question
  const handleNextQuestion = useCallback(() => {
    if (currentQuestionIndex < (examSections[currentSection]?.questions?.length || 0) - 1) {
      setCurrentQuestionIndex(currentQuestionIndex + 1)
    } else {
      const sections = Object.keys(examSections)
      const currentIndex = sections.indexOf(currentSection)
      if (currentIndex < sections.length - 1) {
        setCurrentSection(sections[currentIndex + 1])
        setCurrentQuestionIndex(0)
      }
    }
  }, [examSections, currentSection, currentQuestionIndex])

  // Previous question
  const handlePreviousQuestion = useCallback(() => {
    if (currentQuestionIndex > 0) {
      setCurrentQuestionIndex(currentQuestionIndex - 1)
    } else {
      const sections = Object.keys(examSections)
      const currentIndex = sections.indexOf(currentSection)
      if (currentIndex > 0) {
        setCurrentSection(sections[currentIndex - 1])
        setCurrentQuestionIndex((examSections[sections[currentIndex - 1]]?.questions?.length || 1) - 1)
      }
    }
  }, [examSections, currentSection, currentQuestionIndex])

  // Answer select
  const handleAnswerSelect = async (answer: string) => {
    const questionId = `${currentSection}-${currentQuestionIndex + 1}`
    await handleAnswerSubmit(questionId, answer)
    setProgress((prev) => ({
      ...prev,
      [currentSection]: Object.keys(answers).filter((key) => key.startsWith(currentSection)).length + 1,
    }))
  }

  // Code submit
  const handleCodeSubmit = async () => {
    if (!examId || !selectedCodingQuestion) return

    try {
      const token = localStorage.getItem("token")
      if (!token) {
        throw new Error("Authentication token not found. Please log in again.")
      }
      await axios.post(
        `${API_URL}/exams/${examId}/answer`,
        {
          questionId: selectedCodingQuestion._id,
          section: "coding",
          questionNumber: currentQuestionIndex + 1,
          code,
          language,
        },
        {
          headers: {
            Authorization: `Bearer ${token}`,
            "Content-Type": "application/json",
          },
        },
      )
      toast.success("Code submitted successfully!")
    } catch (error) {
      console.error("Error submitting code:", error)
      if (axios.isAxiosError(error) && error.response) {
        toast.error(`Failed to submit code: ${error.response.data.message}`)
      } else {
        toast.error("Failed to submit code. Please try again.")
      }
    }
  }

  // Run code
  const handleRun = async () => {
    if (!selectedCodingQuestion) return

    setCompilationResult(null)
    setShowOutputSection(true)
    setTestResults([])
    setTestCaseProgress({
      total: selectedCodingQuestion.testCases?.length || 0,
      passed: 0,
      running: true,
    })

    try {
      const token = localStorage.getItem("token")
      if (!token) {
        throw new Error("Authentication token not found")
      }

      const testCases = selectedCodingQuestion.testCases || []
      const results: TestCaseResult[] = []

      for (let i = 0; i < testCases.length; i++) {
        setCurrentTestCase(i)
        const testCase = testCases[i]

        // Set current test case as running
        const runningResult: TestCaseResult = {
          status: "running",
          actualOutput: "Running test case...",
          testCaseNumber: i + 1,
        }
        setTestResults([...results, runningResult])

        const response = await axios.post(
          `${API_URL}/exams/compile`,
          {
            code,
            language,
            stdin: testCase.input,
          },
          {
            headers: {
              Authorization: `Bearer ${token}`,
              "Content-Type": "application/json",
            },
          },
        )

        const actualOutput = response.data.output.trim()
        const expectedOutput = testCase.output.trim()
        const status: "correct" | "wrong" = actualOutput === expectedOutput ? "correct" : "wrong"

        const result: TestCaseResult = {
          status,
          actualOutput,
          expectedOutput,
          testCaseNumber: i + 1,
          executionTime: response.data.executionTime || 0,
        }

        results.push(result)
        setTestResults(results)

        setTestCaseProgress((prev) => ({
          ...prev,
          passed: results.filter((r) => r.status === "correct").length,
        }))

        // If test case fails, stop processing further test cases
        if (status === "wrong") break
      }

      setCompilationResult({
        output: results.every((r) => r.status === "correct")
          ? "All test cases passed successfully!"
          : `${results.filter((r) => r.status === "correct").length} out of ${testCases.length} test cases passed.`,
        error: null,
        testCaseResults: results,
      })
    } catch (error) {
      console.error("Error running code:", error)
      const errorResult: TestCaseResult = {
        status: "wrong",
        actualOutput: "Test case failed due to error",
        testCaseNumber: currentTestCase + 1,
      }
      setCompilationResult({
        output: "",
        error:
          error instanceof Error
            ? `Error running code: ${error.message}`
            : "An unknown error occurred while running the code",
        testCaseResults: [errorResult],
      })
    } finally {
      setTestCaseProgress((prev) => ({ ...prev, running: false }))
    }
  }

  // Reset code
  const handleReset = () => {
    setCode("// Start coding here...")
    setTestResults([])
    setShowOutputSection(false)
    setCompilationResult(null)
  }

  // Language change
  const handleLanguageChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    setLanguage(e.target.value)
    setCode(`// Start coding in ${e.target.value} here...`)
  }

  // Toggle full screen
  const toggleFullScreen = () => {
    const compilerElement = document.getElementById("compiler-container")
    if (!compilerElement) return

    if (!document.fullscreenElement) {
      compilerElement.requestFullscreen().catch((error) => {
        console.error(`Error attempting to enable full-screen mode: ${error.message}`)
      })
    } else {
      if (document.exitFullscreen) {
        document.exitFullscreen()
      }
    }
    setIsFullScreen(!isFullScreen)
  }

  // Toggle full screen exam
  const toggleFullScreenExam = async () => {
    try {
      if (!document.fullscreenElement) {
        await document.documentElement.requestFullscreen()
      } else {
        if (document.exitFullscreen) {
          await document.exitFullscreen()
        }
      }
      setIsFullScreenExam(!isFullScreenExam)
    } catch (error) {
      console.error("Error toggling full-screen mode:", error)
      toast.error(
        "Unable to toggle full-screen mode. Please ensure you&apos;re using a compatible browser and try again.",
      )
    }
  }

  // Select coding question
  const handleCodingQuestionSelect = (question: Question) => {
    setSelectedCodingQuestion(question)
    setCurrentQuestionIndex(examSections.coding?.questions.findIndex((q) => q._id === question._id) ?? 0)
    setCode(
      `// Write your code here for Question ${examSections.coding?.questions.findIndex((q) => q._id === question._id) + 1}:\n// ${question.text}\n\n`,
    )
    setTestResults([])
    setShowOutputSection(false)
    setCompilationResult(null)
  }

  // Keyboard navigation
  useEffect(() => {
    const handleKeyPress = (event: KeyboardEvent) => {
      if (event.key === "ArrowRight") {
        handleNextQuestion()
      } else if (event.key === "ArrowLeft") {
        handlePreviousQuestion()
      }
    }

    window.addEventListener("keydown", handleKeyPress)
    return () => window.removeEventListener("keydown", handleKeyPress)
  }, [handleNextQuestion, handlePreviousQuestion])

  if (isMobileDevice) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-gray-50 to-gray-100 dark:from-gray-900 dark:to-gray-800">
        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg p-8 text-center max-w-md">
          <h1 className="text-2xl font-bold mb-4 text-red-600 dark:text-red-400">Mobile Access Restricted</h1>
          <p className="text-gray-700 dark:text-gray-300 mb-6">
            We&apos;re sorry, but this exam portal is not accessible on mobile devices. Please use a desktop or laptop
            computer to take the exam.
          </p>
          <p className="text-sm text-gray-600 dark:text-gray-400">
            If you believe this is an error, please contact support.
          </p>
        </div>
      </div>
    )
  }

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-xl">Loading exam questions...</div>
      </div>
    )
  }

  if (examCompleted) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-gray-50 to-gray-100 dark:from-gray-900 dark:to-gray-800">
        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg p-12 text-center">
          <h1 className="text-4xl font-bold mb-4 text-blue-600 dark:text-blue-400">
            Thank You for Completing the Exam
          </h1>
          <p className="text-xl text-gray-700 dark:text-gray-300 mb-8">
            Your responses have been successfully submitted.
          </p>
          <p className="text-lg text-gray-600 dark:text-gray-400 mb-8">
            You may now close this window or return to the dashboard.
          </p>
          <button
            onClick={() => window.close()}
            className="bg-blue-600 dark:bg-blue-500 text-white px-8 py-3 rounded-full hover:bg-blue-700 dark:hover:bg-blue-600 transition-all"
          >
            Close Window
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 dark:from-gray-900 dark:to-gray-800">
      <ToastContainer
        position="top-right"
        autoClose={5000}
        hideProgressBar={false}
        newestOnTop
        closeOnClick
        rtl={false}
        pauseOnFocusLoss
        draggable
        pauseOnHover
      />
      {/* Header */}
      <header className="bg-white dark:bg-gray-800 shadow-md backdrop-blur-sm bg-opacity-90 sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <div className="h-8 w-8 bg-blue-600 rounded-lg flex items-center justify-center">
              <span className="text-white font-bold">LT</span>
            </div>
            <div className="text-xl font-bold text-blue-600 dark:text-blue-400">LNRS Technologies</div>
          </div>

          <div className="flex items-center space-x-6">
            {examStarted && isRecording && (
              <div className="flex items-center space-x-2 bg-red-50 dark:bg-red-900/30 px-3 py-2 rounded-full">
                <div className="w-2 h-2 rounded-full bg-red-600 dark:bg-red-400 animate-pulse" />
                <span className="text-red-600 dark:text-red-400 text-sm font-medium">Recording</span>
              </div>
            )}

            {examStarted ? (
              <div
                className={`flex items-center space-x-2 ${
                  timeLeft <= 300 ? "animate-pulse text-red-600 dark:text-red-400" : "text-blue-600 dark:text-blue-400"
                } 
          font-mono text-lg px-4 py-2 rounded-full ${
            timeLeft <= 300 ? "bg-red-50 dark:bg-red-900/30" : "bg-blue-50 dark:bg-blue-900/30"
          }`}
              >
                <Timer className="w-5 h-5" />
                <span>{formatTime(timeLeft)}</span>
              </div>
            ) : (
              <div className="text-gray-600 dark:text-gray-300">Duration: 60 minutes</div>
            )}

            <div className="flex items-center space-x-2">
              <div className="flex items-center space-x-2 bg-gray-50 dark:bg-gray-700 px-4 py-2 rounded-full">
                <Mail className="w-5 h-5 text-gray-600 dark:text-gray-300" />
                <span className="text-gray-600 dark:text-gray-300">{userEmail}</span>
              </div>
              {examStarted && (
                <div className="relative">
                  {isCameraReady ? (
                    <video
                      ref={videoRef}
                      autoPlay
                      playsInline
                      muted
                      className="w-32 h-24 rounded-lg object-cover border-2 border-blue-500"
                    />
                  ) : (
                    <div className="w-32 h-24 rounded-lg bg-gray-200 dark:bg-gray-700 flex items-center justify-center">
                      <Camera className="w-8 h-8 text-gray-400" />
                    </div>
                  )}
                  {isRecording && (
                    <div className="absolute top-1 right-1 flex items-center space-x-1 bg-red-500 rounded-full px-2 py-1">
                      <div className="w-2 h-2 rounded-full bg-white animate-pulse" />
                      <span className="text-xs text-white">REC</span>
                    </div>
                  )}
                  {cameraError && (
                    <div className="absolute bottom-1 left-1 right-1 bg-red-500 text-white text-xs p-1 rounded">
                      Camera error
                    </div>
                  )}
                </div>
              )}
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
              ${currentSection === "home" ? "bg-blue-50 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400" : "hover:bg-gray-50 dark:hover:bg-gray-700"}`}
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
                  ${currentSection === section ? "bg-blue-50 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400" : "hover:bg-gray-50 dark:hover:bg-gray-700"}
                  ${!examStarted ? "opacity-50 cursor-not-allowed" : ""}`}
                  >
                    <div className="flex items-center space-x-2">
                      {index === 0 && <BookOpen className="w-5 h-5" />}
                      {index === 1 && <Brain className="w-5 h-5" />}
                      {index === 2 && <RedoDot className="w-5 h-5" />}
                      {index === 3 && <Code className="w-5 h-5" />}
                      <span className="font-medium">Section {index + 1}</span>
                    </div>
                    <span className="text-sm">
                      {progress[section]}/{data.questions.length}
                    </span>
                  </button>
                </div>
              ))}
              {examStarted && (
                <button
                  onClick={handleSubmitConfirmation}
                  className="mt-4 w-full bg-blue-600 dark:bg-blue-500 text-white p-3 rounded-lg hover:bg-blue-700 dark:hover:bg-blue-600
                transition-all hover:scale-105 active:scale-95 shadow-md"
                >
                  Submit
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
                {examSections[currentSection]?.questions.map((_, idx) => (
                  <button
                    key={idx}
                    onClick={() => handleQuestionChange(idx)}
                    className={`p-2 rounded-lg text-sm font-medium w-16 transition-all
                  ${
                    currentQuestionIndex === idx
                      ? "bg-blue-600 dark:bg-blue-500 text-white w-16"
                      : answers[`${currentSection}-${idx + 1}`]
                        ? "bg-green-100 dark:bg-green-900/30 text-green-800 dark:text-green-400"
                        : "bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600"
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
                        <span>
                          Duration: The exam is 60 minutes long. A timer will be displayed at the top of the screen.
                        </span>
                      </li>
                      <li className="flex items-start space-x-2">
                        <span className="text-blue-600 dark:text-blue-400 font-bold">•</span>
                        <span>
                          Sections: The exam consists of 4 sections - MCQs, Aptitude, AI, and Coding. Each section
                          contains multiple questions.
                        </span>
                      </li>
                      <li className="flex items-start space-x-2">
                        <span className="text-blue-600 dark:text-blue-400 font-bold">•</span>
                        <span>
                          Navigation: You can move between questions using the Previous/Next buttons or click question
                          numbers directly.
                        </span>
                      </li>
                      <li className="flex items-start space-x-2">
                        <span className="text-blue-600 dark:text-blue-400 font-bold">•</span>
                        <span>Webcam: Your webcam must be enabled throughout the exam for proctoring purposes.</span>
                      </li>
                      <li className="flex items-start space-x-2">
                        <span className="text-blue-600 dark:text-blue-400 font-bold">•</span>
                        <span>
                          Browser: Do not close or refresh your browser during the exam. This may result in loss of
                          answers.
                        </span>
                      </li>
                    </ul>
                  </div>

                  <div className="bg-yellow-50 dark:bg-yellow-900/30 p-6 rounded-xl">
                    <h2 className="text-xl font-semibold mb-4 text-gray-800 dark:text-gray-100">Before You Begin</h2>
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
                        <span>Close all unnecessary applications on your device</span>
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
                      Please read the instructions carefully before starting the exam.
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
                <div className="flex items-center justify-between mb-6">
                  <h2 className="text-2xl font-bold text-gray-800 dark:text-gray-100">Coding Challenge</h2>
                </div>

                {/* Show current question only */}
                {examSections.coding?.questions[currentQuestionIndex] && (
                  <div className="space-y-4">
                    <div className="bg-white dark:bg-gray-700 rounded-lg p-6 border border-gray-200 dark:border-gray-600">
                      <h3 className="text-xl font-semibold text-gray-800 dark:text-gray-100 mb-4">
                        Question {currentQuestionIndex + 1}
                      </h3>
                      <p className="text-gray-700 dark:text-gray-300">
                        {examSections.coding?.questions[currentQuestionIndex].text}
                      </p>
                    </div>
                    <button
                      onClick={() => {
                        setIsContainerVisible(true)
                        handleCodingQuestionSelect(examSections.coding?.questions[currentQuestionIndex])
                      }}
                      className="w-full mt-4 p-4 bg-blue-600 dark:bg-blue-500 text-white rounded-lg hover:bg-blue-700 dark:hover:bg-blue-600 transition-colors"
                    >
                      Open Code Editor
                    </button>
                  </div>
                )}
              </div>
            ) : (
              <div className="space-y-6">
                <div>
                  <div className="bg-white dark:bg-gray-800 rounded-lg">
                    <h3 className="text-xl font-semibold mb-4 text-gray-800 dark:text-gray-100">
                      Question {currentQuestionIndex + 1}
                    </h3>
                    {examSections[currentSection]?.questions[currentQuestionIndex]?.section === currentSection ? (
                      <>
                        <p className="text-gray-700 dark:text-gray-300 text-lg mb-6">
                          {examSections[currentSection]?.questions[currentQuestionIndex]?.text}
                        </p>
                        <div className="space-y-3">
                          {examSections[currentSection]?.questions[currentQuestionIndex]?.options?.map(
                            (option, idx) => (
                              <button
                                key={`${currentSection}-${currentQuestionIndex}-${idx}`}
                                onClick={() => handleAnswerSelect(option)}
                                className={`w-full text-left p-4 rounded-xl transition-all ${
                                  answers[`${currentSection}-${currentQuestionIndex + 1}`] === option
                                    ? "bg-blue-100 dark:bg-blue-900/50 border-blue-500 dark:border-blue-400 border-2"
                                    : "bg-gray-50 dark:bg-gray-700 hover:bg-gray-100 dark:hover:bg-gray-600 border-2 border-transparent"
                                }`}
                              >
                                <span className="flex items-center space-x-3">
                                  <span className="w-8 h-8 flex items-center justify-center rounded-full bg-blue-50 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 font-medium">
                                    {String.fromCharCode(65 + idx)}
                                  </span>
                                  <span className="text-gray-800 dark:text-gray-100">{option}</span>
                                </span>
                              </button>
                            ),
                          )}
                        </div>
                      </>
                    ) : (
                      <p className="text-red-500 dark:text-red-400">This question belongs to a different section.</p>
                    )}
                  </div>
                </div>
                <div className="flex justify-between items-center mt-6">
                  <button
                    onClick={handlePreviousQuestion}
                    disabled={currentQuestionIndex === 0 && Object.keys(examSections).indexOf(currentSection) === 0}
                    className="flex items-center space-x-2 px-6 py-3 bg-gray-100 dark:bg-gray-700 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-600 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
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

          {/* Coding Interface */}
          {isContainerVisible && selectedCodingQuestion && (
            <div className="fixed inset-0 bg-gray-900 z-50 overflow-hidden flex">
              {/* Left side - Question */}
              <div className="w-1/3 p-6 overflow-y-auto border-r border-gray-700">
                <h2 className="text-xl font-bold text-white mb-4">{selectedCodingQuestion.text}</h2>
                <div className="space-y-6 text-gray-300">
                  {selectedCodingQuestion.testCases && (
                    <div>
                      <h3 className="text-lg font-semibold mb-2">Test Cases</h3>
                      <div className="space-y-4">
                        {selectedCodingQuestion.testCases.map((testCase, index) => (
                          <div key={index}>
                            <div className="font-medium text-lg mb-2">Test Case {index + 1}</div>
                            <div className="space-y-2">
                              <div>
                                <span className="text-blue-400 font-medium">Input:</span>
                                <pre className="mt-1 font-mono text-sm">{testCase.input}</pre>
                              </div>
                              <div>
                                <span className="text-green-400 font-medium">Expected Output:</span>
                                <pre className="mt-1 font-mono text-sm">{testCase.output}</pre>
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
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
                    <option value="javascript">JavaScript</option>
                    <option value="python">Python</option>
                    <option value="java">Java</option>
                    <option value="cpp">C++</option>
                    <option value="c">C</option>
                  </select>
                  <button onClick={toggleFullScreen} className="bg-gray-600 hover:bg-gray-700 text-white p-2 rounded">
                    {isFullScreen ? (
                      <ArrowsPointingInIcon className="h-5 w-5" />
                    ) : (
                      <ArrowsPointingOutIcon className="h-5 w-5" />
                    )}
                  </button>
                </div>

                <MonacoEditor
                  height="60vh"
                  language={language}
                  theme="vs-dark"
                  value={code}
                  onChange={(value) => setCode(value || "")}
                />

                <div className="bg-gray-800 p-4 flex justify-between items-center">
                  <button
                    onClick={() => {
                      setIsContainerVisible(false)
                      setSelectedCodingQuestion(null)
                    }}
                    className="bg-gray-600 hover:bg-gray-700 text-white px-4 py-2 rounded"
                  >
                    Go Back
                  </button>

                  <div className="flex space-x-2">
                    <button onClick={handleRun} className="bg-blue-500 hover:bg-blue-600 text-white px-4 py-2 rounded">
                      Run
                    </button>
                    <button
                      onClick={handleCodeSubmit}
                      className="bg-green-500 hover:bg-green-600 text-white px-4 py-2 rounded"
                    >
                      Submit
                    </button>
                    <button onClick={handleReset} className="bg-red-500 hover:bg-red-600 text-white px-4 py-2 rounded">
                      Reset
                    </button>
                  </div>
                </div>

                {showOutputSection && (
                  <div className="bg-gray-800 border-t border-gray-700 p-4 max-h-[40vh] overflow-y-auto">
                    <div className="flex items-center justify-between mb-4">
                      <h3 className="text-gray-300 text-lg font-semibold">Test Results</h3>
                      {testCaseProgress.running && (
                        <div className="flex items-center space-x-2">
                          <div className="animate-spin rounded-full h-4 w-4 border-2 border-blue-500 border-t-transparent"></div>
                          <span className="text-gray-400">Running test case {currentTestCase + 1}...</span>
                        </div>
                      )}
                    </div>

                    {testCaseProgress.total > 0 && (
                      <div className="mb-4 bg-gray-700 rounded-lg p-4">
                        <div className="flex justify-between items-center mb-2">
                          <span className="text-gray-300">Progress:</span>
                          <span className="text-gray-300">
                            {testCaseProgress.passed}/{testCaseProgress.total} passed
                          </span>
                        </div>
                        <div className="w-full bg-gray-600 rounded-full h-2">
                          <div
                            className="bg-green-500 h-2 rounded-full transition-all duration-500"
                            style={{
                              width: `${(testCaseProgress.passed / testCaseProgress.total) * 100}%`,
                            }}
                          />
                        </div>
                      </div>
                    )}
                    <h3 className="text-gray-300 text-lg font-semibold mb-4">Compilation Result</h3>
                    {compilationResult ? (
                      <div>
                        {compilationResult.error ? (
                          <div className="bg-red-900/30 p-4 rounded-lg">
                            <h4 className="text-red-400 font-medium mb-2">Error:</h4>
                            <pre className="text-red-300 font-mono text-sm whitespace-pre-wrap">
                              {compilationResult.error}
                            </pre>
                          </div>
                        ) : (
                          <div className="bg-green-900/30 p-4 rounded-lg mb-4">
                            <h4 className="text-green-400 font-medium mb-2">Compilation Output:</h4>
                            <pre className="text-green-300 font-mono text-sm whitespace-pre-wrap">
                              {compilationResult.output}
                            </pre>
                          </div>
                        )}
                        {testResults.length > 0 && (
                          <div className="space-y-4">
                            <h4 className="text-gray-300 font-medium text-lg">Test Case Results:</h4>
                            <div className="grid gap-4">
                              {testResults.map((result, index) => (
                                <div
                                  key={index}
                                  className={`p-4 rounded-lg border ${
                                    result.status === "correct"
                                      ? "bg-green-900/30 border-green-600/30"
                                      : "bg-red-900/30 border-red-600/30"
                                  }`}
                                >
                                  <div className="flex items-center justify-between mb-2">
                                    <h5
                                      className={`font-medium ${
                                        result.status === "correct" ? "text-green-400" : "text-red-400"
                                      }`}
                                    >
                                      Test Case {result.testCaseNumber}
                                    </h5>
                                    <span
                                      className={`px-3 py-1 rounded-full text-sm ${
                                        result.status === "correct"
                                          ? "bg-green-500/20 text-green-400"
                                          : "bg-red-500/20 text-red-400"
                                      }`}
                                    >
                                      {result.status === "correct" ? "Passed" : "Failed"}
                                    </span>
                                  </div>
                                  <div className="space-y-2 text-sm">
                                    <div>
                                      <span className="text-gray-400">Expected Output:</span>
                                      <pre className="mt-1 font-mono text-gray-300 bg-black/30 p-2 rounded">
                                        {result.expectedOutput}
                                      </pre>
                                    </div>
                                    <div>
                                      <span className="text-gray-400">Your Output:</span>
                                      <pre
                                        className={`mt-1 font-mono p-2 rounded ${
                                          result.status === "correct"
                                            ? "text-green-300 bg-green-900/20"
                                            : "text-red-300 bg-red-900/20"
                                        }`}
                                      >
                                        {result.actualOutput}
                                      </pre>
                                    </div>
                                    {result.executionTime && (
                                      <div className="text-gray-400 text-xs">
                                        Execution time: {result.executionTime}ms
                                      </div>
                                    )}
                                  </div>
                                </div>
                              ))}
                            </div>
                          </div>
                        )}
                      </div>
                    ) : (
                      <div className="text-gray-400">Compiling and running your code...</div>
                    )}
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

export default ExamPortal

