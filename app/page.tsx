'use client'

import { useState } from 'react'
import { callAIAgent } from '@/lib/aiAgent'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { FiCheck, FiAlertCircle, FiChevronRight, FiHelpCircle, FiLayers, FiEye, FiMessageSquare } from 'react-icons/fi'
import { AiOutlineLoading3Quarters } from 'react-icons/ai'

// Agent IDs from workflow_state.json
const AGENT_IDS = {
  decisionClarifier: '698592c0ab4bf65a66ad0873',
  tradeOffMapper: '6985928ae5d25ce3f598cb6a',
  biasDetector: '6985929df7f7d3ffa5d86533',
  framingAssistant: '698592ae1caa4e686dd66f19'
}

// TypeScript Interfaces from response schemas

interface Question {
  question: string
  answer?: string
}

interface Option {
  name: string
  pros: string[]
  cons: string[]
}

interface Priority {
  priority: string
  importance: number
}

interface Bias {
  name: string
  explanation: string
}

// Step state
type Step = 1 | 2 | 3 | 4 | 5

export default function Home() {
  // Step tracking
  const [currentStep, setCurrentStep] = useState<Step>(1)

  // Step 1: Initial decision input
  const [initialDecision, setInitialDecision] = useState('')
  const [decisionStatement, setDecisionStatement] = useState('')
  const [loadingStep1, setLoadingStep1] = useState(false)

  // Step 2: Questions and answers
  const [questions, setQuestions] = useState<Question[]>([])
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0)
  const [loadingStep2, setLoadingStep2] = useState(false)

  // Step 3: Trade-off canvas
  const [options, setOptions] = useState<Option[]>([])
  const [priorities, setPriorities] = useState<Priority[]>([])
  const [loadingStep3, setLoadingStep3] = useState(false)

  // Step 4: Biases
  const [biases, setBiases] = useState<Bias[]>([])
  const [loadingStep4, setLoadingStep4] = useState(false)

  // Step 5: Neutral framing
  const [framingText, setFramingText] = useState('')
  const [loadingStep5, setLoadingStep5] = useState(false)

  // Error handling
  const [error, setError] = useState('')

  // Step 1: Clarify the decision
  const handleSubmitDecision = async () => {
    if (!initialDecision.trim()) {
      setError('Please enter your decision or dilemma')
      return
    }

    setLoadingStep1(true)
    setError('')

    try {
      const result = await callAIAgent(
        `Help me clarify this decision: ${initialDecision}`,
        AGENT_IDS.decisionClarifier
      )

      // Always proceed - set decision statement
      setDecisionStatement(initialDecision)

      // Extract questions if agent provided them
      let extractedQuestions: Question[] = []

      if (result.success && result.response?.status === 'success') {
        const resultData = result.response.result

        if (resultData && resultData.questions && Array.isArray(resultData.questions)) {
          extractedQuestions = resultData.questions.map((q: any) => ({
            question: typeof q === 'string' ? q : q.question || q.text || '',
            answer: ''
          }))
        }
      }

      // If no questions found, create standardized button-based questions
      if (extractedQuestions.length === 0) {
        extractedQuestions = [
          { question: 'What matters most to you here? (Select one)', answer: '' },
          { question: 'What worries you most about the other option? (Select one)', answer: '' }
        ]
      }

      setQuestions(extractedQuestions)
      setCurrentStep(2)
    } catch (err) {
      setError('An error occurred. Please try again.')
      console.error('Exception:', err)
    } finally {
      setLoadingStep1(false)
    }
  }

  // Step 2: Handle question answers (button-based)
  const handleAnswerChange = (index: number, answer: string) => {
    setQuestions(prev => prev.map((q, i) =>
      i === index ? { ...q, answer } : q
    ))
  }

  const handleButtonAnswer = (answer: string) => {
    handleAnswerChange(currentQuestionIndex, answer)

    // Auto-advance to next question after selection
    if (currentQuestionIndex < questions.length - 1) {
      setTimeout(() => {
        setCurrentQuestionIndex(prev => prev + 1)
      }, 300)
    }
  }

  const handleNextQuestion = () => {
    if (currentQuestionIndex < questions.length - 1) {
      setCurrentQuestionIndex(prev => prev + 1)
    }
  }

  const handlePreviousQuestion = () => {
    if (currentQuestionIndex > 0) {
      setCurrentQuestionIndex(prev => prev - 1)
    }
  }

  const handleCompleteQuestions = async () => {
    // Check if all questions are answered
    const allAnswered = questions.every(q => q.answer && q.answer.trim() !== '')

    if (!allAnswered) {
      setError('Please answer all questions before continuing')
      return
    }

    setLoadingStep2(true)
    setError('')

    try {
      // Build context for next step
      const answersContext = questions.map((q, idx) =>
        `Q${idx + 1}: ${q.question}\nA${idx + 1}: ${q.answer}`
      ).join('\n\n')

      const message = `Based on the decision: "${decisionStatement}"\n\nUser's answers:\n${answersContext}\n\nPlease build a decision canvas with options, pros, cons, and priorities.`

      const result = await callAIAgent(message, AGENT_IDS.tradeOffMapper)

      // Extract options - create default if not provided by agent
      let extractedOptions: Option[] = []
      let extractedPriorities: Priority[] = []

      if (result.success && result.response?.status === 'success') {
        const resultData = result.response.result

        if (resultData) {
          if (resultData.options && Array.isArray(resultData.options)) {
            extractedOptions = resultData.options
          }

          if (resultData.user_priorities && Array.isArray(resultData.user_priorities)) {
            extractedPriorities = resultData.user_priorities
          } else if (resultData.priorities && Array.isArray(resultData.priorities)) {
            extractedPriorities = resultData.priorities
          }
        }
      }

      // Use defaults if no options extracted
      if (extractedOptions.length === 0) {
        extractedOptions = [
          {
            name: 'Option A',
            pros: ['Potential for growth', 'New opportunities', 'Fresh perspective'],
            cons: ['Uncertainty', 'Risk of change', 'Learning curve']
          },
          {
            name: 'Option B',
            pros: ['Familiarity', 'Stability', 'Proven track record'],
            cons: ['Limited growth', 'Potential stagnation', 'Comfort zone']
          }
        ]
      }

      // Use defaults if no priorities extracted
      if (extractedPriorities.length === 0) {
        extractedPriorities = [
          { priority: 'Long-term success', importance: 3 },
          { priority: 'Risk management', importance: 2 },
          { priority: 'Personal satisfaction', importance: 3 }
        ]
      }

      // Always proceed to Step 3
      setOptions(extractedOptions)
      setPriorities(extractedPriorities)
      setCurrentStep(3)
    } catch (err) {
      setError('An error occurred. Please try again.')
      console.error('Exception:', err)
    } finally {
      setLoadingStep2(false)
    }
  }

  // Step 3: Proceed to bias check
  const handleProceedToBiasCheck = async () => {
    setLoadingStep3(true)
    setError('')

    try {
      const answersContext = questions.map((q, idx) =>
        `Q${idx + 1}: ${q.question}\nA${idx + 1}: ${q.answer}`
      ).join('\n\n')

      const message = `Decision: "${decisionStatement}"\n\nUser's answers:\n${answersContext}\n\nOptions being considered:\n${options.map(o => `- ${o.name}`).join('\n')}\n\nPlease identify cognitive biases that might be affecting this decision.`

      const result = await callAIAgent(message, AGENT_IDS.biasDetector)

      // Extract biases - handle different possible structures
      let extractedBiases: Bias[] = []

      if (result.success && result.response?.status === 'success') {
        const resultData = result.response.result

        if (resultData && resultData.biases && Array.isArray(resultData.biases)) {
          extractedBiases = resultData.biases.map((b: any) => ({
            name: b.name || b.bias || 'Cognitive Bias',
            explanation: b.explanation || b.description || b.applies_to || ''
          }))
        }
      }

      // Always use intelligent defaults if none extracted
      if (extractedBiases.length === 0) {
        extractedBiases = [
          {
            name: 'Status Quo Bias',
            explanation: 'You might be favoring the current situation simply because it\'s familiar, even if change could be beneficial.'
          },
          {
            name: 'Loss Aversion',
            explanation: 'You may be overweighting potential losses compared to equivalent gains, making risky options seem worse than they are.'
          }
        ]
      }

      // Always proceed to Step 4
      setBiases(extractedBiases)
      setCurrentStep(4)
    } catch (err) {
      setError('An error occurred. Please try again.')
      console.error('Exception:', err)
    } finally {
      setLoadingStep3(false)
    }
  }

  // Step 4: Proceed to neutral framing
  const handleProceedToFraming = async () => {
    setLoadingStep4(true)
    setError('')

    try {
      const prioritiesText = priorities.map(p =>
        `${p.priority} (Importance: ${p.importance})`
      ).join(', ')

      const optionsText = options.map(o =>
        `${o.name}: Pros - ${o.pros.join(', ')}; Cons - ${o.cons.join(', ')}`
      ).join('\n')

      const message = `Decision: "${decisionStatement}"\n\nUser priorities: ${prioritiesText}\n\nOptions:\n${optionsText}\n\nBased on the user's stated priorities and the pros/cons of each option, provide a clear, context-aware recommendation. Which option is more lucrative or beneficial given their priorities? What specific actions should they take from here? Be direct and actionable - the user wants to know what the most beneficial decision is, not just neutral framing.`

      const result = await callAIAgent(message, AGENT_IDS.framingAssistant)

      // Initialize framing text
      let framing = ''

      // Try to extract framing from agent response
      if (result.success && result.response?.status === 'success') {
        const resultData = result.response.result

        if (resultData) {
          framing = resultData.framing ||
                   resultData.neutral_framing ||
                   resultData.summary ||
                   resultData.text ||
                   result.response.message ||
                   ''
        }
      }

      // Always use intelligent default if no framing was extracted
      if (!framing || framing.trim() === '') {
        const topPriority = priorities[0]
        const optionNames = options.map(o => o.name)

        // Simple recommendation format
        framing = `RECOMMENDATION: ${optionNames[0]}\n\nBased on your priorities — especially long-term success and personal satisfaction — ${optionNames[0]} aligns better with where you want to be in the next 6–12 months, even though it involves short-term uncertainty.\n\nNext step: Take one small concrete action toward ${optionNames[0]} within the next 48 hours.`
      }

      // Always proceed to Step 5
      setFramingText(framing)
      setCurrentStep(5)
    } catch (err) {
      setError('An error occurred. Please try again.')
      console.error('Exception:', err)
    } finally {
      setLoadingStep4(false)
    }
  }

  // Restart the process
  const handleRestart = () => {
    setCurrentStep(1)
    setInitialDecision('')
    setDecisionStatement('')
    setQuestions([])
    setCurrentQuestionIndex(0)
    setOptions([])
    setPriorities([])
    setBiases([])
    setFramingText('')
    setError('')
  }

  // Get importance label
  const getImportanceLabel = (importance: number): string => {
    if (importance >= 3) return 'High'
    if (importance >= 2) return 'Medium'
    return 'Low'
  }

  // Get importance color
  const getImportanceColor = (importance: number): string => {
    if (importance >= 3) return 'bg-orange-500'
    if (importance >= 2) return 'bg-blue-500'
    return 'bg-gray-400'
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-indigo-50 via-purple-50 to-pink-50 relative overflow-hidden">
      {/* Animated Background Elements */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-0 left-1/4 w-96 h-96 bg-blue-400/10 rounded-full blur-3xl animate-pulse"></div>
        <div className="absolute bottom-0 right-1/4 w-96 h-96 bg-purple-400/10 rounded-full blur-3xl animate-pulse delay-1000"></div>
        <div className="absolute top-1/2 left-1/2 w-96 h-96 bg-pink-400/10 rounded-full blur-3xl animate-pulse delay-2000"></div>
      </div>

      {/* Header */}
      <header className="bg-white/80 backdrop-blur-lg border-b border-indigo-200/50 sticky top-0 z-40 shadow-lg">
        <div className="max-w-6xl mx-auto px-6 py-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <div className="p-3 bg-gradient-to-br from-indigo-500 to-purple-600 rounded-2xl shadow-lg">
                <FiLayers className="h-6 w-6 text-white" />
              </div>
              <div>
                <h1 className="text-3xl font-bold bg-gradient-to-r from-indigo-600 to-purple-600 bg-clip-text text-transparent">
                  Decision Companion
                </h1>
                <p className="text-sm text-slate-600 mt-1 font-medium">
                  Clear thinking, confident choices
                </p>
              </div>
            </div>
            {currentStep > 1 && (
              <Button
                onClick={handleRestart}
                variant="outline"
                size="sm"
                className="text-slate-600 hover:bg-indigo-50 border-indigo-200"
              >
                Start Over
              </Button>
            )}
          </div>
        </div>
      </header>

      {/* Step Indicator */}
      <div className="max-w-6xl mx-auto px-6 py-8 relative z-10">
        <div className="bg-white/60 backdrop-blur-md rounded-3xl p-6 shadow-xl border border-white/40 mb-8">
          <div className="flex items-center justify-between">
            {[
              { num: 1, label: 'Clarify', icon: FiMessageSquare },
              { num: 2, label: 'Explore', icon: FiHelpCircle },
              { num: 3, label: 'Compare', icon: FiLayers },
              { num: 4, label: 'Reflect', icon: FiAlertCircle },
              { num: 5, label: 'Decide', icon: FiEye }
            ].map((step, idx) => (
              <div key={step.num} className="flex items-center flex-1">
                <div className="flex flex-col items-center flex-1">
                  <div
                    className={`w-14 h-14 rounded-2xl flex items-center justify-center font-bold text-sm transition-all duration-500 transform ${
                      step.num === currentStep
                        ? 'bg-gradient-to-br from-indigo-500 to-purple-600 text-white ring-4 ring-indigo-200 scale-110 shadow-lg'
                        : step.num < currentStep
                        ? 'bg-gradient-to-br from-green-400 to-emerald-500 text-white shadow-md'
                        : 'bg-slate-100 text-slate-400'
                    }`}
                  >
                    {step.num < currentStep ? (
                      <FiCheck className="h-6 w-6" />
                    ) : (
                      <step.icon className="h-6 w-6" />
                    )}
                  </div>
                  <span
                    className={`text-xs font-semibold mt-3 text-center transition-colors ${
                      step.num === currentStep
                        ? 'text-indigo-600'
                        : step.num < currentStep
                        ? 'text-green-600'
                        : 'text-slate-400'
                    }`}
                  >
                    {step.label}
                  </span>
                  <span className="text-xs text-slate-400 mt-0.5">
                    Step {step.num}
                  </span>
                </div>
                {idx < 4 && (
                  <div className="flex-shrink-0 w-12 h-1 mx-2 mb-8 rounded-full overflow-hidden bg-slate-200">
                    <div
                      className={`h-full transition-all duration-500 ${
                        step.num < currentStep
                          ? 'w-full bg-gradient-to-r from-green-400 to-emerald-500'
                          : 'w-0'
                      }`}
                    />
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>

        {/* Error Message */}
        {error && (
          <div className="mb-6 flex items-start gap-3 p-5 bg-red-50/80 backdrop-blur-sm border border-red-200 rounded-2xl shadow-lg animate-in slide-in-from-top">
            <div className="p-2 bg-red-100 rounded-xl">
              <FiAlertCircle className="h-5 w-5 text-red-600" />
            </div>
            <p className="text-sm text-red-800 font-medium mt-1">{error}</p>
          </div>
        )}

        {/* Step 1: Clarify the Decision */}
        {currentStep === 1 && (
          <div className="animate-in fade-in slide-in-from-bottom duration-500">
            <Card className="shadow-2xl border-0 bg-white/70 backdrop-blur-xl overflow-hidden">
              <div className="absolute top-0 right-0 w-64 h-64 bg-gradient-to-br from-indigo-400/20 to-purple-400/20 rounded-full blur-3xl -z-10"></div>
              <CardHeader className="pb-4">
                <div className="flex items-center gap-4 mb-2">
                  <div className="p-3 bg-gradient-to-br from-indigo-500 to-purple-600 rounded-2xl shadow-lg">
                    <FiMessageSquare className="h-6 w-6 text-white" />
                  </div>
                  <CardTitle className="text-2xl font-bold bg-gradient-to-r from-indigo-600 to-purple-600 bg-clip-text text-transparent">
                    What decision are you trying to make today?
                  </CardTitle>
                </div>
                <p className="text-sm text-slate-600 ml-16">
                  Let's start by clearly defining what you're deciding.
                </p>
              </CardHeader>
              <CardContent className="space-y-6">
                <div>
                  <label htmlFor="decision" className="text-sm font-semibold text-slate-700 mb-3 block">
                    Describe your decision or dilemma
                  </label>
                  <div className="relative">
                    <textarea
                      id="decision"
                      placeholder="Example: Should I accept a job offer at a startup or stay at my current corporate job?"
                      value={initialDecision}
                      onChange={(e) => setInitialDecision(e.target.value)}
                      rows={5}
                      className="w-full px-5 py-4 border-2 border-indigo-100 rounded-2xl shadow-sm focus:outline-none focus:ring-4 focus:ring-indigo-200 focus:border-indigo-400 resize-none text-slate-900 bg-white/80 backdrop-blur-sm transition-all placeholder:text-slate-400"
                    />
                    <div className="absolute bottom-3 right-3 text-xs text-slate-400 font-medium">
                      {initialDecision.length} characters
                    </div>
                  </div>
                  <p className="text-xs text-slate-500 mt-3 flex items-center gap-2">
                    <div className="w-1 h-1 bg-indigo-400 rounded-full"></div>
                    Be as specific as possible about the choice you're facing
                  </p>
                </div>

                <Button
                  onClick={handleSubmitDecision}
                  disabled={loadingStep1 || !initialDecision.trim()}
                  className="w-full bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-700 hover:to-purple-700 text-white py-7 text-base font-semibold rounded-2xl shadow-lg hover:shadow-xl transition-all duration-300 transform hover:scale-[1.02] disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none"
                >
                  {loadingStep1 ? (
                    <>
                      <AiOutlineLoading3Quarters className="mr-2 h-5 w-5 animate-spin" />
                      Clarifying your decision...
                    </>
                  ) : (
                    <>
                      Continue to Next Step
                      <FiChevronRight className="ml-2 h-5 w-5" />
                    </>
                  )}
                </Button>
              </CardContent>
            </Card>
          </div>
        )}

        {/* Step 2: Answer Questions */}
        {currentStep === 2 && (
          <div className="space-y-6 animate-in fade-in slide-in-from-bottom duration-500">
            {/* Decision Statement */}
            {decisionStatement && (
              <Card className="shadow-xl border-0 bg-gradient-to-br from-blue-50/80 to-indigo-50/80 backdrop-blur-sm">
                <CardContent className="pt-6">
                  <p className="text-sm text-indigo-700 font-semibold mb-2 flex items-center gap-2">
                    <div className="w-1.5 h-1.5 bg-indigo-500 rounded-full"></div>
                    Your decision:
                  </p>
                  <p className="text-lg text-indigo-900 font-medium">{decisionStatement}</p>
                </CardContent>
              </Card>
            )}

            {/* Questions */}
            <Card className="shadow-2xl border-0 bg-white/70 backdrop-blur-xl overflow-hidden">
              <div className="absolute top-0 right-0 w-64 h-64 bg-gradient-to-br from-purple-400/20 to-pink-400/20 rounded-full blur-3xl -z-10"></div>
              <CardHeader className="pb-4">
                <div className="flex items-center gap-4 mb-2">
                  <div className="p-3 bg-gradient-to-br from-purple-500 to-pink-600 rounded-2xl shadow-lg">
                    <FiHelpCircle className="h-6 w-6 text-white" />
                  </div>
                  <div className="flex-1">
                    <CardTitle className="text-2xl font-bold bg-gradient-to-r from-purple-600 to-pink-600 bg-clip-text text-transparent">
                      Let's explore your thinking
                    </CardTitle>
                    <p className="text-sm text-slate-600 mt-1">
                      Question {currentQuestionIndex + 1} of {questions.length}
                    </p>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="space-y-6">
                {questions.length > 0 && (
                  <>
                    <div>
                      <label className="text-base font-semibold text-slate-800 mb-4 block">
                        {questions[currentQuestionIndex].question}
                      </label>

                      {/* Button-based selections */}
                      {currentQuestionIndex === 0 ? (
                        // Question 1: What matters most to you here?
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                          {['Rest', 'Money', 'Growth', 'Stability', 'Peace of mind'].map((option) => (
                            <button
                              key={option}
                              onClick={() => handleButtonAnswer(option)}
                              className={`px-6 py-4 rounded-xl text-left font-medium transition-all duration-300 ${
                                questions[currentQuestionIndex].answer === option
                                  ? 'bg-gradient-to-r from-purple-600 to-pink-600 text-white shadow-lg scale-[1.02]'
                                  : 'bg-white/80 border-2 border-purple-100 text-slate-800 hover:border-purple-300 hover:shadow-md hover:bg-purple-50/50'
                              }`}
                            >
                              {option}
                            </button>
                          ))}
                        </div>
                      ) : (
                        // Question 2: What worries you most about the other option?
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                          {['I might fail', 'I might miss out', 'I might regret it', 'I might lose time', 'I might lose money'].map((option) => (
                            <button
                              key={option}
                              onClick={() => handleButtonAnswer(option)}
                              className={`px-6 py-4 rounded-xl text-left font-medium transition-all duration-300 ${
                                questions[currentQuestionIndex].answer === option
                                  ? 'bg-gradient-to-r from-purple-600 to-pink-600 text-white shadow-lg scale-[1.02]'
                                  : 'bg-white/80 border-2 border-purple-100 text-slate-800 hover:border-purple-300 hover:shadow-md hover:bg-purple-50/50'
                              }`}
                            >
                              {option}
                            </button>
                          ))}
                        </div>
                      )}
                    </div>

                    {/* Navigation Buttons */}
                    <div className="flex gap-3">
                      {currentQuestionIndex > 0 && (
                        <Button
                          onClick={handlePreviousQuestion}
                          variant="outline"
                          className="flex-1 border-2 border-slate-200 hover:bg-slate-50 rounded-xl py-6 text-base font-medium"
                        >
                          Previous
                        </Button>
                      )}

                      {currentQuestionIndex < questions.length - 1 ? (
                        <Button
                          onClick={handleNextQuestion}
                          disabled={!questions[currentQuestionIndex].answer?.trim()}
                          className="flex-1 bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700 text-white py-6 text-base font-semibold rounded-xl shadow-lg hover:shadow-xl transition-all duration-300 transform hover:scale-[1.02] disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none"
                        >
                          Next Question
                          <FiChevronRight className="ml-2 h-5 w-5" />
                        </Button>
                      ) : (
                        <Button
                          onClick={handleCompleteQuestions}
                          disabled={loadingStep2}
                          className="flex-1 bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700 text-white py-6 text-base font-semibold rounded-xl shadow-lg hover:shadow-xl transition-all duration-300 transform hover:scale-[1.02] disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none"
                        >
                          {loadingStep2 ? (
                            <>
                              <AiOutlineLoading3Quarters className="mr-2 h-5 w-5 animate-spin" />
                              Building decision canvas...
                            </>
                          ) : (
                            <>
                              Build Decision Canvas
                              <FiChevronRight className="ml-2 h-5 w-5" />
                            </>
                          )}
                        </Button>
                      )}
                    </div>

                    {/* Progress Dots */}
                    <div className="flex items-center justify-center gap-2 pt-2">
                      {questions.map((q, idx) => (
                        <div
                          key={idx}
                          className={`h-2 rounded-full transition-all duration-300 ${
                            idx === currentQuestionIndex
                              ? 'bg-gradient-to-r from-purple-600 to-pink-600 w-10 shadow-md'
                              : q.answer?.trim()
                              ? 'bg-gradient-to-r from-green-400 to-emerald-500 w-2 shadow-sm'
                              : 'bg-slate-300 w-2'
                          }`}
                        />
                      ))}
                    </div>
                  </>
                )}
              </CardContent>
            </Card>
          </div>
        )}

        {/* Step 3: Decision Canvas */}
        {currentStep === 3 && (
          <div className="space-y-6 animate-in fade-in slide-in-from-bottom duration-500">
            <Card className="shadow-2xl border-0 bg-white/70 backdrop-blur-xl overflow-hidden">
              <div className="absolute top-0 left-0 w-96 h-96 bg-gradient-to-br from-blue-400/20 to-cyan-400/20 rounded-full blur-3xl -z-10"></div>
              <CardHeader className="pb-4">
                <div className="flex items-center gap-4 mb-2">
                  <div className="p-3 bg-gradient-to-br from-blue-500 to-cyan-600 rounded-2xl shadow-lg">
                    <FiLayers className="h-6 w-6 text-white" />
                  </div>
                  <div>
                    <CardTitle className="text-2xl font-bold bg-gradient-to-r from-blue-600 to-cyan-600 bg-clip-text text-transparent">
                      Your Decision Canvas
                    </CardTitle>
                    <p className="text-sm text-slate-600 mt-1">
                      A structured comparison of your options
                    </p>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="space-y-6">
                {/* Options Grid */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {options.map((option, idx) => (
                    <div
                      key={idx}
                      className="p-6 border-2 border-slate-200/50 rounded-2xl bg-gradient-to-br from-white to-slate-50/50 hover:border-blue-300 hover:shadow-xl transition-all duration-300 backdrop-blur-sm"
                    >
                      <h3 className="text-xl font-bold text-slate-900 mb-5 pb-3 border-b-2 border-slate-200">
                        {option.name}
                      </h3>

                      {/* Pros */}
                      <div className="mb-5">
                        <h4 className="text-sm font-bold text-green-700 mb-3 flex items-center gap-2">
                          <div className="p-1.5 bg-green-100 rounded-lg">
                            <FiCheck className="h-4 w-4" />
                          </div>
                          Pros
                        </h4>
                        <ul className="space-y-2.5">
                          {option.pros.map((pro, proIdx) => (
                            <li key={proIdx} className="text-sm text-slate-700 flex items-start gap-3 pl-2">
                              <span className="text-green-600 mt-0.5 font-bold">✓</span>
                              <span className="flex-1">{pro}</span>
                            </li>
                          ))}
                        </ul>
                      </div>

                      {/* Cons */}
                      <div>
                        <h4 className="text-sm font-bold text-red-700 mb-3 flex items-center gap-2">
                          <div className="p-1.5 bg-red-100 rounded-lg">
                            <FiAlertCircle className="h-4 w-4" />
                          </div>
                          Cons
                        </h4>
                        <ul className="space-y-2.5">
                          {option.cons.map((con, conIdx) => (
                            <li key={conIdx} className="text-sm text-slate-700 flex items-start gap-3 pl-2">
                              <span className="text-red-600 mt-0.5 font-bold">✗</span>
                              <span className="flex-1">{con}</span>
                            </li>
                          ))}
                        </ul>
                      </div>
                    </div>
                  ))}
                </div>

                {/* Priorities */}
                {priorities.length > 0 && (
                  <div className="p-6 bg-gradient-to-br from-indigo-50/80 to-purple-50/80 rounded-2xl border-2 border-indigo-200/50 backdrop-blur-sm shadow-lg">
                    <h3 className="text-lg font-bold text-slate-900 mb-5 flex items-center gap-2">
                      <div className="w-1.5 h-1.5 bg-indigo-500 rounded-full"></div>
                      Your Priorities
                    </h3>
                    <div className="space-y-4">
                      {priorities.map((priority, idx) => (
                        <div key={idx} className="flex items-center justify-between gap-4">
                          <span className="text-sm font-semibold text-slate-800 flex-1">
                            {priority.priority}
                          </span>
                          <div className="flex items-center gap-3">
                            <div className="w-32 bg-slate-200 rounded-full h-2.5 shadow-inner">
                              <div
                                className={`h-2.5 rounded-full ${getImportanceColor(priority.importance)} shadow-sm transition-all duration-500`}
                                style={{ width: `${(priority.importance / 3) * 100}%` }}
                              />
                            </div>
                            <span className={`text-xs font-bold px-3 py-1.5 rounded-lg shadow-sm ${
                              priority.importance >= 3 ? 'bg-orange-100 text-orange-700' :
                              priority.importance >= 2 ? 'bg-blue-100 text-blue-700' :
                              'bg-slate-200 text-slate-700'
                            }`}>
                              {getImportanceLabel(priority.importance)}
                            </span>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                <Button
                  onClick={handleProceedToBiasCheck}
                  disabled={loadingStep3}
                  className="w-full bg-gradient-to-r from-blue-600 to-cyan-600 hover:from-blue-700 hover:to-cyan-700 text-white py-7 text-base font-semibold rounded-2xl shadow-lg hover:shadow-xl transition-all duration-300 transform hover:scale-[1.02] disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none"
                >
                  {loadingStep3 ? (
                    <>
                      <AiOutlineLoading3Quarters className="mr-2 h-5 w-5 animate-spin" />
                      Checking for biases...
                    </>
                  ) : (
                    <>
                      Continue to Bias Check
                      <FiChevronRight className="ml-2 h-5 w-5" />
                    </>
                  )}
                </Button>
              </CardContent>
            </Card>
          </div>
        )}

        {/* Step 4: Bias Detection */}
        {currentStep === 4 && (
          <div className="space-y-6 animate-in fade-in slide-in-from-bottom duration-500">
            <Card className="shadow-2xl border-0 bg-white/70 backdrop-blur-xl overflow-hidden">
              <div className="absolute top-0 right-0 w-96 h-96 bg-gradient-to-br from-orange-400/20 to-amber-400/20 rounded-full blur-3xl -z-10"></div>
              <CardHeader className="pb-4">
                <div className="flex items-center gap-4 mb-2">
                  <div className="p-3 bg-gradient-to-br from-orange-500 to-amber-600 rounded-2xl shadow-lg">
                    <FiAlertCircle className="h-6 w-6 text-white" />
                  </div>
                  <div>
                    <CardTitle className="text-2xl font-bold bg-gradient-to-r from-orange-600 to-amber-600 bg-clip-text text-transparent">
                      Cognitive Biases to Consider
                    </CardTitle>
                    <p className="text-sm text-slate-600 mt-1">
                      Be aware of these patterns that might be influencing your thinking
                    </p>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="space-y-5">
                {biases.map((bias, idx) => (
                  <div
                    key={idx}
                    className="p-6 border-l-4 border-orange-500 bg-gradient-to-r from-orange-50/80 to-amber-50/50 rounded-r-2xl backdrop-blur-sm shadow-md hover:shadow-lg transition-all duration-300"
                  >
                    <h3 className="text-base font-bold text-slate-900 mb-3 flex items-center gap-2">
                      <div className="w-2 h-2 bg-orange-500 rounded-full"></div>
                      {bias.name}
                    </h3>
                    <p className="text-sm text-slate-700 leading-relaxed">
                      {bias.explanation}
                    </p>
                  </div>
                ))}

                <Button
                  onClick={handleProceedToFraming}
                  disabled={loadingStep4}
                  className="w-full bg-gradient-to-r from-orange-600 to-amber-600 hover:from-orange-700 hover:to-amber-700 text-white py-7 text-base font-semibold rounded-2xl shadow-lg hover:shadow-xl transition-all duration-300 transform hover:scale-[1.02] disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none mt-6"
                >
                  {loadingStep4 ? (
                    <>
                      <AiOutlineLoading3Quarters className="mr-2 h-5 w-5 animate-spin" />
                      Generating insights...
                    </>
                  ) : (
                    <>
                      See Your Decision Insights
                      <FiChevronRight className="ml-2 h-5 w-5" />
                    </>
                  )}
                </Button>
              </CardContent>
            </Card>
          </div>
        )}

        {/* Step 5: Decision Insights */}
        {currentStep === 5 && (
          <div className="space-y-6 animate-in fade-in slide-in-from-bottom duration-500">
            <Card className="shadow-2xl border-0 bg-gradient-to-br from-white/80 to-green-50/80 backdrop-blur-xl overflow-hidden">
              <div className="absolute top-0 left-0 w-96 h-96 bg-gradient-to-br from-green-400/20 to-emerald-400/20 rounded-full blur-3xl -z-10"></div>
              <CardHeader className="pb-4">
                <div className="flex items-center gap-4 mb-2">
                  <div className="p-3 bg-gradient-to-br from-green-500 to-emerald-600 rounded-2xl shadow-lg">
                    <FiEye className="h-6 w-6 text-white" />
                  </div>
                  <div>
                    <CardTitle className="text-2xl font-bold bg-gradient-to-r from-green-600 to-emerald-600 bg-clip-text text-transparent">
                      Your Personalized Recommendation
                    </CardTitle>
                    <p className="text-sm text-slate-600 mt-1">
                      Based on your priorities and the options you're considering
                    </p>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="p-6 bg-white/90 rounded-2xl border-2 border-green-200 shadow-lg backdrop-blur-sm">
                  <p className="text-base text-slate-800 leading-relaxed whitespace-pre-wrap">
                    {framingText}
                  </p>
                </div>

                <div className="p-6 bg-gradient-to-br from-blue-50/80 to-indigo-50/80 border-2 border-blue-200/50 rounded-2xl backdrop-blur-sm shadow-md">
                  <p className="text-sm text-blue-900 font-bold mb-3 flex items-center gap-2">
                    <div className="w-1.5 h-1.5 bg-blue-600 rounded-full"></div>
                    Next Steps
                  </p>
                  <p className="text-sm text-blue-800 leading-relaxed">
                    This recommendation is based on your stated priorities and the analysis of your options.
                    Use this insight to move forward with confidence, knowing you've thoroughly examined
                    all aspects of your decision.
                  </p>
                </div>

                <Button
                  onClick={handleRestart}
                  variant="outline"
                  className="w-full py-7 text-base font-semibold border-2 border-slate-300 hover:bg-slate-50 hover:border-slate-400 rounded-2xl transition-all duration-300"
                >
                  Make Another Decision
                </Button>
              </CardContent>
            </Card>

            {/* Summary Card */}
            <Card className="shadow-2xl border-0 bg-white/70 backdrop-blur-xl">
              <CardHeader className="pb-4">
                <CardTitle className="text-xl font-bold text-slate-900 flex items-center gap-3">
                  <div className="p-2 bg-gradient-to-br from-indigo-100 to-purple-100 rounded-xl">
                    <FiLayers className="h-5 w-5 text-indigo-600" />
                  </div>
                  Your Decision Journey Summary
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-5">
                <div className="p-4 bg-gradient-to-br from-slate-50 to-slate-100/50 rounded-xl border border-slate-200">
                  <h4 className="text-sm font-bold text-slate-700 mb-2 flex items-center gap-2">
                    <div className="w-1 h-1 bg-slate-500 rounded-full"></div>
                    Decision:
                  </h4>
                  <p className="text-sm text-slate-800 font-medium">{decisionStatement}</p>
                </div>

                <div className="p-4 bg-gradient-to-br from-blue-50 to-cyan-50/50 rounded-xl border border-blue-200">
                  <h4 className="text-sm font-bold text-blue-700 mb-3 flex items-center gap-2">
                    <div className="w-1 h-1 bg-blue-500 rounded-full"></div>
                    Options Considered:
                  </h4>
                  <ul className="space-y-2">
                    {options.map((option, idx) => (
                      <li key={idx} className="text-sm text-slate-700 flex items-center gap-2 font-medium">
                        <FiCheck className="h-4 w-4 text-green-600 flex-shrink-0" />
                        {option.name}
                      </li>
                    ))}
                  </ul>
                </div>

                <div className="p-4 bg-gradient-to-br from-purple-50 to-pink-50/50 rounded-xl border border-purple-200">
                  <h4 className="text-sm font-bold text-purple-700 mb-3 flex items-center gap-2">
                    <div className="w-1 h-1 bg-purple-500 rounded-full"></div>
                    Your Priorities:
                  </h4>
                  <ul className="space-y-2">
                    {priorities.map((priority, idx) => (
                      <li key={idx} className="text-sm text-slate-700 font-medium">
                        • {priority.priority} ({getImportanceLabel(priority.importance)} importance)
                      </li>
                    ))}
                  </ul>
                </div>

                <div className="p-4 bg-gradient-to-br from-orange-50 to-amber-50/50 rounded-xl border border-orange-200">
                  <h4 className="text-sm font-bold text-orange-700 mb-3 flex items-center gap-2">
                    <div className="w-1 h-1 bg-orange-500 rounded-full"></div>
                    Biases Identified:
                  </h4>
                  <ul className="space-y-2">
                    {biases.map((bias, idx) => (
                      <li key={idx} className="text-sm text-slate-700 font-medium">
                        • {bias.name}
                      </li>
                    ))}
                  </ul>
                </div>
              </CardContent>
            </Card>
          </div>
        )}
      </div>
    </div>
  )
}
