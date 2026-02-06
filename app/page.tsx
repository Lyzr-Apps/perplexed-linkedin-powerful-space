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

      if (result.success && result.response?.status === 'success') {
        const data = result.response.result

        if (data) {
          // Extract decision statement - try different possible field names
          const statement = data.decision_statement || data.restatement || data.clarified_decision || data.response

          if (statement) {
            setDecisionStatement(statement)
          }

          // Extract questions - handle different possible structures
          let extractedQuestions: Question[] = []

          if (data.questions && Array.isArray(data.questions)) {
            extractedQuestions = data.questions.map((q: any) => ({
              question: typeof q === 'string' ? q : q.question || q.text || '',
              answer: ''
            }))
          } else if (data.data?.questions && Array.isArray(data.data.questions)) {
            extractedQuestions = data.data.questions.map((q: any) => ({
              question: typeof q === 'string' ? q : q.question || q.text || '',
              answer: ''
            }))
          }

          if (extractedQuestions.length > 0) {
            setQuestions(extractedQuestions)
            setCurrentStep(2)
          } else {
            setError('No questions received. Please try again.')
          }
        }
      } else {
        setError('Failed to clarify decision. Please try again.')
      }
    } catch (err) {
      setError('An error occurred. Please try again.')
      console.error(err)
    } finally {
      setLoadingStep1(false)
    }
  }

  // Step 2: Handle question answers
  const handleAnswerChange = (index: number, answer: string) => {
    setQuestions(prev => prev.map((q, i) =>
      i === index ? { ...q, answer } : q
    ))
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

      if (result.success && result.response?.status === 'success') {
        const data = result.response

        // Extract options
        if (data.options && Array.isArray(data.options)) {
          setOptions(data.options)
        }

        // Extract priorities
        if (data.user_priorities && Array.isArray(data.user_priorities)) {
          setPriorities(data.user_priorities)
        }

        setCurrentStep(3)
      } else {
        setError('Failed to build decision canvas. Please try again.')
      }
    } catch (err) {
      setError('An error occurred. Please try again.')
      console.error(err)
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

      if (result.success && result.response?.status === 'success') {
        const data = result.response.result

        if (data) {
          // Extract biases - handle different possible structures
          let extractedBiases: Bias[] = []

          if (data.biases && Array.isArray(data.biases)) {
            extractedBiases = data.biases.map((b: any) => ({
              name: b.name || b.bias || 'Cognitive Bias',
              explanation: b.explanation || b.description || b.applies_to || ''
            }))
          } else if (data.data?.biases && Array.isArray(data.data.biases)) {
            extractedBiases = data.data.biases.map((b: any) => ({
              name: b.name || b.bias || 'Cognitive Bias',
              explanation: b.explanation || b.description || b.applies_to || ''
            }))
          }

          if (extractedBiases.length > 0) {
            setBiases(extractedBiases)
            setCurrentStep(4)
          } else {
            setError('No biases detected. Please try again.')
          }
        }
      } else {
        setError('Failed to detect biases. Please try again.')
      }
    } catch (err) {
      setError('An error occurred. Please try again.')
      console.error(err)
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

      const message = `Decision: "${decisionStatement}"\n\nUser priorities: ${prioritiesText}\n\nOptions:\n${optionsText}\n\nPlease provide neutral framing that helps the user understand how each option aligns with their priorities, without telling them what to choose.`

      const result = await callAIAgent(message, AGENT_IDS.framingAssistant)

      if (result.success && result.response?.status === 'success') {
        const data = result.response.result

        if (data) {
          // Extract framing text
          const framing = data.framing || data.neutral_framing || data.summary || data.response

          if (framing) {
            setFramingText(framing)
            setCurrentStep(5)
          } else {
            setError('No framing received. Please try again.')
          }
        }
      } else {
        setError('Failed to generate framing. Please try again.')
      }
    } catch (err) {
      setError('An error occurred. Please try again.')
      console.error(err)
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
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-slate-100">
      {/* Header */}
      <header className="bg-white border-b border-slate-200 sticky top-0 z-40 shadow-sm">
        <div className="max-w-5xl mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold text-slate-900">Decision Companion</h1>
              <p className="text-sm text-slate-600 mt-1">
                I won't decide for you — I'll make your thinking clearer so you can decide confidently.
              </p>
            </div>
            {currentStep > 1 && (
              <Button
                onClick={handleRestart}
                variant="outline"
                size="sm"
                className="text-slate-600"
              >
                Start Over
              </Button>
            )}
          </div>
        </div>
      </header>

      {/* Step Indicator */}
      <div className="max-w-5xl mx-auto px-4 py-6">
        <div className="flex items-center justify-between mb-8">
          {[1, 2, 3, 4, 5].map((step) => (
            <div key={step} className="flex items-center">
              <div className="flex flex-col items-center">
                <div
                  className={`w-10 h-10 rounded-full flex items-center justify-center font-semibold text-sm transition-all ${
                    step === currentStep
                      ? 'bg-blue-600 text-white ring-4 ring-blue-100'
                      : step < currentStep
                      ? 'bg-green-500 text-white'
                      : 'bg-slate-200 text-slate-500'
                  }`}
                >
                  {step < currentStep ? <FiCheck className="h-5 w-5" /> : step}
                </div>
                <span className="text-xs text-slate-600 mt-2 text-center whitespace-nowrap">
                  Step {step}/5
                </span>
              </div>
              {step < 5 && (
                <div
                  className={`w-16 h-1 mx-2 ${
                    step < currentStep ? 'bg-green-500' : 'bg-slate-200'
                  }`}
                />
              )}
            </div>
          ))}
        </div>

        {/* Error Message */}
        {error && (
          <div className="mb-6 flex items-start gap-3 p-4 bg-red-50 border border-red-200 rounded-lg">
            <FiAlertCircle className="h-5 w-5 text-red-600 mt-0.5 flex-shrink-0" />
            <p className="text-sm text-red-800">{error}</p>
          </div>
        )}

        {/* Step 1: Clarify the Decision */}
        {currentStep === 1 && (
          <Card className="shadow-lg border-slate-200">
            <CardHeader>
              <CardTitle className="text-xl font-semibold text-slate-900 flex items-center gap-2">
                <FiMessageSquare className="h-6 w-6 text-blue-600" />
                What decision are you trying to make today?
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              <div>
                <label htmlFor="decision" className="text-sm font-medium text-slate-700 mb-2 block">
                  Describe your decision or dilemma
                </label>
                <textarea
                  id="decision"
                  placeholder="Example: Should I accept a job offer at a startup or stay at my current corporate job?"
                  value={initialDecision}
                  onChange={(e) => setInitialDecision(e.target.value)}
                  rows={4}
                  className="w-full px-4 py-3 border border-slate-300 rounded-lg shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none text-slate-900"
                />
                <p className="text-xs text-slate-500 mt-2">
                  Be as specific as possible about the choice you're facing.
                </p>
              </div>

              <Button
                onClick={handleSubmitDecision}
                disabled={loadingStep1 || !initialDecision.trim()}
                className="w-full bg-blue-600 hover:bg-blue-700 text-white py-6 text-base font-medium"
              >
                {loadingStep1 ? (
                  <>
                    <AiOutlineLoading3Quarters className="mr-2 h-5 w-5 animate-spin" />
                    Clarifying your decision...
                  </>
                ) : (
                  <>
                    Continue
                    <FiChevronRight className="ml-2 h-5 w-5" />
                  </>
                )}
              </Button>
            </CardContent>
          </Card>
        )}

        {/* Step 2: Answer Questions */}
        {currentStep === 2 && (
          <div className="space-y-6">
            {/* Decision Statement */}
            {decisionStatement && (
              <Card className="shadow-lg border-blue-200 bg-blue-50">
                <CardContent className="pt-6">
                  <p className="text-sm text-blue-800 font-medium mb-2">Your decision:</p>
                  <p className="text-lg text-blue-900">{decisionStatement}</p>
                </CardContent>
              </Card>
            )}

            {/* Questions */}
            <Card className="shadow-lg border-slate-200">
              <CardHeader>
                <CardTitle className="text-xl font-semibold text-slate-900 flex items-center gap-2">
                  <FiHelpCircle className="h-6 w-6 text-blue-600" />
                  Let's explore your thinking
                </CardTitle>
                <p className="text-sm text-slate-600 mt-2">
                  Question {currentQuestionIndex + 1} of {questions.length}
                </p>
              </CardHeader>
              <CardContent className="space-y-6">
                {questions.length > 0 && (
                  <>
                    <div>
                      <label className="text-sm font-medium text-slate-700 mb-3 block">
                        {questions[currentQuestionIndex].question}
                      </label>
                      <textarea
                        value={questions[currentQuestionIndex].answer || ''}
                        onChange={(e) => handleAnswerChange(currentQuestionIndex, e.target.value)}
                        rows={4}
                        placeholder="Type your answer here..."
                        className="w-full px-4 py-3 border border-slate-300 rounded-lg shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none text-slate-900"
                      />
                    </div>

                    {/* Navigation Buttons */}
                    <div className="flex gap-3">
                      {currentQuestionIndex > 0 && (
                        <Button
                          onClick={handlePreviousQuestion}
                          variant="outline"
                          className="flex-1"
                        >
                          Previous
                        </Button>
                      )}

                      {currentQuestionIndex < questions.length - 1 ? (
                        <Button
                          onClick={handleNextQuestion}
                          disabled={!questions[currentQuestionIndex].answer?.trim()}
                          className="flex-1 bg-blue-600 hover:bg-blue-700"
                        >
                          Next Question
                          <FiChevronRight className="ml-2 h-4 w-4" />
                        </Button>
                      ) : (
                        <Button
                          onClick={handleCompleteQuestions}
                          disabled={loadingStep2}
                          className="flex-1 bg-blue-600 hover:bg-blue-700"
                        >
                          {loadingStep2 ? (
                            <>
                              <AiOutlineLoading3Quarters className="mr-2 h-5 w-5 animate-spin" />
                              Building decision canvas...
                            </>
                          ) : (
                            <>
                              Build Decision Canvas
                              <FiChevronRight className="ml-2 h-4 w-4" />
                            </>
                          )}
                        </Button>
                      )}
                    </div>

                    {/* Progress Dots */}
                    <div className="flex items-center justify-center gap-2">
                      {questions.map((q, idx) => (
                        <div
                          key={idx}
                          className={`w-2 h-2 rounded-full ${
                            idx === currentQuestionIndex
                              ? 'bg-blue-600 w-8'
                              : q.answer?.trim()
                              ? 'bg-green-500'
                              : 'bg-slate-300'
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
          <div className="space-y-6">
            <Card className="shadow-lg border-slate-200">
              <CardHeader>
                <CardTitle className="text-xl font-semibold text-slate-900 flex items-center gap-2">
                  <FiLayers className="h-6 w-6 text-blue-600" />
                  Your Decision Canvas
                </CardTitle>
                <p className="text-sm text-slate-600 mt-2">
                  A structured comparison of your options
                </p>
              </CardHeader>
              <CardContent className="space-y-6">
                {/* Options Grid */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {options.map((option, idx) => (
                    <div
                      key={idx}
                      className="p-6 border-2 border-slate-200 rounded-lg bg-white hover:border-blue-300 transition-colors"
                    >
                      <h3 className="text-lg font-semibold text-slate-900 mb-4">
                        {option.name}
                      </h3>

                      {/* Pros */}
                      <div className="mb-4">
                        <h4 className="text-sm font-semibold text-green-700 mb-2 flex items-center gap-2">
                          <FiCheck className="h-4 w-4" />
                          Pros
                        </h4>
                        <ul className="space-y-2">
                          {option.pros.map((pro, proIdx) => (
                            <li key={proIdx} className="text-sm text-slate-700 flex items-start gap-2">
                              <span className="text-green-600 mt-1">•</span>
                              <span>{pro}</span>
                            </li>
                          ))}
                        </ul>
                      </div>

                      {/* Cons */}
                      <div>
                        <h4 className="text-sm font-semibold text-red-700 mb-2 flex items-center gap-2">
                          <FiAlertCircle className="h-4 w-4" />
                          Cons
                        </h4>
                        <ul className="space-y-2">
                          {option.cons.map((con, conIdx) => (
                            <li key={conIdx} className="text-sm text-slate-700 flex items-start gap-2">
                              <span className="text-red-600 mt-1">•</span>
                              <span>{con}</span>
                            </li>
                          ))}
                        </ul>
                      </div>
                    </div>
                  ))}
                </div>

                {/* Priorities */}
                {priorities.length > 0 && (
                  <div className="p-6 bg-slate-50 rounded-lg border border-slate-200">
                    <h3 className="text-lg font-semibold text-slate-900 mb-4">
                      Your Priorities
                    </h3>
                    <div className="space-y-3">
                      {priorities.map((priority, idx) => (
                        <div key={idx} className="flex items-center justify-between">
                          <span className="text-sm font-medium text-slate-700">
                            {priority.priority}
                          </span>
                          <div className="flex items-center gap-3">
                            <div className="w-32 bg-slate-200 rounded-full h-2">
                              <div
                                className={`h-2 rounded-full ${getImportanceColor(priority.importance)}`}
                                style={{ width: `${(priority.importance / 3) * 100}%` }}
                              />
                            </div>
                            <span className={`text-xs font-semibold px-2 py-1 rounded ${
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
                  className="w-full bg-blue-600 hover:bg-blue-700 text-white py-6 text-base font-medium"
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
          <div className="space-y-6">
            <Card className="shadow-lg border-slate-200">
              <CardHeader>
                <CardTitle className="text-xl font-semibold text-slate-900 flex items-center gap-2">
                  <FiAlertCircle className="h-6 w-6 text-orange-600" />
                  Cognitive Biases to Consider
                </CardTitle>
                <p className="text-sm text-slate-600 mt-2">
                  Be aware of these patterns that might be influencing your thinking
                </p>
              </CardHeader>
              <CardContent className="space-y-4">
                {biases.map((bias, idx) => (
                  <div
                    key={idx}
                    className="p-6 border-l-4 border-orange-500 bg-orange-50 rounded-r-lg"
                  >
                    <h3 className="text-base font-semibold text-slate-900 mb-2">
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
                  className="w-full bg-blue-600 hover:bg-blue-700 text-white py-6 text-base font-medium mt-6"
                >
                  {loadingStep4 ? (
                    <>
                      <AiOutlineLoading3Quarters className="mr-2 h-5 w-5 animate-spin" />
                      Generating neutral framing...
                    </>
                  ) : (
                    <>
                      See Neutral Framing
                      <FiChevronRight className="ml-2 h-5 w-5" />
                    </>
                  )}
                </Button>
              </CardContent>
            </Card>
          </div>
        )}

        {/* Step 5: Neutral Framing */}
        {currentStep === 5 && (
          <div className="space-y-6">
            <Card className="shadow-lg border-green-200 bg-gradient-to-br from-white to-green-50">
              <CardHeader>
                <CardTitle className="text-xl font-semibold text-slate-900 flex items-center gap-2">
                  <FiEye className="h-6 w-6 text-green-600" />
                  A Clearer View of Your Decision
                </CardTitle>
                <p className="text-sm text-slate-600 mt-2">
                  Here's how your options align with what matters to you
                </p>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="p-6 bg-white rounded-lg border-2 border-green-200">
                  <p className="text-base text-slate-800 leading-relaxed whitespace-pre-wrap">
                    {framingText}
                  </p>
                </div>

                <div className="p-6 bg-blue-50 border border-blue-200 rounded-lg">
                  <p className="text-sm text-blue-900 font-medium mb-2">
                    Remember: This is YOUR decision
                  </p>
                  <p className="text-sm text-blue-800 leading-relaxed">
                    I've helped you organize your thinking, but only you can decide what's right for you.
                    Take your time. Trust yourself. The clarity you've gained through this process will
                    help you move forward with confidence.
                  </p>
                </div>

                <Button
                  onClick={handleRestart}
                  variant="outline"
                  className="w-full py-6 text-base font-medium"
                >
                  Make Another Decision
                </Button>
              </CardContent>
            </Card>

            {/* Summary Card */}
            <Card className="shadow-lg border-slate-200">
              <CardHeader>
                <CardTitle className="text-lg font-semibold text-slate-900">
                  Your Decision Journey Summary
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <h4 className="text-sm font-semibold text-slate-700 mb-1">Decision:</h4>
                  <p className="text-sm text-slate-600">{decisionStatement}</p>
                </div>

                <div>
                  <h4 className="text-sm font-semibold text-slate-700 mb-2">Options Considered:</h4>
                  <ul className="space-y-1">
                    {options.map((option, idx) => (
                      <li key={idx} className="text-sm text-slate-600 flex items-center gap-2">
                        <FiCheck className="h-4 w-4 text-green-600" />
                        {option.name}
                      </li>
                    ))}
                  </ul>
                </div>

                <div>
                  <h4 className="text-sm font-semibold text-slate-700 mb-2">Your Priorities:</h4>
                  <ul className="space-y-1">
                    {priorities.map((priority, idx) => (
                      <li key={idx} className="text-sm text-slate-600">
                        • {priority.priority} ({getImportanceLabel(priority.importance)} importance)
                      </li>
                    ))}
                  </ul>
                </div>

                <div>
                  <h4 className="text-sm font-semibold text-slate-700 mb-2">Biases Identified:</h4>
                  <ul className="space-y-1">
                    {biases.map((bias, idx) => (
                      <li key={idx} className="text-sm text-slate-600">
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
