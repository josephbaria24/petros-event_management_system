// components/evaluation-results-modal.tsx
"use client"

import { useEffect, useState } from "react"
import { X, Loader2, TrendingUp, Users, MessageSquare } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { supabase } from "@/lib/supabase-client"
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, PieChart, Pie, Cell, RadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis, Radar } from "recharts"

interface EvaluationResultsModalProps {
  eventId: number
  eventName: string
  open: boolean
  onClose: () => void
}

interface EvaluationData {
  id: number
  answers: {
    rate: string
    "like-most": string
    "like-least": string
    suggest: string
    comments: string
    interested: string
    [key: string]: string
  }
  refId: string
  created_at: string
}

const ratingQuestions = [
  "The session delivered the information I expected to receive.",
  "The subject matter was presented effectively.",
  "The pace of the event was satisfactory.",
  "The duration of the event was sufficient for the material covered.",
  "The resource speakers were knowledgeable.",
  "As a result of this event, I gained new knowledge applicable to my professional development.",
  "I plan to apply what I learned in this event.",
  "Event like this is effective way for me and my colleagues to obtain information and training.",
  "The presenters responded to questions.",
  "I would recommend others to join future events by Petrosphere and its partner(s)."
]

const COLORS = ['#ef4444', '#f97316', '#eab308', '#22c55e', '#10b981']
const RATING_LABELS = ['Strongly Disagree', 'Disagree', 'Neutral', 'Agree', 'Strongly Agree']

