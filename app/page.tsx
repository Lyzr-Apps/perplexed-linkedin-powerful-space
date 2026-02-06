'use client'

import { useState, useEffect } from 'react'
import { callAIAgent } from '@/lib/aiAgent'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Loader2, Check, AlertCircle, ExternalLink, Clock, TrendingUp, FileText } from 'lucide-react'
import { FaLinkedin, FaLightbulb, FaChartLine, FaBook, FaBolt } from 'react-icons/fa'

// Agent IDs from workflow_state.json
const AGENT_IDS = {
  researchContentManager: '69858425b90162af337b1e15',
  topicResearch: '698583f19ccc65e46e9a5ecd',
  scriptGeneration: '6985840b2237a2c55706afcf',
  linkedInPublisher: '6985843c1caa4e686dd66d65'
}

// TypeScript Interfaces from test response data
interface Citation {
  claim?: string
  source: string
  title?: string
  url?: string
  relevance?: string
  stat?: string
}

interface GeneratedPost {
  id: string
  content: string
  citations: Citation[]
  style: string
  date: string
  status: 'draft' | 'posted' | 'failed'
  postUrl?: string
  wordCount?: number
  hashtags?: string[]
}

type ResearchMode = 'specify_topic' | 'discover_trends'
type PostStyle = 'thought_leadership' | 'data_driven' | 'storytelling' | 'quick_tips'

