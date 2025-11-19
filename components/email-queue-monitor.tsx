// components/email-queue-monitor.tsx
"use client"

import { useState, useEffect } from "react"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Clock, Mail, CheckCircle2, XCircle, Calendar, AlertCircle, RefreshCw } from "lucide-react"
import { Progress } from "@/components/ui/progress"
import { Alert, AlertDescription } from "@/components/ui/alert"

interface QueueStats {
  pending: number
  pendingByDate: Record<string, number>
  todayLimit: { used: number; limit: number }
}

interface QueueMonitorProps {
  open: boolean
  onClose: () => void
}

export default function EmailQueueMonitor({ open, onClose }: QueueMonitorProps) {
  const [stats, setStats] = useState<QueueStats | null>(null)
  const [loading, setLoading] = useState(false)

  const fetchStats = async () => {
    setLoading(true)
    try {
      const response = await fetch("/api/email-queue/stats")
      const data = await response.json()
      setStats(data)
    } catch (error) {
      console.error("Failed to fetch queue stats:", error)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    if (open) {
      fetchStats()
    }
  }, [open])

  if (!stats && !loading) return null

  const todayProgress = stats ? (stats.todayLimit.used / stats.todayLimit.limit) * 100 : 0
  const sortedDates = stats ? Object.keys(stats.pendingByDate).sort() : []

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <div className="flex items-center justify-between">
            <DialogTitle className="flex items-center gap-2">
              <Mail className="h-5 w-5" />
              Email Queue Monitor
            </DialogTitle>
            <Button
              variant="ghost"
              size="icon"
              onClick={fetchStats}
              disabled={loading}
            >
              <RefreshCw className={`h-4 w-4 ${loading ? "animate-spin" : ""}`} />
            </Button>
          </div>
        </DialogHeader>

        {loading && !stats ? (
          <div className="flex items-center justify-center py-8">
            <RefreshCw className="h-6 w-6 animate-spin text-muted-foreground" />
          </div>
        ) : stats ? (
          <div className="space-y-6">
            {/* Today's Limit */}
            <Card>
              <CardHeader>
                <CardTitle className="text-base flex items-center gap-2">
                  <Clock className="h-4 w-4" />
                  Today's Email Usage
                </CardTitle>
                <CardDescription>
                  Daily limit: 100 emails (40 evaluations + 80 certificates max)
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  <div>
                    <div className="flex justify-between text-sm mb-2">
                      <span className="font-medium">
                        {stats.todayLimit.used} / {stats.todayLimit.limit} emails sent
                      </span>
                      <span className="text-muted-foreground">
                        {stats.todayLimit.limit - stats.todayLimit.used} remaining
                      </span>
                    </div>
                    <Progress value={todayProgress} className="h-2" />
                  </div>

                  {todayProgress >= 80 && (
                    <Alert>
                      <AlertCircle className="h-4 w-4" />
                      <AlertDescription>
                        {todayProgress >= 100
                          ? "⚠️ Daily limit reached. New emails will be queued for tomorrow."
                          : "⚠️ Approaching daily limit. New emails may be queued."}
                      </AlertDescription>
                    </Alert>
                  )}
                </div>
              </CardContent>
            </Card>

            {/* Pending Queue */}
            <Card>
              <CardHeader>
                <CardTitle className="text-base flex items-center gap-2">
                  <Calendar className="h-4 w-4" />
                  Queued Emails
                </CardTitle>
                <CardDescription>
                  Emails scheduled for future sending
                </CardDescription>
              </CardHeader>
              <CardContent>
                {stats.pending === 0 ? (
                  <div className="text-center py-6 text-muted-foreground">
                    <CheckCircle2 className="h-8 w-8 mx-auto mb-2 text-green-600" />
                    <p>No emails in queue</p>
                  </div>
                ) : (
                  <div className="space-y-3">
                    <div className="flex items-center justify-between p-3 bg-blue-50 dark:bg-blue-950/20 rounded-lg border border-blue-200 dark:border-blue-800">
                      <div className="flex items-center gap-2">
                        <Mail className="h-5 w-5 text-blue-600" />
                        <span className="font-semibold text-blue-900 dark:text-blue-100">
                          Total Queued
                        </span>
                      </div>
                      <Badge variant="outline" className="bg-blue-100 text-blue-700 border-blue-300">
                        {stats.pending} emails
                      </Badge>
                    </div>

                    <div className="space-y-2">
                      <p className="text-sm font-medium text-muted-foreground">
                        Scheduled by Date:
                      </p>
                      {sortedDates.map(date => {
                        const count = stats.pendingByDate[date]
                        const dateObj = new Date(date)
                        const isToday = date === new Date().toISOString().split("T")[0]
                        const isTomorrow = date === new Date(Date.now() + 86400000).toISOString().split("T")[0]

                        return (
                          <div
                            key={date}
                            className="flex items-center justify-between p-2 rounded-lg border bg-card"
                          >
                            <div className="flex items-center gap-2">
                              <Calendar className="h-4 w-4 text-muted-foreground" />
                              <span className="text-sm">
                                {dateObj.toLocaleDateString("en-US", {
                                  month: "short",
                                  day: "numeric",
                                  year: "numeric",
                                })}
                                {isToday && (
                                  <Badge variant="outline" className="ml-2 text-xs">
                                    Today
                                  </Badge>
                                )}
                                {isTomorrow && (
                                  <Badge variant="outline" className="ml-2 text-xs">
                                    Tomorrow
                                  </Badge>
                                )}
                              </span>
                            </div>
                            <Badge variant="secondary">{count} emails</Badge>
                          </div>
                        )
                      })}
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Info */}
            <Alert>
              <AlertCircle className="h-4 w-4" />
              <AlertDescription className="text-sm">
                <strong>How it works:</strong> When sending emails exceeds daily limits,
                remaining emails are automatically queued and will be sent the next day.
                The system processes queued emails daily at midnight.
              </AlertDescription>
            </Alert>
          </div>
        ) : null}

        <div className="flex justify-end pt-4 border-t">
          <Button onClick={onClose}>Close</Button>
        </div>
      </DialogContent>
    </Dialog>
  )
}