'use client'

import { useState, useEffect } from 'react'
import { callAIAgent } from '@/lib/aiAgent'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { FiHome, FiPlus, FiUsers, FiClock, FiTrendingUp, FiStar, FiTarget, FiRefreshCw, FiExternalLink, FiAlertCircle, FiCheck, FiChevronRight, FiFileText } from 'react-icons/fi'
import { FaLinkedin, FaLightbulb, FaChartLine, FaBook, FaBolt } from 'react-icons/fa'
import { AiOutlineLoading3Quarters } from 'react-icons/ai'

// Agent IDs from workflow_state.json
const AGENT_IDS = {
  researchContentManager: '69858425b90162af337b1e15',
  topicResearch: '698583f19ccc65e46e9a5ecd',
  scriptGeneration: '6985840b2237a2c55706afcf',
  linkedInPublisher: '6985843c1caa4e686dd66d65',
  contentIntelligenceManager: '69858930094c8b2d4207dcee',
  linkedInProfileAnalyzer: '69858901094c8b2d4207dcec',
  networkDiscoveryAgent: '698589171caa4e686dd66e40'
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
  topic?: string
}

// Profile interfaces from LinkedIn Profile Analyzer
interface UserProfile {
  name: string
  headline: string
  industry: string
  location: string
  experience_level: string
  top_skills: string[]
  expertise_areas: string[]
  interests: string[]
  current_role: string
  company: string
}

// Network Discovery interfaces
interface RelevantProfile {
  name: string
  headline: string
  relevance_score: number
  common_interests: string[]
  influence_level: 'high' | 'medium' | 'low'
}

interface TrendingTopic {
  topic: string
  frequency: number
  relevance_score: number
  mentioned_by: string[]
}

interface NetworkInsights {
  total_connections_analyzed: number
  relevant_profiles: RelevantProfile[]
  trending_topics: TrendingTopic[]
  content_themes: string[]
}

// Content Intelligence interfaces
interface RecommendedTopic {
  topic: string
  relevance_score: number
  reason: string
  suggested_angle: string
  trending_level: 'high' | 'medium' | 'low'
}

interface ContentIntelligence {
  user_profile_summary: string
  network_trends: string[]
  recommended_topics: RecommendedTopic[]
  content_gaps: string[]
  optimal_posting_time?: string
}

// Mock feed post for Network Feed
interface FeedPost {
  id: string
  author: {
    name: string
    headline: string
    avatar?: string
  }
  content: string
  timestamp: string
  hashtags: string[]
  engagementMetrics?: {
    likes: number
    comments: number
    shares: number
  }
}

type ResearchMode = 'specify_topic' | 'discover_trends' | 'ai_powered'
type PostStyle = 'thought_leadership' | 'data_driven' | 'storytelling' | 'quick_tips'
type ActiveTab = 'dashboard' | 'create' | 'network' | 'history'