export default function EvaluationResultsModal({ eventId, eventName, open, onClose }: EvaluationResultsModalProps) {
  const [loading, setLoading] = useState(true)
  const [evaluations, setEvaluations] = useState<EvaluationData[]>([])
  const [stats, setStats] = useState({
    totalResponses: 0,
    averageRating: 0,
    interestedInFuture: 0
  })

  useEffect(() => {
    if (open) {
      fetchEvaluations()
    }
  }, [open, eventId])

  const fetchEvaluations = async () => {
    setLoading(true)
    try {
      // Get all attendees for this event
      const { data: attendees, error: attendeesError } = await supabase
        .from("attendees")
        .select("reference_id")
        .eq("event_id", eventId)

      if (attendeesError) throw attendeesError

      const referenceIds = attendees.map(a => a.reference_id)

      // Get evaluations for these reference IDs
      const { data: evalData, error: evalError } = await supabase
        .from("evaluations")
        .select("*")
        .in("refId", referenceIds)

      if (evalError) throw evalError

      setEvaluations(evalData || [])

      // Calculate stats
      if (evalData && evalData.length > 0) {
        const totalRating = evalData.reduce((sum, e) => sum + parseInt(e.answers.rate || "0"), 0)
        const avgRating = totalRating / evalData.length
        const interested = evalData.filter(e => e.answers.interested === "yes").length

        setStats({
          totalResponses: evalData.length,
          averageRating: avgRating,
          interestedInFuture: interested
        })
      }
    } catch (error) {
      console.error("Error fetching evaluations:", error)
    } finally {
      setLoading(false)
    }
  }

  const getOverallRatingDistribution = () => {
    const distribution = [0, 0, 0, 0, 0]
    evaluations.forEach(e => {
      const rating = parseInt(e.answers.rate || "0")
      if (rating >= 1 && rating <= 5) {
        distribution[rating - 1]++
      }
    })
    return distribution.map((count, index) => ({
      rating: (index + 1).toString(),
      count,
      percentage: evaluations.length > 0 ? ((count / evaluations.length) * 100).toFixed(1) : "0"
    }))
  }

  const getQuestionStats = (questionIndex: number) => {
    const distribution = [0, 0, 0, 0, 0]
    evaluations.forEach(e => {
      const answer = e.answers[`satifactory-${questionIndex + 1}`]
      const rating = parseInt(answer || "0")
      if (rating >= 1 && rating <= 5) {
        distribution[rating - 1]++
      }
    })
    return distribution.map((count, index) => ({
      name: RATING_LABELS[index],
      value: count,
      percentage: evaluations.length > 0 ? ((count / evaluations.length) * 100).toFixed(1) : "0"
    }))
  }

  const getAverageScores = () => {
    return ratingQuestions.map((question, index) => {
      let total = 0
      let count = 0
      evaluations.forEach(e => {
        const answer = e.answers[`satifactory-${index + 1}`]
        const rating = parseInt(answer || "0")
        if (rating >= 1 && rating <= 5) {
          total += rating
          count++
        }
      })
      return {
        question: question.length > 50 ? question.substring(0, 47) + "..." : question,
        fullQuestion: question,
        score: count > 0 ? (total / count).toFixed(2) : "0"
      }
    })
  }

  const getOpenEndedResponses = (field: string) => {
    return evaluations.map(e => e.answers[field]).filter(Boolean)
  }

  const overallDistribution = getOverallRatingDistribution()
  const averageScores = getAverageScores()

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-7xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <TrendingUp className="h-5 w-5" />
            Evaluation Results - {eventName}
          </DialogTitle>
          <DialogDescription>
            Analysis of participant feedback and satisfaction ratings
          </DialogDescription>
        </DialogHeader>

        {loading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
          </div>
        ) : evaluations.length === 0 ? (
          <div className="text-center py-12">
            <MessageSquare className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
            <p className="text-lg font-medium text-muted-foreground">No evaluations submitted yet</p>
            <p className="text-sm text-muted-foreground mt-2">Participants haven't completed the evaluation form</p>
          </div>
        ) : (
          <div className="space-y-6">
            {/* Summary Stats */}
            <div className="grid grid-cols-3 gap-4">
              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-sm font-medium text-muted-foreground">Total Responses</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="flex items-center gap-2">
                    <Users className="h-5 w-5 text-blue-500" />
                    <p className="text-3xl font-bold">{stats.totalResponses}</p>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-sm font-medium text-muted-foreground">Average Rating</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="flex items-center gap-2">
                    <TrendingUp className="h-5 w-5 text-green-500" />
                    <p className="text-3xl font-bold">{stats.averageRating.toFixed(2)}/5</p>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-sm font-medium text-muted-foreground">Interested in Future Events</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="flex items-center gap-2">
                    <MessageSquare className="h-5 w-5 text-purple-500" />
                    <p className="text-3xl font-bold">{stats.interestedInFuture}</p>
                    <span className="text-sm text-muted-foreground">
                      ({((stats.interestedInFuture / stats.totalResponses) * 100).toFixed(0)}%)
                    </span>
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Overall Rating Distribution */}
            <Card>
              <CardHeader>
                <CardTitle>Overall Event Rating Distribution</CardTitle>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={300}>
                  <BarChart data={overallDistribution}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="rating" label={{ value: 'Rating', position: 'insideBottom', offset: -5 }} />
                    <YAxis label={{ value: 'Number of Responses', angle: -90, position: 'insideLeft' }} />
                    <Tooltip 
                      content={({ active, payload }) => {
                        if (active && payload && payload.length) {
                          return (
                            <div className="bg-white dark:bg-gray-800 p-3 border rounded shadow-lg">
                              <p className="font-semibold">Rating: {payload[0].payload.rating}</p>
                              <p>Count: {payload[0].value}</p>
                              <p>Percentage: {payload[0].payload.percentage}%</p>
                            </div>
                          )
                        }
                        return null
                      }}
                    />
                    <Bar dataKey="count" fill="#3b82f6" />
                  </BarChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>

            {/* Average Scores Comparison */}
            <Card>
              <CardHeader>
                <CardTitle>Average Satisfaction Scores by Question</CardTitle>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={400}>
                  <BarChart data={averageScores} layout="vertical">
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis type="number" domain={[0, 5]} />
                    <YAxis dataKey="question" type="category" width={200} style={{ fontSize: '11px' }} />
                    <Tooltip 
                      content={({ active, payload }) => {
                        if (active && payload && payload.length) {
                          return (
                            <div className="bg-white dark:bg-gray-800 p-3 border rounded shadow-lg max-w-md">
                              <p className="font-semibold text-sm mb-2">{payload[0].payload.fullQuestion}</p>
                              <p className="text-lg font-bold text-blue-600">Score: {payload[0].value}/5</p>
                            </div>
                          )
                        }
                        return null
                      }}
                    />
                    <Bar dataKey="score" fill="#10b981" />
                  </BarChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>

            {/* Individual Question Breakdowns */}
            <div className="space-y-4">
              <h3 className="text-lg font-semibold">Detailed Question Analysis</h3>
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                {ratingQuestions.map((question, index) => {
                  const questionData = getQuestionStats(index)
                  return (
                    <Card key={index}>
                      <CardHeader>
                        <CardTitle className="text-sm">{question}</CardTitle>
                      </CardHeader>
                      <CardContent>
                        <ResponsiveContainer width="100%" height={250}>
                          <PieChart>
                            <Pie
                              data={questionData}
                              cx="50%"
                              cy="50%"
                              labelLine={false}
                              label={({ name, percentage }) => `${name}: ${percentage}%`}
                              outerRadius={80}
                              fill="#8884d8"
                              dataKey="value"
                            >
                              {questionData.map((entry, idx) => (
                                <Cell key={`cell-${idx}`} fill={COLORS[idx % COLORS.length]} />
                              ))}
                            </Pie>
                            <Tooltip />
                          </PieChart>
                        </ResponsiveContainer>
                      </CardContent>
                    </Card>
                  )
                })}
              </div>
            </div>

            {/* Open-ended Responses */}
            <div className="space-y-4">
              <h3 className="text-lg font-semibold">Open-ended Feedback</h3>
              
              <Card>
                <CardHeader>
                  <CardTitle className="text-base">What participants liked MOST</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3 max-h-60 overflow-y-auto">
                    {getOpenEndedResponses("like-most").map((response, idx) => (
                      <div key={idx} className="p-3 bg-green-50 dark:bg-green-950/20 rounded-lg border border-green-200 dark:border-green-800">
                        <p className="text-sm text-gray-700 dark:text-gray-300">{response}</p>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle className="text-base">What participants liked LEAST</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3 max-h-60 overflow-y-auto">
                    {getOpenEndedResponses("like-least").map((response, idx) => (
                      <div key={idx} className="p-3 bg-red-50 dark:bg-red-950/20 rounded-lg border border-red-200 dark:border-red-800">
                        <p className="text-sm text-gray-700 dark:text-gray-300">{response}</p>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle className="text-base">Future Topic Suggestions</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3 max-h-60 overflow-y-auto">
                    {getOpenEndedResponses("suggest").map((response, idx) => (
                      <div key={idx} className="p-3 bg-blue-50 dark:bg-blue-950/20 rounded-lg border border-blue-200 dark:border-blue-800">
                        <p className="text-sm text-gray-700 dark:text-gray-300">{response}</p>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle className="text-base">Additional Comments</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3 max-h-60 overflow-y-auto">
                    {getOpenEndedResponses("comments").map((response, idx) => (
                      <div key={idx} className="p-3 bg-purple-50 dark:bg-purple-950/20 rounded-lg border border-purple-200 dark:border-purple-800">
                        <p className="text-sm text-gray-700 dark:text-gray-300">{response}</p>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            </div>
          </div>
        )}

        <div className="flex justify-end">
          <Button variant="outline" onClick={onClose}>
            Close
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  )
}