export default function Home() {
  const [activeTab, setActiveTab] = useState<'create' | 'history'>('create')
  const [researchMode, setResearchMode] = useState<ResearchMode>('specify_topic')
  const [topic, setTopic] = useState('')
  const [industry, setIndustry] = useState('Technology')
  const [selectedStyle, setSelectedStyle] = useState<PostStyle>('thought_leadership')
  const [isGenerating, setIsGenerating] = useState(false)
  const [isPosting, setIsPosting] = useState(false)
  const [generatedContent, setGeneratedContent] = useState('')
  const [editedContent, setEditedContent] = useState('')
  const [citations, setCitations] = useState<Citation[]>([])
  const [researchSummary, setResearchSummary] = useState('')
  const [error, setError] = useState('')
  const [postHistory, setPostHistory] = useState<GeneratedPost[]>([])
  const [historyFilter, setHistoryFilter] = useState<'all' | 'posted' | 'drafts'>('all')
  const [showConfirmModal, setShowConfirmModal] = useState(false)
  const [showSourcesPanel, setShowSourcesPanel] = useState(false)
  const [currentWordCount, setCurrentWordCount] = useState(0)
  const [currentHashtags, setCurrentHashtags] = useState<string[]>([])

  // Load post history from localStorage
  useEffect(() => {
    const savedHistory = localStorage.getItem('linkedin_post_history')
    if (savedHistory) {
      setPostHistory(JSON.parse(savedHistory))
    }
  }, [])

  // Save post history to localStorage
  const saveToHistory = (post: GeneratedPost) => {
    const updatedHistory = [post, ...postHistory]
    setPostHistory(updatedHistory)
    localStorage.setItem('linkedin_post_history', JSON.stringify(updatedHistory))
  }

  // Update post in history
  const updatePostInHistory = (postId: string, updates: Partial<GeneratedPost>) => {
    const updatedHistory = postHistory.map(post =>
      post.id === postId ? { ...post, ...updates } : post
    )
    setPostHistory(updatedHistory)
    localStorage.setItem('linkedin_post_history', JSON.stringify(updatedHistory))
  }

  // Generate content using Research & Content Manager
  const handleGenerateContent = async () => {
    if (researchMode === 'specify_topic' && !topic.trim()) {
      setError('Please enter a topic to research')
      return
    }

    setIsGenerating(true)
    setError('')
    setGeneratedContent('')
    setCitations([])
    setResearchSummary('')

    try {
      // Build the input message for the Research & Content Manager
      const inputMessage = researchMode === 'specify_topic'
        ? `Generate a LinkedIn post about ${topic} using a ${selectedStyle.replace('_', ' ')} style`
        : `Discover trending topics in the ${industry} industry and create a LinkedIn post using a ${selectedStyle.replace('_', ' ')} style`

      const result = await callAIAgent(inputMessage, AGENT_IDS.researchContentManager)

      if (result.success && result.response.status === 'success') {
        const responseData = result.response.result

        // Extract generated content
        let content = ''
        let extractedCitations: Citation[] = []
        let wordCount = 0
        let hashtags: string[] = []

        // Handle response structure from test data
        if (responseData.generated_content?.post_preview) {
          content = responseData.generated_content.post_preview
          wordCount = responseData.generated_content.word_count || 0
        } else if (responseData.post_content) {
          content = responseData.post_content
          wordCount = responseData.word_count || 0
        }

        // Extract citations
        if (responseData.citations) {
          extractedCitations = responseData.citations
        }

        // Extract hashtags
        if (responseData.hashtags) {
          hashtags = responseData.hashtags
        }

        // Extract research summary
        if (responseData.research_summary) {
          const summary = responseData.research_summary
          setResearchSummary(
            `Topic: ${summary.topic || 'N/A'}\n\n` +
            `Key Findings:\n${(summary.key_findings || []).map((f: string) => `• ${f}`).join('\n')}`
          )
        }

        setGeneratedContent(content)
        setEditedContent(content)
        setCitations(extractedCitations)
        setCurrentWordCount(wordCount)
        setCurrentHashtags(hashtags)

        // Save as draft to history
        const newPost: GeneratedPost = {
          id: Date.now().toString(),
          content,
          citations: extractedCitations,
          style: selectedStyle,
          date: new Date().toISOString(),
          status: 'draft',
          wordCount,
          hashtags
        }
        saveToHistory(newPost)
      } else {
        setError(result.response?.result?.message || 'Failed to generate content')
      }
    } catch (err) {
      setError('An error occurred while generating content. Please try again.')
      console.error(err)
    } finally {
      setIsGenerating(false)
    }
  }

  // Post to LinkedIn using LinkedIn Publisher Agent
  const handleApproveAndPost = async () => {
    setShowConfirmModal(false)
    setIsPosting(true)
    setError('')

    try {
      const result = await callAIAgent(
        `Post this content to LinkedIn: ${editedContent}`,
        AGENT_IDS.linkedInPublisher
      )

      if (result.success && result.response.status === 'success') {
        const publishData = result.response.result

        // Find the draft post and update it
        const draftPost = postHistory.find(p => p.content === generatedContent && p.status === 'draft')
        if (draftPost) {
          updatePostInHistory(draftPost.id, {
            status: 'posted',
            postUrl: publishData.post_url,
            content: editedContent
          })
        }

        // Reset form
        setGeneratedContent('')
        setEditedContent('')
        setCitations([])
        setResearchSummary('')
        setTopic('')
        setActiveTab('history')
      } else {
        setError(result.response?.result?.message || 'Failed to post to LinkedIn')

        // Update post status to failed
        const draftPost = postHistory.find(p => p.content === generatedContent && p.status === 'draft')
        if (draftPost) {
          updatePostInHistory(draftPost.id, { status: 'failed' })
        }
      }
    } catch (err) {
      setError('An error occurred while posting to LinkedIn. Please try again.')
      console.error(err)
    } finally {
      setIsPosting(false)
    }
  }

  // Update word count when content is edited
  useEffect(() => {
    const words = editedContent.trim().split(/\s+/).filter(w => w.length > 0).length
    setCurrentWordCount(words)
  }, [editedContent])

  // Filter post history
  const filteredHistory = postHistory.filter(post => {
    if (historyFilter === 'all') return true
    if (historyFilter === 'posted') return post.status === 'posted'
    if (historyFilter === 'drafts') return post.status === 'draft'
    return true
  })

  return (
    <div className="min-h-screen bg-gradient-to-br from-[#0A66C2] via-[#1E3A5F] to-[#0D1B2A]">
      {/* Header */}
      <header className="bg-white/10 backdrop-blur-sm border-b border-white/20">
        <div className="max-w-7xl mx-auto px-4 py-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <FaLinkedin className="text-white text-3xl" />
              <h1 className="text-2xl font-bold text-white">LinkedIn Content Studio</h1>
            </div>
            <div className="flex gap-2">
              <Button
                variant={activeTab === 'create' ? 'default' : 'ghost'}
                onClick={() => setActiveTab('create')}
                className={activeTab === 'create' ? 'bg-white text-[#0A66C2]' : 'text-white hover:bg-white/20'}
              >
                <FileText className="mr-2 h-4 w-4" />
                Create
              </Button>
              <Button
                variant={activeTab === 'history' ? 'default' : 'ghost'}
                onClick={() => setActiveTab('history')}
                className={activeTab === 'history' ? 'bg-white text-[#0A66C2]' : 'text-white hover:bg-white/20'}
              >
                <Clock className="mr-2 h-4 w-4" />
                History
              </Button>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 py-8 sm:px-6 lg:px-8">
        {activeTab === 'create' && (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            {/* Left Column - Configuration */}
            <div className="space-y-6">
              <Card className="shadow-xl border-0">
                <CardHeader>
                  <CardTitle className="text-xl font-semibold">Content Configuration</CardTitle>
                </CardHeader>
                <CardContent className="space-y-6">
                  {/* Research Mode Toggle */}
                  <div>
                    <label className="text-sm font-medium mb-3 block">Research Mode</label>
                    <div className="flex gap-2 p-1 bg-gray-100 rounded-lg">
                      <button
                        onClick={() => setResearchMode('specify_topic')}
                        className={`flex-1 py-2 px-4 rounded-md text-sm font-medium transition-all ${
                          researchMode === 'specify_topic'
                            ? 'bg-white shadow-sm text-[#0A66C2]'
                            : 'text-gray-600 hover:text-gray-900'
                        }`}
                      >
                        Specify Topic
                      </button>
                      <button
                        onClick={() => setResearchMode('discover_trends')}
                        className={`flex-1 py-2 px-4 rounded-md text-sm font-medium transition-all ${
                          researchMode === 'discover_trends'
                            ? 'bg-white shadow-sm text-[#0A66C2]'
                            : 'text-gray-600 hover:text-gray-900'
                        }`}
                      >
                        Discover Trends
                      </button>
                    </div>
                  </div>

                  {/* Topic Input or Industry Dropdown */}
                  {researchMode === 'specify_topic' ? (
                    <div>
                      <label htmlFor="topic" className="text-sm font-medium mb-2 block">
                        Topic
                      </label>
                      <Input
                        id="topic"
                        placeholder="Enter topic to research..."
                        value={topic}
                        onChange={(e) => setTopic(e.target.value)}
                        maxLength={200}
                        className="w-full"
                      />
                      <p className="text-xs text-gray-500 mt-1">{topic.length}/200 characters</p>
                    </div>
                  ) : (
                    <div>
                      <label htmlFor="industry" className="text-sm font-medium mb-2 block">
                        Industry
                      </label>
                      <select
                        id="industry"
                        value={industry}
                        onChange={(e) => setIndustry(e.target.value)}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-[#0A66C2] focus:border-transparent"
                      >
                        <option>Technology</option>
                        <option>Finance</option>
                        <option>Healthcare</option>
                        <option>Marketing</option>
                        <option>Manufacturing</option>
                        <option>Retail</option>
                        <option>Education</option>
                        <option>Real Estate</option>
                      </select>
                    </div>
                  )}

                  {/* Style Selector */}
                  <div>
                    <label className="text-sm font-medium mb-3 block">Post Style</label>
                    <div className="grid grid-cols-2 gap-2">
                      <button
                        onClick={() => setSelectedStyle('thought_leadership')}
                        className={`flex items-center gap-2 p-3 rounded-lg border-2 transition-all ${
                          selectedStyle === 'thought_leadership'
                            ? 'border-[#0A66C2] bg-blue-50'
                            : 'border-gray-200 hover:border-gray-300'
                        }`}
                      >
                        <FaLightbulb className={selectedStyle === 'thought_leadership' ? 'text-[#0A66C2]' : 'text-gray-400'} />
                        <span className="text-sm font-medium">Thought Leadership</span>
                      </button>
                      <button
                        onClick={() => setSelectedStyle('data_driven')}
                        className={`flex items-center gap-2 p-3 rounded-lg border-2 transition-all ${
                          selectedStyle === 'data_driven'
                            ? 'border-[#0A66C2] bg-blue-50'
                            : 'border-gray-200 hover:border-gray-300'
                        }`}
                      >
                        <FaChartLine className={selectedStyle === 'data_driven' ? 'text-[#0A66C2]' : 'text-gray-400'} />
                        <span className="text-sm font-medium">Data-Driven</span>
                      </button>
                      <button
                        onClick={() => setSelectedStyle('storytelling')}
                        className={`flex items-center gap-2 p-3 rounded-lg border-2 transition-all ${
                          selectedStyle === 'storytelling'
                            ? 'border-[#0A66C2] bg-blue-50'
                            : 'border-gray-200 hover:border-gray-300'
                        }`}
                      >
                        <FaBook className={selectedStyle === 'storytelling' ? 'text-[#0A66C2]' : 'text-gray-400'} />
                        <span className="text-sm font-medium">Storytelling</span>
                      </button>
                      <button
                        onClick={() => setSelectedStyle('quick_tips')}
                        className={`flex items-center gap-2 p-3 rounded-lg border-2 transition-all ${
                          selectedStyle === 'quick_tips'
                            ? 'border-[#0A66C2] bg-blue-50'
                            : 'border-gray-200 hover:border-gray-300'
                        }`}
                      >
                        <FaBolt className={selectedStyle === 'quick_tips' ? 'text-[#0A66C2]' : 'text-gray-400'} />
                        <span className="text-sm font-medium">Quick Tips</span>
                      </button>
                    </div>
                  </div>

                  {/* Generate Button */}
                  <Button
                    onClick={handleGenerateContent}
                    disabled={isGenerating || (researchMode === 'specify_topic' && !topic.trim())}
                    className="w-full bg-[#0A66C2] hover:bg-[#004182] text-white py-6 text-lg"
                  >
                    {isGenerating ? (
                      <>
                        <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                        Generating Content...
                      </>
                    ) : (
                      'Generate Content'
                    )}
                  </Button>

                  {/* Error Message */}
                  {error && (
                    <div className="flex items-start gap-2 p-4 bg-red-50 border border-red-200 rounded-lg">
                      <AlertCircle className="h-5 w-5 text-red-600 mt-0.5" />
                      <p className="text-sm text-red-800">{error}</p>
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>

            {/* Right Column - Preview/Output */}
            <div className="space-y-6">
              {generatedContent ? (
                <>
                  {/* Preview Card */}
                  <Card className="shadow-xl border-0">
                    <CardHeader className="pb-3">
                      <CardTitle className="text-xl font-semibold flex items-center justify-between">
                        <span>Post Preview</span>
                        <div className="flex items-center gap-2 text-sm text-gray-500 font-normal">
                          <span>{currentWordCount} words</span>
                        </div>
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      {/* LinkedIn-style mockup */}
                      <div className="border border-gray-200 rounded-lg overflow-hidden">
                        <div className="bg-white p-4">
                          <div className="flex items-center gap-3 mb-3">
                            <div className="w-12 h-12 bg-gradient-to-br from-[#0A66C2] to-[#1E3A5F] rounded-full flex items-center justify-center">
                              <FaLinkedin className="text-white text-xl" />
                            </div>
                            <div>
                              <p className="font-semibold text-sm">Your Name</p>
                              <p className="text-xs text-gray-500">Your Title • Now</p>
                            </div>
                          </div>
                          <div className="prose prose-sm max-w-none">
                            <p className="whitespace-pre-wrap text-sm text-gray-800">{editedContent}</p>
                          </div>
                          {currentHashtags.length > 0 && (
                            <div className="flex flex-wrap gap-2 mt-3">
                              {currentHashtags.map((tag, idx) => (
                                <span key={idx} className="text-xs text-[#0A66C2] font-medium">
                                  #{tag}
                                </span>
                              ))}
                            </div>
                          )}
                        </div>
                        <div className="bg-gray-50 px-4 py-2 border-t border-gray-200 flex items-center justify-between text-xs text-gray-500">
                          <span>0 reactions • 0 comments</span>
                        </div>
                      </div>
                    </CardContent>
                  </Card>

                  {/* Sources Panel */}
                  {citations.length > 0 && (
                    <Card className="shadow-xl border-0">
                      <CardHeader
                        className="cursor-pointer"
                        onClick={() => setShowSourcesPanel(!showSourcesPanel)}
                      >
                        <CardTitle className="text-lg font-semibold flex items-center justify-between">
                          <span>Sources & Citations ({citations.length})</span>
                          <Check className="h-5 w-5 text-green-600" />
                        </CardTitle>
                      </CardHeader>
                      {showSourcesPanel && (
                        <CardContent className="space-y-3">
                          {citations.map((citation, idx) => (
                            <div key={idx} className="p-3 bg-blue-50 rounded-lg border border-blue-100">
                              {citation.claim && (
                                <p className="text-sm font-medium text-gray-900 mb-1">{citation.claim}</p>
                              )}
                              {citation.stat && (
                                <p className="text-sm font-medium text-gray-900 mb-1">{citation.stat}</p>
                              )}
                              <p className="text-xs text-gray-600">{citation.source}</p>
                              {citation.url && (
                                <a
                                  href={citation.url}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="text-xs text-[#0A66C2] hover:underline flex items-center gap-1 mt-1"
                                >
                                  View source <ExternalLink className="h-3 w-3" />
                                </a>
                              )}
                            </div>
                          ))}
                        </CardContent>
                      )}
                    </Card>
                  )}

                  {/* Edit Textarea */}
                  <Card className="shadow-xl border-0">
                    <CardHeader>
                      <CardTitle className="text-lg font-semibold">Edit Content</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <textarea
                        value={editedContent}
                        onChange={(e) => setEditedContent(e.target.value)}
                        maxLength={3000}
                        rows={8}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-[#0A66C2] focus:border-transparent resize-none"
                      />
                      <p className="text-xs text-gray-500 mt-2">{editedContent.length}/3000 characters</p>
                    </CardContent>
                  </Card>

                  {/* Approve & Post Button */}
                  <Button
                    onClick={() => setShowConfirmModal(true)}
                    disabled={isPosting || !editedContent.trim()}
                    className="w-full bg-green-600 hover:bg-green-700 text-white py-6 text-lg"
                  >
                    {isPosting ? (
                      <>
                        <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                        Posting to LinkedIn...
                      </>
                    ) : (
                      <>
                        <Check className="mr-2 h-5 w-5" />
                        Approve & Post to LinkedIn
                      </>
                    )}
                  </Button>
                </>
              ) : (
                <Card className="shadow-xl border-0">
                  <CardContent className="py-16 text-center">
                    <TrendingUp className="h-16 w-16 text-gray-300 mx-auto mb-4" />
                    <h3 className="text-lg font-semibold text-gray-700 mb-2">No Content Yet</h3>
                    <p className="text-gray-500">
                      Configure your settings and click &quot;Generate Content&quot; to create your LinkedIn post
                    </p>
                  </CardContent>
                </Card>
              )}
            </div>
          </div>
        )}

        {activeTab === 'history' && (
          <div className="space-y-6">
            {/* Filter Tabs */}
            <Card className="shadow-xl border-0">
              <CardContent className="pt-6">
                <div className="flex gap-2">
                  <Button
                    variant={historyFilter === 'all' ? 'default' : 'outline'}
                    onClick={() => setHistoryFilter('all')}
                    className={historyFilter === 'all' ? 'bg-[#0A66C2]' : ''}
                  >
                    All ({postHistory.length})
                  </Button>
                  <Button
                    variant={historyFilter === 'posted' ? 'default' : 'outline'}
                    onClick={() => setHistoryFilter('posted')}
                    className={historyFilter === 'posted' ? 'bg-[#0A66C2]' : ''}
                  >
                    Posted ({postHistory.filter(p => p.status === 'posted').length})
                  </Button>
                  <Button
                    variant={historyFilter === 'drafts' ? 'default' : 'outline'}
                    onClick={() => setHistoryFilter('drafts')}
                    className={historyFilter === 'drafts' ? 'bg-[#0A66C2]' : ''}
                  >
                    Drafts ({postHistory.filter(p => p.status === 'draft').length})
                  </Button>
                </div>
              </CardContent>
            </Card>

            {/* Post History List */}
            {filteredHistory.length === 0 ? (
              <Card className="shadow-xl border-0">
                <CardContent className="py-16 text-center">
                  <Clock className="h-16 w-16 text-gray-300 mx-auto mb-4" />
                  <h3 className="text-lg font-semibold text-gray-700 mb-2">No Posts Yet</h3>
                  <p className="text-gray-500 mb-4">
                    Create your first LinkedIn post to see it here
                  </p>
                  <Button
                    onClick={() => setActiveTab('create')}
                    className="bg-[#0A66C2] hover:bg-[#004182]"
                  >
                    Create Post
                  </Button>
                </CardContent>
              </Card>
            ) : (
              <div className="space-y-4">
                {filteredHistory.map((post) => (
                  <Card key={post.id} className="shadow-xl border-0">
                    <CardContent className="pt-6">
                      <div className="flex items-start justify-between mb-4">
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 bg-gradient-to-br from-[#0A66C2] to-[#1E3A5F] rounded-full flex items-center justify-center">
                            <FaLinkedin className="text-white" />
                          </div>
                          <div>
                            <p className="font-semibold text-sm">LinkedIn Post</p>
                            <p className="text-xs text-gray-500">
                              {new Date(post.date).toLocaleDateString()} • {post.style.replace('_', ' ')}
                            </p>
                          </div>
                        </div>
                        <span
                          className={`px-3 py-1 rounded-full text-xs font-medium ${
                            post.status === 'posted'
                              ? 'bg-green-100 text-green-700'
                              : post.status === 'draft'
                              ? 'bg-blue-100 text-blue-700'
                              : 'bg-red-100 text-red-700'
                          }`}
                        >
                          {post.status.charAt(0).toUpperCase() + post.status.slice(1)}
                        </span>
                      </div>
                      <p className="text-sm text-gray-700 whitespace-pre-wrap line-clamp-4 mb-3">
                        {post.content}
                      </p>
                      {post.hashtags && post.hashtags.length > 0 && (
                        <div className="flex flex-wrap gap-2 mb-3">
                          {post.hashtags.map((tag, idx) => (
                            <span key={idx} className="text-xs text-[#0A66C2] font-medium">
                              #{tag}
                            </span>
                          ))}
                        </div>
                      )}
                      <div className="flex items-center justify-between pt-3 border-t border-gray-200">
                        <div className="flex items-center gap-4 text-xs text-gray-500">
                          <span>{post.wordCount || 0} words</span>
                          <span>{post.citations.length} citations</span>
                        </div>
                        {post.status === 'posted' && post.postUrl && (
                          <a
                            href={post.postUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-xs text-[#0A66C2] hover:underline flex items-center gap-1"
                          >
                            View on LinkedIn <ExternalLink className="h-3 w-3" />
                          </a>
                        )}
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </div>
        )}
      </main>

      {/* Confirmation Modal */}
      {showConfirmModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <Card className="max-w-md w-full shadow-2xl border-0">
            <CardHeader>
              <CardTitle className="text-xl font-semibold">Post to LinkedIn?</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <p className="text-gray-700">
                Are you sure you want to publish this post to your LinkedIn profile?
              </p>
              <div className="flex gap-3">
                <Button
                  onClick={() => setShowConfirmModal(false)}
                  variant="outline"
                  className="flex-1"
                >
                  Cancel
                </Button>
                <Button
                  onClick={handleApproveAndPost}
                  className="flex-1 bg-green-600 hover:bg-green-700"
                >
                  Confirm & Post
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  )
}