export default function Home() {
  // Navigation state
  const [activeTab, setActiveTab] = useState<ActiveTab>('dashboard')

  // Dashboard state
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null)
  const [networkInsights, setNetworkInsights] = useState<NetworkInsights | null>(null)
  const [contentIntelligence, setContentIntelligence] = useState<ContentIntelligence | null>(null)
  const [loadingDashboard, setLoadingDashboard] = useState(false)
  const [loadingProfile, setLoadingProfile] = useState(false)

  // Create screen state
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
  const [currentWordCount, setCurrentWordCount] = useState(0)
  const [currentHashtags, setCurrentHashtags] = useState<string[]>([])

  // History state
  const [postHistory, setPostHistory] = useState<GeneratedPost[]>([])
  const [historyFilter, setHistoryFilter] = useState<'all' | 'posted' | 'drafts'>('all')

  // Modal state
  const [showConfirmModal, setShowConfirmModal] = useState(false)
  const [showSourcesPanel, setShowSourcesPanel] = useState(false)

  // Network Feed state
  const [feedPosts, setFeedPosts] = useState<FeedPost[]>([])

  // Load post history from localStorage
  useEffect(() => {
    const savedHistory = localStorage.getItem('linkedin_post_history')
    if (savedHistory) {
      setPostHistory(JSON.parse(savedHistory))
    }
  }, [])

  // Auto-load dashboard data when tab becomes active
  useEffect(() => {
    if (activeTab === 'dashboard' && !contentIntelligence && !loadingDashboard) {
      loadDashboardData()
    }
  }, [activeTab])

  // Load dashboard data
  const loadDashboardData = async () => {
    setLoadingDashboard(true)
    try {
      // Call Content Intelligence Manager
      const intelligenceResult = await callAIAgent(
        'Get personalized content recommendations and network insights',
        AGENT_IDS.contentIntelligenceManager
      )

      if (intelligenceResult.success && intelligenceResult.response?.status === 'success') {
        const intelligence = intelligenceResult.response.intelligence
        if (intelligence) {
          setContentIntelligence(intelligence)
        }
      }

      // Call Network Discovery Agent
      const networkResult = await callAIAgent(
        'Analyze my network and discover trending topics',
        AGENT_IDS.networkDiscoveryAgent
      )

      if (networkResult.success && networkResult.response?.status === 'success') {
        const insights = networkResult.response.network_insights
        if (insights) {
          setNetworkInsights(insights)

          // Generate mock feed posts from network insights
          if (insights.relevant_profiles && Array.isArray(insights.relevant_profiles)) {
            const mockPosts: FeedPost[] = insights.relevant_profiles.slice(0, 3).map((profile, idx) => ({
              id: `feed-${idx}`,
              author: {
                name: profile.name,
                headline: profile.headline
              },
              content: `Excited to share my latest thoughts on ${profile.common_interests?.[0] || 'innovation'}. The landscape is evolving rapidly and I believe we're at a critical inflection point.\n\nKey insights:\n1. Innovation is accelerating\n2. Teams need to adapt quickly\n3. The future is collaborative\n\nWhat are your thoughts on this trend?`,
              timestamp: `${idx + 2}h ago`,
              hashtags: profile.common_interests?.slice(0, 3) || [],
              engagementMetrics: {
                likes: Math.floor(Math.random() * 200) + 50,
                comments: Math.floor(Math.random() * 30) + 5,
                shares: Math.floor(Math.random() * 20) + 2
              }
            }))
            setFeedPosts(mockPosts)
          }
        }
      }

      // Call Profile Analyzer
      const profileResult = await callAIAgent(
        'Analyze my LinkedIn profile',
        AGENT_IDS.linkedInProfileAnalyzer
      )

      if (profileResult.success && profileResult.response?.status === 'success') {
        const profile = profileResult.response.profile
        if (profile) {
          setUserProfile(profile)
        }
      }
    } catch (err) {
      console.error('Error loading dashboard:', err)
    } finally {
      setLoadingDashboard(false)
    }
  }

  // Refresh profile data
  const handleRefreshProfile = async () => {
    setLoadingProfile(true)
    try {
      const result = await callAIAgent(
        'Refresh and analyze my LinkedIn profile',
        AGENT_IDS.linkedInProfileAnalyzer
      )

      if (result.success && result.response?.status === 'success') {
        const profile = result.response.profile
        if (profile) {
          setUserProfile(profile)
        }
      }
    } catch (err) {
      console.error('Error refreshing profile:', err)
    } finally {
      setLoadingProfile(false)
    }
  }

  // Use recommended topic from dashboard
  const handleUseRecommendedTopic = (recommendedTopic: RecommendedTopic) => {
    setTopic(`${recommendedTopic.topic} - ${recommendedTopic.suggested_angle}`)
    setResearchMode('specify_topic')
    setActiveTab('create')
  }

  // Use trending topic from network
  const handleUseTrendingTopic = (trendingTopic: TrendingTopic) => {
    setTopic(trendingTopic.topic)
    setResearchMode('specify_topic')
    setActiveTab('create')
  }

  // Generate content similar to feed post
  const handleGenerateSimilar = (post: FeedPost) => {
    setTopic(`Create content inspired by discussions on ${post.hashtags[0] || 'trending topics'}`)
    setResearchMode('specify_topic')
    setActiveTab('create')
  }

  // Save post to history
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
      // Build the input message
      let inputMessage = ''
      if (researchMode === 'specify_topic') {
        inputMessage = `Generate a LinkedIn post about ${topic} using a ${selectedStyle.replace('_', ' ')} style`
      } else if (researchMode === 'discover_trends') {
        inputMessage = `Discover trending topics in the ${industry} industry and create a LinkedIn post using a ${selectedStyle.replace('_', ' ')} style`
      } else if (researchMode === 'ai_powered') {
        inputMessage = `Use AI to recommend and create a LinkedIn post based on my profile and network using a ${selectedStyle.replace('_', ' ')} style`
      }

      const result = await callAIAgent(inputMessage, AGENT_IDS.researchContentManager)

      if (result.success && result.response?.status === 'success') {
        const responseData = result.response.result

        if (responseData) {
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
          if (responseData.citations && Array.isArray(responseData.citations)) {
            extractedCitations = responseData.citations
          }

          // Extract hashtags
          if (responseData.hashtags && Array.isArray(responseData.hashtags)) {
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
            hashtags,
            topic: topic || `${industry} trends`
          }
          saveToHistory(newPost)
        }
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

  // Post to LinkedIn
  const handleApproveAndPost = async () => {
    setShowConfirmModal(false)
    setIsPosting(true)
    setError('')

    try {
      const result = await callAIAgent(
        `Post this content to LinkedIn: ${editedContent}`,
        AGENT_IDS.linkedInPublisher
      )

      if (result.success && result.response?.status === 'success') {
        const publishData = result.response.result

        if (publishData) {
          // Find the draft post and update it
          const draftPost = postHistory.find(p => p.content === generatedContent && p.status === 'draft')
          if (draftPost) {
            updatePostInHistory(draftPost.id, {
              status: 'posted',
              postUrl: publishData.post_url,
              content: editedContent
            })
          }
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

  // Calculate analytics
  const totalPosts = postHistory.length
  const postedCount = postHistory.filter(p => p.status === 'posted').length
  const draftCount = postHistory.filter(p => p.status === 'draft').length
  const topicsUsed = new Set(postHistory.map(p => p.topic || 'Unknown')).size

  return (
    <div className="min-h-screen bg-[#F4F2EE]">
      {/* Header */}
      <header className="bg-white border-b border-[#00000014] sticky top-0 z-40">
        <div className="max-w-[1128px] mx-auto px-4 py-2">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <FaLinkedin className="text-[#0A66C2] text-[32px]" />
              <h1 className="text-xl font-semibold text-[#000000E6]">Content Studio</h1>
            </div>
            <nav className="flex gap-2">
              <button
                onClick={() => setActiveTab('dashboard')}
                className={`flex items-center gap-2 px-4 py-2 rounded-lg transition-all ${
                  activeTab === 'dashboard'
                    ? 'bg-[#0A66C2] text-white'
                    : 'text-[#00000099] hover:bg-[#00000014]'
                }`}
              >
                <FiHome className="text-xl" />
                <span className="text-sm font-medium hidden sm:inline">Dashboard</span>
              </button>
              <button
                onClick={() => setActiveTab('create')}
                className={`flex items-center gap-2 px-4 py-2 rounded-lg transition-all ${
                  activeTab === 'create'
                    ? 'bg-[#0A66C2] text-white'
                    : 'text-[#00000099] hover:bg-[#00000014]'
                }`}
              >
                <FiPlus className="text-xl" />
                <span className="text-sm font-medium hidden sm:inline">Create</span>
              </button>
              <button
                onClick={() => setActiveTab('network')}
                className={`flex items-center gap-2 px-4 py-2 rounded-lg transition-all ${
                  activeTab === 'network'
                    ? 'bg-[#0A66C2] text-white'
                    : 'text-[#00000099] hover:bg-[#00000014]'
                }`}
              >
                <FiUsers className="text-xl" />
                <span className="text-sm font-medium hidden sm:inline">Network</span>
              </button>
              <button
                onClick={() => setActiveTab('history')}
                className={`flex items-center gap-2 px-4 py-2 rounded-lg transition-all ${
                  activeTab === 'history'
                    ? 'bg-[#0A66C2] text-white'
                    : 'text-[#00000099] hover:bg-[#00000014]'
                }`}
              >
                <FiClock className="text-xl" />
                <span className="text-sm font-medium hidden sm:inline">History</span>
              </button>
            </nav>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-[1128px] mx-auto px-4 py-6">
        {/* Dashboard Tab */}
        {activeTab === 'dashboard' && (
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
            {/* Left Sidebar - Profile Insights */}
            <div className="lg:col-span-3 space-y-4">
              <Card className="bg-white border border-[#00000014] rounded-lg shadow-[0_0_0_1px_rgba(0,0,0,0.08),0_2px_4px_rgba(0,0,0,0.08)]">
                <CardHeader className="pb-3">
                  <CardTitle className="text-base font-semibold text-[#000000E6]">
                    Profile Insights
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  {loadingProfile || loadingDashboard ? (
                    <div className="flex items-center justify-center py-8">
                      <AiOutlineLoading3Quarters className="h-6 w-6 animate-spin text-[#0A66C2]" />
                    </div>
                  ) : userProfile ? (
                    <>
                      <div className="flex items-center gap-3">
                        <div className="w-12 h-12 bg-gradient-to-br from-[#0A66C2] to-[#1E3A5F] rounded-full flex items-center justify-center">
                          <span className="text-white font-semibold text-lg">
                            {userProfile.name.charAt(0)}
                          </span>
                        </div>
                        <div>
                          <p className="font-semibold text-sm text-[#000000E6]">{userProfile.name}</p>
                          <p className="text-xs text-[#00000099]">{userProfile.headline}</p>
                        </div>
                      </div>

                      <div className="space-y-2">
                        <div className="flex items-center gap-2 text-xs text-[#00000099]">
                          <span className="font-medium">Industry:</span>
                          <span>{userProfile.industry}</span>
                        </div>
                        <div className="flex items-center gap-2 text-xs text-[#00000099]">
                          <span className="font-medium">Location:</span>
                          <span>{userProfile.location}</span>
                        </div>
                      </div>

                      <div>
                        <p className="text-xs font-semibold text-[#000000E6] mb-2">Top Skills</p>
                        <div className="flex flex-wrap gap-1">
                          {userProfile.top_skills.slice(0, 5).map((skill, idx) => (
                            <span
                              key={idx}
                              className="px-2 py-1 bg-[#0A66C2]/10 text-[#0A66C2] text-xs rounded-full"
                            >
                              {skill}
                            </span>
                          ))}
                        </div>
                      </div>

                      <div>
                        <p className="text-xs font-semibold text-[#000000E6] mb-2">Expertise Areas</p>
                        <div className="space-y-1">
                          {userProfile.expertise_areas.map((area, idx) => (
                            <div key={idx} className="flex items-center gap-2">
                              <FiCheck className="h-3 w-3 text-[#057642]" />
                              <span className="text-xs text-[#00000099]">{area}</span>
                            </div>
                          ))}
                        </div>
                      </div>

                      <Button
                        onClick={handleRefreshProfile}
                        variant="outline"
                        size="sm"
                        className="w-full text-xs"
                        disabled={loadingProfile}
                      >
                        {loadingProfile ? (
                          <>
                            <AiOutlineLoading3Quarters className="mr-2 h-3 w-3 animate-spin" />
                            Refreshing...
                          </>
                        ) : (
                          <>
                            <FiRefreshCw className="mr-2 h-3 w-3" />
                            Refresh Profile
                          </>
                        )}
                      </Button>
                    </>
                  ) : (
                    <div className="text-center py-4">
                      <p className="text-xs text-[#00000099] mb-3">No profile data loaded</p>
                      <Button
                        onClick={handleRefreshProfile}
                        size="sm"
                        className="text-xs bg-[#0A66C2]"
                      >
                        Load Profile
                      </Button>
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>

            {/* Center Column - Intelligent Recommendations */}
            <div className="lg:col-span-6 space-y-4">
              <Card className="bg-white border border-[#00000014] rounded-lg shadow-[0_0_0_1px_rgba(0,0,0,0.08),0_2px_4px_rgba(0,0,0,0.08)]">
                <CardHeader className="pb-3">
                  <CardTitle className="text-base font-semibold text-[#000000E6] flex items-center gap-2">
                    <FaBolt className="h-5 w-5 text-[#FF6B00]" />
                    Recommended Topics
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  {loadingDashboard ? (
                    <div className="flex items-center justify-center py-12">
                      <AiOutlineLoading3Quarters className="h-8 w-8 animate-spin text-[#0A66C2]" />
                    </div>
                  ) : contentIntelligence?.recommended_topics ? (
                    contentIntelligence.recommended_topics.map((topic, idx) => (
                      <div
                        key={idx}
                        className="p-4 border border-[#00000014] rounded-lg hover:shadow-md transition-shadow cursor-pointer"
                        onClick={() => handleUseRecommendedTopic(topic)}
                      >
                        <div className="flex items-start justify-between mb-2">
                          <h3 className="font-semibold text-sm text-[#000000E6]">{topic.topic}</h3>
                          <span
                            className={`px-2 py-1 text-xs rounded-full ${
                              topic.trending_level === 'high'
                                ? 'bg-[#FF6B00]/10 text-[#FF6B00]'
                                : topic.trending_level === 'medium'
                                ? 'bg-[#0A66C2]/10 text-[#0A66C2]'
                                : 'bg-[#00000014] text-[#00000099]'
                            }`}
                          >
                            {topic.trending_level === 'high' ? 'Hot' : topic.trending_level === 'medium' ? 'Trending' : 'Emerging'}
                          </span>
                        </div>

                        <div className="mb-3">
                          <div className="flex items-center gap-2 mb-1">
                            <FiTarget className="h-3 w-3 text-[#00000099]" />
                            <span className="text-xs text-[#00000099]">Relevance Score</span>
                          </div>
                          <div className="w-full bg-[#00000014] rounded-full h-2">
                            <div
                              className="bg-[#057642] h-2 rounded-full"
                              style={{ width: `${topic.relevance_score * 100}%` }}
                            />
                          </div>
                          <span className="text-xs text-[#00000099] ml-auto">
                            {Math.round(topic.relevance_score * 100)}%
                          </span>
                        </div>

                        <p className="text-xs text-[#00000099] mb-2">
                          <span className="font-medium text-[#000000E6]">Why:</span> {topic.reason}
                        </p>

                        <p className="text-xs text-[#00000099] mb-3">
                          <span className="font-medium text-[#000000E6]">Angle:</span> {topic.suggested_angle}
                        </p>

                        <Button
                          size="sm"
                          className="w-full bg-[#0A66C2] hover:bg-[#004182] text-xs"
                        >
                          Generate Content
                          <FiChevronRight className="ml-2 h-3 w-3" />
                        </Button>
                      </div>
                    ))
                  ) : (
                    <div className="text-center py-12">
                      <FiTrendingUp className="h-12 w-12 text-[#00000014] mx-auto mb-3" />
                      <p className="text-sm text-[#00000099]">No recommendations available</p>
                      <Button
                        onClick={loadDashboardData}
                        size="sm"
                        className="mt-3 bg-[#0A66C2]"
                      >
                        Load Recommendations
                      </Button>
                    </div>
                  )}
                </CardContent>
              </Card>

              {/* Network Trends */}
              {contentIntelligence?.network_trends && (
                <Card className="bg-white border border-[#00000014] rounded-lg shadow-[0_0_0_1px_rgba(0,0,0,0.08),0_2px_4px_rgba(0,0,0,0.08)]">
                  <CardHeader className="pb-3">
                    <CardTitle className="text-base font-semibold text-[#000000E6]">
                      Network Trends
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="flex flex-wrap gap-2">
                      {contentIntelligence.network_trends.map((trend, idx) => (
                        <span
                          key={idx}
                          className="px-3 py-1 bg-[#0A66C2]/10 text-[#0A66C2] text-xs rounded-full font-medium"
                        >
                          {trend}
                        </span>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              )}

              {/* Content Gaps */}
              {contentIntelligence?.content_gaps && (
                <Card className="bg-white border border-[#00000014] rounded-lg shadow-[0_0_0_1px_rgba(0,0,0,0.08),0_2px_4px_rgba(0,0,0,0.08)]">
                  <CardHeader className="pb-3">
                    <CardTitle className="text-base font-semibold text-[#000000E6]">
                      Content Opportunities
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-2">
                      {contentIntelligence.content_gaps.map((gap, idx) => (
                        <div key={idx} className="flex items-center gap-2">
                          <div className="w-1.5 h-1.5 bg-[#FF6B00] rounded-full" />
                          <span className="text-sm text-[#000000E6]">{gap}</span>
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              )}
            </div>

            {/* Right Sidebar - Network Insights */}
            <div className="lg:col-span-3 space-y-4">
              <Card className="bg-white border border-[#00000014] rounded-lg shadow-[0_0_0_1px_rgba(0,0,0,0.08),0_2px_4px_rgba(0,0,0,0.08)]">
                <CardHeader className="pb-3">
                  <CardTitle className="text-base font-semibold text-[#000000E6]">
                    Influential Connections
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  {loadingDashboard ? (
                    <div className="flex items-center justify-center py-4">
                      <AiOutlineLoading3Quarters className="h-6 w-6 animate-spin text-[#0A66C2]" />
                    </div>
                  ) : networkInsights?.relevant_profiles ? (
                    networkInsights.relevant_profiles.slice(0, 4).map((profile, idx) => (
                      <div key={idx} className="pb-3 border-b border-[#00000014] last:border-0">
                        <div className="flex items-start gap-2 mb-2">
                          <div className="w-8 h-8 bg-gradient-to-br from-[#0A66C2] to-[#1E3A5F] rounded-full flex items-center justify-center flex-shrink-0">
                            <span className="text-white text-xs font-semibold">
                              {profile.name.charAt(0)}
                            </span>
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="font-semibold text-xs text-[#000000E6] truncate">
                              {profile.name}
                            </p>
                            <p className="text-xs text-[#00000099] line-clamp-2">
                              {profile.headline}
                            </p>
                          </div>
                        </div>

                        <div className="flex items-center gap-2 mb-2">
                          <span
                            className={`px-2 py-0.5 text-xs rounded-full ${
                              profile.influence_level === 'high'
                                ? 'bg-[#FF6B00]/10 text-[#FF6B00]'
                                : 'bg-[#0A66C2]/10 text-[#0A66C2]'
                            }`}
                          >
                            {profile.influence_level === 'high' ? (
                              <><FiStar className="inline h-2.5 w-2.5 mr-1" />High Influence</>
                            ) : (
                              'Medium Influence'
                            )}
                          </span>
                        </div>

                        <div className="flex flex-wrap gap-1">
                          {profile.common_interests.slice(0, 2).map((interest, i) => (
                            <span key={i} className="px-2 py-0.5 bg-[#00000008] text-[#00000099] text-xs rounded">
                              {interest}
                            </span>
                          ))}
                        </div>
                      </div>
                    ))
                  ) : (
                    <p className="text-xs text-[#00000099] text-center py-4">
                      No network insights available
                    </p>
                  )}
                </CardContent>
              </Card>

              {/* Trending Topics in Network */}
              {networkInsights?.trending_topics && (
                <Card className="bg-white border border-[#00000014] rounded-lg shadow-[0_0_0_1px_rgba(0,0,0,0.08),0_2px_4px_rgba(0,0,0,0.08)]">
                  <CardHeader className="pb-3">
                    <CardTitle className="text-base font-semibold text-[#000000E6] flex items-center gap-2">
                      <FiTrendingUp className="h-4 w-4" />
                      Trending in Network
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-2">
                    {networkInsights.trending_topics.slice(0, 3).map((topic, idx) => (
                      <div
                        key={idx}
                        className="p-2 bg-[#F4F2EE] rounded hover:bg-[#00000008] cursor-pointer transition-colors"
                        onClick={() => handleUseTrendingTopic(topic)}
                      >
                        <div className="flex items-start justify-between mb-1">
                          <p className="text-xs font-semibold text-[#000000E6] flex-1">
                            {topic.topic}
                          </p>
                          <span className="text-xs text-[#00000099] ml-2">
                            {topic.frequency} mentions
                          </span>
                        </div>
                        <div className="text-xs text-[#00000099]">
                          By {topic.mentioned_by.slice(0, 2).join(', ')}
                          {topic.mentioned_by.length > 2 && ` +${topic.mentioned_by.length - 2} more`}
                        </div>
                      </div>
                    ))}
                  </CardContent>
                </Card>
              )}
            </div>
          </div>
        )}

        {/* Create Tab */}
        {activeTab === 'create' && (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Left Column - Configuration */}
            <div className="space-y-4">
              <Card className="bg-white border border-[#00000014] rounded-lg shadow-[0_0_0_1px_rgba(0,0,0,0.08),0_2px_4px_rgba(0,0,0,0.08)]">
                <CardHeader>
                  <CardTitle className="text-lg font-semibold text-[#000000E6]">
                    Content Configuration
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-6">
                  {/* Research Mode Toggle */}
                  <div>
                    <label className="text-sm font-medium mb-3 block text-[#000000E6]">
                      Research Mode
                    </label>
                    <div className="flex gap-2 p-1 bg-[#F4F2EE] rounded-lg">
                      <button
                        onClick={() => setResearchMode('specify_topic')}
                        className={`flex-1 py-2 px-3 rounded text-sm font-medium transition-all ${
                          researchMode === 'specify_topic'
                            ? 'bg-white shadow-sm text-[#0A66C2]'
                            : 'text-[#00000099] hover:text-[#000000E6]'
                        }`}
                      >
                        Specify Topic
                      </button>
                      <button
                        onClick={() => setResearchMode('discover_trends')}
                        className={`flex-1 py-2 px-3 rounded text-sm font-medium transition-all ${
                          researchMode === 'discover_trends'
                            ? 'bg-white shadow-sm text-[#0A66C2]'
                            : 'text-[#00000099] hover:text-[#000000E6]'
                        }`}
                      >
                        Discover Trends
                      </button>
                      <button
                        onClick={() => setResearchMode('ai_powered')}
                        className={`flex-1 py-2 px-3 rounded text-sm font-medium transition-all ${
                          researchMode === 'ai_powered'
                            ? 'bg-white shadow-sm text-[#0A66C2]'
                            : 'text-[#00000099] hover:text-[#000000E6]'
                        }`}
                      >
                        AI Discovery
                      </button>
                    </div>
                  </div>

                  {/* Topic Input or Industry Dropdown */}
                  {researchMode === 'specify_topic' ? (
                    <div>
                      <label htmlFor="topic" className="text-sm font-medium mb-2 block text-[#000000E6]">
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
                      <p className="text-xs text-[#00000099] mt-1">{topic.length}/200 characters</p>
                    </div>
                  ) : researchMode === 'discover_trends' ? (
                    <div>
                      <label htmlFor="industry" className="text-sm font-medium mb-2 block text-[#000000E6]">
                        Industry
                      </label>
                      <select
                        id="industry"
                        value={industry}
                        onChange={(e) => setIndustry(e.target.value)}
                        className="w-full px-3 py-2 border border-[#00000014] rounded-lg shadow-sm focus:outline-none focus:ring-2 focus:ring-[#0A66C2] focus:border-transparent"
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
                  ) : (
                    <div className="p-4 bg-[#0A66C2]/5 border border-[#0A66C2]/20 rounded-lg">
                      <div className="flex items-start gap-3">
                        <FaBolt className="h-5 w-5 text-[#0A66C2] flex-shrink-0 mt-0.5" />
                        <div>
                          <p className="text-sm font-semibold text-[#000000E6] mb-1">
                            AI-Powered Discovery
                          </p>
                          <p className="text-xs text-[#00000099]">
                            Let AI analyze your profile and network to recommend the best topics for you
                          </p>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Style Selector */}
                  <div>
                    <label className="text-sm font-medium mb-3 block text-[#000000E6]">
                      Post Style
                    </label>
                    <div className="grid grid-cols-2 gap-2">
                      <button
                        onClick={() => setSelectedStyle('thought_leadership')}
                        className={`flex items-center gap-2 p-3 rounded-lg border transition-all ${
                          selectedStyle === 'thought_leadership'
                            ? 'border-[#0A66C2] bg-[#0A66C2]/5'
                            : 'border-[#00000014] hover:border-[#00000033]'
                        }`}
                      >
                        <FaLightbulb className={selectedStyle === 'thought_leadership' ? 'text-[#0A66C2]' : 'text-[#00000099]'} />
                        <span className="text-sm font-medium text-[#000000E6]">Thought Leadership</span>
                      </button>
                      <button
                        onClick={() => setSelectedStyle('data_driven')}
                        className={`flex items-center gap-2 p-3 rounded-lg border transition-all ${
                          selectedStyle === 'data_driven'
                            ? 'border-[#0A66C2] bg-[#0A66C2]/5'
                            : 'border-[#00000014] hover:border-[#00000033]'
                        }`}
                      >
                        <FaChartLine className={selectedStyle === 'data_driven' ? 'text-[#0A66C2]' : 'text-[#00000099]'} />
                        <span className="text-sm font-medium text-[#000000E6]">Data-Driven</span>
                      </button>
                      <button
                        onClick={() => setSelectedStyle('storytelling')}
                        className={`flex items-center gap-2 p-3 rounded-lg border transition-all ${
                          selectedStyle === 'storytelling'
                            ? 'border-[#0A66C2] bg-[#0A66C2]/5'
                            : 'border-[#00000014] hover:border-[#00000033]'
                        }`}
                      >
                        <FaBook className={selectedStyle === 'storytelling' ? 'text-[#0A66C2]' : 'text-[#00000099]'} />
                        <span className="text-sm font-medium text-[#000000E6]">Storytelling</span>
                      </button>
                      <button
                        onClick={() => setSelectedStyle('quick_tips')}
                        className={`flex items-center gap-2 p-3 rounded-lg border transition-all ${
                          selectedStyle === 'quick_tips'
                            ? 'border-[#0A66C2] bg-[#0A66C2]/5'
                            : 'border-[#00000014] hover:border-[#00000033]'
                        }`}
                      >
                        <FaBolt className={selectedStyle === 'quick_tips' ? 'text-[#0A66C2]' : 'text-[#00000099]'} />
                        <span className="text-sm font-medium text-[#000000E6]">Quick Tips</span>
                      </button>
                    </div>
                  </div>

                  {/* Generate Button */}
                  <Button
                    onClick={handleGenerateContent}
                    disabled={isGenerating || (researchMode === 'specify_topic' && !topic.trim())}
                    className="w-full bg-[#0A66C2] hover:bg-[#004182] text-white py-6 text-base font-medium"
                  >
                    {isGenerating ? (
                      <>
                        <AiOutlineLoading3Quarters className="mr-2 h-5 w-5 animate-spin" />
                        Generating Content...
                      </>
                    ) : (
                      'Generate Content'
                    )}
                  </Button>

                  {/* Error Message */}
                  {error && (
                    <div className="flex items-start gap-2 p-4 bg-red-50 border border-red-200 rounded-lg">
                      <FiAlertCircle className="h-5 w-5 text-red-600 mt-0.5 flex-shrink-0" />
                      <p className="text-sm text-red-800">{error}</p>
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>

            {/* Right Column - Preview/Output */}
            <div className="space-y-4">
              {generatedContent ? (
                <>
                  {/* Preview Card */}
                  <Card className="bg-white border border-[#00000014] rounded-lg shadow-[0_0_0_1px_rgba(0,0,0,0.08),0_2px_4px_rgba(0,0,0,0.08)]">
                    <CardHeader className="pb-3">
                      <CardTitle className="text-base font-semibold text-[#000000E6] flex items-center justify-between">
                        <span>Post Preview</span>
                        <span className="text-sm text-[#00000099] font-normal">
                          {currentWordCount} words
                        </span>
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      {/* LinkedIn-style mockup */}
                      <div className="border border-[#00000014] rounded-lg overflow-hidden">
                        <div className="bg-white p-4">
                          <div className="flex items-center gap-3 mb-3">
                            <div className="w-12 h-12 bg-gradient-to-br from-[#0A66C2] to-[#1E3A5F] rounded-full flex items-center justify-center">
                              <FaLinkedin className="text-white text-xl" />
                            </div>
                            <div>
                              <p className="font-semibold text-sm text-[#000000E6]">
                                {userProfile?.name || 'Your Name'}
                              </p>
                              <p className="text-xs text-[#00000099]">
                                {userProfile?.headline || 'Your Title'} • Now
                              </p>
                            </div>
                          </div>
                          <div className="prose prose-sm max-w-none">
                            <p className="whitespace-pre-wrap text-sm text-[#000000E6] leading-relaxed">
                              {editedContent}
                            </p>
                          </div>
                          {currentHashtags.length > 0 && (
                            <div className="flex flex-wrap gap-2 mt-4">
                              {currentHashtags.map((tag, idx) => (
                                <span key={idx} className="text-sm text-[#0A66C2] font-medium">
                                  #{tag}
                                </span>
                              ))}
                            </div>
                          )}
                        </div>
                        <div className="bg-[#F4F2EE] px-4 py-2 border-t border-[#00000014] flex items-center justify-between text-xs text-[#00000099]">
                          <span>0 reactions • 0 comments</span>
                        </div>
                      </div>
                    </CardContent>
                  </Card>

                  {/* Sources Panel */}
                  {citations.length > 0 && (
                    <Card className="bg-white border border-[#00000014] rounded-lg shadow-[0_0_0_1px_rgba(0,0,0,0.08),0_2px_4px_rgba(0,0,0,0.08)]">
                      <CardHeader
                        className="cursor-pointer"
                        onClick={() => setShowSourcesPanel(!showSourcesPanel)}
                      >
                        <CardTitle className="text-base font-semibold text-[#000000E6] flex items-center justify-between">
                          <span>Sources & Citations ({citations.length})</span>
                          <FiCheck className="h-5 w-5 text-[#057642]" />
                        </CardTitle>
                      </CardHeader>
                      {showSourcesPanel && (
                        <CardContent className="space-y-3">
                          {citations.map((citation, idx) => (
                            <div key={idx} className="p-3 bg-[#0A66C2]/5 rounded-lg border border-[#0A66C2]/20">
                              {citation.claim && (
                                <p className="text-sm font-medium text-[#000000E6] mb-1">
                                  {citation.claim}
                                </p>
                              )}
                              {citation.stat && (
                                <p className="text-sm font-medium text-[#000000E6] mb-1">
                                  {citation.stat}
                                </p>
                              )}
                              <p className="text-xs text-[#00000099]">{citation.source}</p>
                              {citation.url && (
                                <a
                                  href={citation.url}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="text-xs text-[#0A66C2] hover:underline flex items-center gap-1 mt-1"
                                >
                                  View source <FiExternalLink className="h-3 w-3" />
                                </a>
                              )}
                            </div>
                          ))}
                        </CardContent>
                      )}
                    </Card>
                  )}

                  {/* Edit Textarea */}
                  <Card className="bg-white border border-[#00000014] rounded-lg shadow-[0_0_0_1px_rgba(0,0,0,0.08),0_2px_4px_rgba(0,0,0,0.08)]">
                    <CardHeader>
                      <CardTitle className="text-base font-semibold text-[#000000E6]">
                        Edit Content
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <textarea
                        value={editedContent}
                        onChange={(e) => setEditedContent(e.target.value)}
                        maxLength={3000}
                        rows={8}
                        className="w-full px-3 py-2 border border-[#00000014] rounded-lg shadow-sm focus:outline-none focus:ring-2 focus:ring-[#0A66C2] focus:border-transparent resize-none text-sm"
                      />
                      <p className="text-xs text-[#00000099] mt-2">
                        {editedContent.length}/3000 characters
                      </p>
                    </CardContent>
                  </Card>

                  {/* Approve & Post Button */}
                  <Button
                    onClick={() => setShowConfirmModal(true)}
                    disabled={isPosting || !editedContent.trim()}
                    className="w-full bg-[#057642] hover:bg-[#046139] text-white py-6 text-base font-medium"
                  >
                    {isPosting ? (
                      <>
                        <AiOutlineLoading3Quarters className="mr-2 h-5 w-5 animate-spin" />
                        Posting to LinkedIn...
                      </>
                    ) : (
                      <>
                        <FiCheck className="mr-2 h-5 w-5" />
                        Approve & Post to LinkedIn
                      </>
                    )}
                  </Button>
                </>
              ) : (
                <Card className="bg-white border border-[#00000014] rounded-lg shadow-[0_0_0_1px_rgba(0,0,0,0.08),0_2px_4px_rgba(0,0,0,0.08)]">
                  <CardContent className="py-16 text-center">
                    <FiFileText className="h-16 w-16 text-[#00000014] mx-auto mb-4" />
                    <h3 className="text-base font-semibold text-[#000000E6] mb-2">
                      No Content Yet
                    </h3>
                    <p className="text-sm text-[#00000099]">
                      Configure your settings and click &quot;Generate Content&quot; to create your LinkedIn post
                    </p>
                  </CardContent>
                </Card>
              )}
            </div>
          </div>
        )}

        {/* Network Feed Tab */}
        {activeTab === 'network' && (
          <div className="max-w-[680px] mx-auto space-y-4">
            <Card className="bg-white border border-[#00000014] rounded-lg shadow-[0_0_0_1px_rgba(0,0,0,0.08),0_2px_4px_rgba(0,0,0,0.08)]">
              <CardHeader>
                <CardTitle className="text-base font-semibold text-[#000000E6]">
                  Network Activity Feed
                </CardTitle>
              </CardHeader>
              <CardContent className="p-0">
                <div className="flex gap-2 px-4 pb-3 border-b border-[#00000014]">
                  <button className="px-3 py-1.5 text-sm font-medium text-[#0A66C2] border-b-2 border-[#0A66C2]">
                    All
                  </button>
                  <button className="px-3 py-1.5 text-sm font-medium text-[#00000099] hover:text-[#000000E6]">
                    Trending
                  </button>
                  <button className="px-3 py-1.5 text-sm font-medium text-[#00000099] hover:text-[#000000E6]">
                    My Connections
                  </button>
                </div>
              </CardContent>
            </Card>

            {feedPosts.length > 0 ? (
              feedPosts.map((post) => (
                <Card
                  key={post.id}
                  className="bg-white border border-[#00000014] rounded-lg shadow-[0_0_0_1px_rgba(0,0,0,0.08),0_2px_4px_rgba(0,0,0,0.08)] hover:shadow-[0_0_0_1px_rgba(0,0,0,0.08),0_4px_8px_rgba(0,0,0,0.12)] transition-shadow"
                >
                  <CardContent className="p-4">
                    {/* Post Header */}
                    <div className="flex items-start gap-3 mb-3">
                      <div className="w-12 h-12 bg-gradient-to-br from-[#0A66C2] to-[#1E3A5F] rounded-full flex items-center justify-center flex-shrink-0">
                        <span className="text-white font-semibold">
                          {post.author.name.charAt(0)}
                        </span>
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="font-semibold text-sm text-[#000000E6]">
                          {post.author.name}
                        </p>
                        <p className="text-xs text-[#00000099]">
                          {post.author.headline}
                        </p>
                        <p className="text-xs text-[#00000099]">
                          {post.timestamp}
                        </p>
                      </div>
                    </div>

                    {/* Post Content */}
                    <div className="mb-3">
                      <p className="text-sm text-[#000000E6] whitespace-pre-wrap leading-relaxed">
                        {post.content}
                      </p>
                    </div>

                    {/* Hashtags */}
                    {post.hashtags.length > 0 && (
                      <div className="flex flex-wrap gap-2 mb-3">
                        {post.hashtags.map((tag, idx) => (
                          <span key={idx} className="text-sm text-[#0A66C2] font-medium">
                            #{tag}
                          </span>
                        ))}
                      </div>
                    )}

                    {/* Engagement Metrics */}
                    {post.engagementMetrics && (
                      <div className="pt-3 border-t border-[#00000014] mb-3">
                        <p className="text-xs text-[#00000099]">
                          {post.engagementMetrics.likes} reactions • {post.engagementMetrics.comments} comments • {post.engagementMetrics.shares} shares
                        </p>
                      </div>
                    )}

                    {/* Action Button */}
                    <Button
                      onClick={() => handleGenerateSimilar(post)}
                      variant="outline"
                      size="sm"
                      className="w-full text-[#0A66C2] border-[#0A66C2] hover:bg-[#0A66C2]/5"
                    >
                      <FaBolt className="mr-2 h-4 w-4" />
                      Generate Similar Content
                    </Button>
                  </CardContent>
                </Card>
              ))
            ) : (
              <Card className="bg-white border border-[#00000014] rounded-lg shadow-[0_0_0_1px_rgba(0,0,0,0.08),0_2px_4px_rgba(0,0,0,0.08)]">
                <CardContent className="py-16 text-center">
                  <FiUsers className="h-16 w-16 text-[#00000014] mx-auto mb-4" />
                  <h3 className="text-base font-semibold text-[#000000E6] mb-2">
                    No Network Activity
                  </h3>
                  <p className="text-sm text-[#00000099] mb-4">
                    Load your dashboard to discover network insights
                  </p>
                  <Button
                    onClick={() => setActiveTab('dashboard')}
                    className="bg-[#0A66C2]"
                  >
                    Go to Dashboard
                  </Button>
                </CardContent>
              </Card>
            )}
          </div>
        )}

        {/* History Tab */}
        {activeTab === 'history' && (
          <div className="space-y-4">
            {/* Analytics Overview */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <Card className="bg-white border border-[#00000014] rounded-lg shadow-[0_0_0_1px_rgba(0,0,0,0.08),0_2px_4px_rgba(0,0,0,0.08)]">
                <CardContent className="pt-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-xs text-[#00000099] mb-1">Total Posts</p>
                      <p className="text-2xl font-semibold text-[#000000E6]">{totalPosts}</p>
                    </div>
                    <FiFileText className="h-8 w-8 text-[#0A66C2]" />
                  </div>
                </CardContent>
              </Card>

              <Card className="bg-white border border-[#00000014] rounded-lg shadow-[0_0_0_1px_rgba(0,0,0,0.08),0_2px_4px_rgba(0,0,0,0.08)]">
                <CardContent className="pt-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-xs text-[#00000099] mb-1">Published</p>
                      <p className="text-2xl font-semibold text-[#057642]">{postedCount}</p>
                    </div>
                    <FiCheck className="h-8 w-8 text-[#057642]" />
                  </div>
                </CardContent>
              </Card>

              <Card className="bg-white border border-[#00000014] rounded-lg shadow-[0_0_0_1px_rgba(0,0,0,0.08),0_2px_4px_rgba(0,0,0,0.08)]">
                <CardContent className="pt-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-xs text-[#00000099] mb-1">Drafts</p>
                      <p className="text-2xl font-semibold text-[#0A66C2]">{draftCount}</p>
                    </div>
                    <FiClock className="h-8 w-8 text-[#0A66C2]" />
                  </div>
                </CardContent>
              </Card>

              <Card className="bg-white border border-[#00000014] rounded-lg shadow-[0_0_0_1px_rgba(0,0,0,0.08),0_2px_4px_rgba(0,0,0,0.08)]">
                <CardContent className="pt-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-xs text-[#00000099] mb-1">Topics Covered</p>
                      <p className="text-2xl font-semibold text-[#000000E6]">{topicsUsed}</p>
                    </div>
                    <FiTrendingUp className="h-8 w-8 text-[#FF6B00]" />
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Filter Tabs */}
            <Card className="bg-white border border-[#00000014] rounded-lg shadow-[0_0_0_1px_rgba(0,0,0,0.08),0_2px_4px_rgba(0,0,0,0.08)]">
              <CardContent className="pt-6">
                <div className="flex gap-2">
                  <Button
                    variant={historyFilter === 'all' ? 'default' : 'outline'}
                    onClick={() => setHistoryFilter('all')}
                    className={historyFilter === 'all' ? 'bg-[#0A66C2]' : ''}
                    size="sm"
                  >
                    All ({postHistory.length})
                  </Button>
                  <Button
                    variant={historyFilter === 'posted' ? 'default' : 'outline'}
                    onClick={() => setHistoryFilter('posted')}
                    className={historyFilter === 'posted' ? 'bg-[#0A66C2]' : ''}
                    size="sm"
                  >
                    Posted ({postedCount})
                  </Button>
                  <Button
                    variant={historyFilter === 'drafts' ? 'default' : 'outline'}
                    onClick={() => setHistoryFilter('drafts')}
                    className={historyFilter === 'drafts' ? 'bg-[#0A66C2]' : ''}
                    size="sm"
                  >
                    Drafts ({draftCount})
                  </Button>
                </div>
              </CardContent>
            </Card>

            {/* Post History List */}
            {filteredHistory.length === 0 ? (
              <Card className="bg-white border border-[#00000014] rounded-lg shadow-[0_0_0_1px_rgba(0,0,0,0.08),0_2px_4px_rgba(0,0,0,0.08)]">
                <CardContent className="py-16 text-center">
                  <FiClock className="h-16 w-16 text-[#00000014] mx-auto mb-4" />
                  <h3 className="text-base font-semibold text-[#000000E6] mb-2">
                    No Posts Yet
                  </h3>
                  <p className="text-sm text-[#00000099] mb-4">
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
                  <Card
                    key={post.id}
                    className="bg-white border border-[#00000014] rounded-lg shadow-[0_0_0_1px_rgba(0,0,0,0.08),0_2px_4px_rgba(0,0,0,0.08)]"
                  >
                    <CardContent className="pt-6">
                      <div className="flex items-start justify-between mb-4">
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 bg-gradient-to-br from-[#0A66C2] to-[#1E3A5F] rounded-full flex items-center justify-center">
                            <FaLinkedin className="text-white" />
                          </div>
                          <div>
                            <p className="font-semibold text-sm text-[#000000E6]">
                              {post.topic || 'LinkedIn Post'}
                            </p>
                            <p className="text-xs text-[#00000099]">
                              {new Date(post.date).toLocaleDateString()} • {post.style.replace('_', ' ')}
                            </p>
                          </div>
                        </div>
                        <span
                          className={`px-3 py-1 rounded-full text-xs font-medium ${
                            post.status === 'posted'
                              ? 'bg-[#057642]/10 text-[#057642]'
                              : post.status === 'draft'
                              ? 'bg-[#0A66C2]/10 text-[#0A66C2]'
                              : 'bg-red-100 text-red-700'
                          }`}
                        >
                          {post.status.charAt(0).toUpperCase() + post.status.slice(1)}
                        </span>
                      </div>

                      <p className="text-sm text-[#000000E6] whitespace-pre-wrap line-clamp-4 mb-3">
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

                      <div className="flex items-center justify-between pt-3 border-t border-[#00000014]">
                        <div className="flex items-center gap-4 text-xs text-[#00000099]">
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
                            View on LinkedIn <FiExternalLink className="h-3 w-3" />
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
              <CardTitle className="text-xl font-semibold text-[#000000E6]">
                Post to LinkedIn?
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <p className="text-sm text-[#000000E6]">
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
                  className="flex-1 bg-[#057642] hover:bg-[#046139]"
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
