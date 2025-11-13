//components/send-direct-certificate-modal.tsx
"use client"

import { useState, useEffect, useMemo } from "react"
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Checkbox } from "@/components/ui/checkbox"
import { Search, Send, Loader2, Award, Trophy, CalendarCheck, Users, Mic, UserCircle, CheckCircle2, XCircle } from "lucide-react"
import { supabase } from "@/lib/supabase-client"
import { Progress } from "@/components/ui/progress"
import { Alert, AlertDescription } from "@/components/ui/alert"

interface Attendee {
  id: number
  personal_name: string
  middle_name: string | null
  last_name: string
  email: string
  reference_id: string
  roles: string[] | null
  attendance: { date: number; status: string }[] | null
}

interface SendDirectCertificateModalProps {
  eventId: number
  eventName: string
  scheduleDates: { date: string }[]
  open: boolean
  onClose: () => void
}

type TemplateType = "participation" | "awardee" | "attendance"

const TEMPLATE_TYPES: { value: TemplateType; label: string; icon: any; description: string }[] = [
  { 
    value: "participation", 
    label: "Participation", 
    icon: Award,
    description: "For event participants"
  },
  { 
    value: "awardee", 
    label: "Awardee", 
    icon: Trophy,
    description: "For award recipients"
  },
  { 
    value: "attendance", 
    label: "Attendance", 
    icon: CalendarCheck,
    description: "For attendance record"
  }
]

interface SendResult {
  name: string
  email: string
  status: "success" | "error"
  error?: string
}

export default function SendDirectCertificateModal({
  eventId,
  eventName,
  scheduleDates,
  open,
  onClose,
}: SendDirectCertificateModalProps) {
  const [selectedTemplate, setSelectedTemplate] = useState<TemplateType>("participation")
  const [availableTemplates, setAvailableTemplates] = useState<Set<TemplateType>>(new Set())
  const [attendees, setAttendees] = useState<Attendee[]>([])
  const [selectedIds, setSelectedIds] = useState<Set<number>>(new Set())
  const [searchQuery, setSearchQuery] = useState("")
  const [loading, setLoading] = useState(false)
  const [sending, setSending] = useState(false)
  const [sendProgress, setSendProgress] = useState({ current: 0, total: 0 })
  const [sendResults, setSendResults] = useState<SendResult[]>([])
  const [showResults, setShowResults] = useState(false)

  // Fetch available templates and attendees when modal opens
  useEffect(() => {
    if (open) {
      fetchAvailableTemplates()
      fetchAttendees()
      setSelectedIds(new Set())
      setSearchQuery("")
      setShowResults(false)
      setSendResults([])
    }
  }, [open, eventId])

  const fetchAvailableTemplates = async () => {
    const templates = new Set<TemplateType>()
    
    for (const type of TEMPLATE_TYPES) {
      try {
        const response = await fetch(`/api/certificate-template?eventId=${eventId}&templateType=${type.value}`)
        if (response.ok) {
          const data = await response.json()
          if (data.template) {
            templates.add(type.value)
          }
        }
      } catch (error) {
        console.error(`Error loading ${type.value} template:`, error)
      }
    }
    
    setAvailableTemplates(templates)
    
    // Select first available template
    if (templates.size > 0) {
      setSelectedTemplate(Array.from(templates)[0])
    }
  }

  const fetchAttendees = async () => {
    setLoading(true)
    try {
      const { data, error } = await supabase
        .from("attendees")
        .select("id, personal_name, middle_name, last_name, email, reference_id, roles, attendance")
        .eq("event_id", eventId)
        .order("last_name", { ascending: true })

      if (error) throw error
      setAttendees(data || [])
    } catch (error) {
      console.error("Error fetching attendees:", error)
      alert("Failed to load attendees")
    } finally {
      setLoading(false)
    }
  }

  // Filter attendees based on search
  const filteredAttendees = useMemo(() => {
    if (!searchQuery.trim()) return attendees

    const query = searchQuery.toLowerCase()
    return attendees.filter((attendee) => {
      const fullName = `${attendee.personal_name} ${attendee.middle_name || ""} ${attendee.last_name}`.toLowerCase()
      const email = attendee.email?.toLowerCase() || ""
      return fullName.includes(query) || email.includes(query)
    })
  }, [attendees, searchQuery])

  // Check if all filtered attendees are selected
  const allSelected = filteredAttendees.length > 0 && 
    filteredAttendees.every((a) => selectedIds.has(a.id))

  // Toggle select all
  const toggleSelectAll = () => {
    if (allSelected) {
      const newSelected = new Set(selectedIds)
      filteredAttendees.forEach((a) => newSelected.delete(a.id))
      setSelectedIds(newSelected)
    } else {
      const newSelected = new Set(selectedIds)
      filteredAttendees.forEach((a) => newSelected.add(a.id))
      setSelectedIds(newSelected)
    }
  }

  // Toggle individual selection
  const toggleSelection = (id: number) => {
    const newSelected = new Set(selectedIds)
    if (newSelected.has(id)) {
      newSelected.delete(id)
    } else {
      newSelected.add(id)
    }
    setSelectedIds(newSelected)
  }

  // Get attendance summary for an attendee
  const getAttendanceSummary = (attendance: { date: number; status: string }[] | null) => {
    if (!attendance || !Array.isArray(attendance)) {
      return { present: 0, total: scheduleDates.length }
    }
    const presentCount = attendance.filter(a => a.status === "Present").length
    const totalDays = scheduleDates.length
    return { present: presentCount, total: totalDays }
  }

  // Get role icons
  const getRoleIcon = (role: string) => {
    switch (role) {
      case "Organizer":
        return <Users className="h-3 w-3" />
      case "Speaker":
        return <Mic className="h-3 w-3" />
      case "Attendee":
        return <UserCircle className="h-3 w-3" />
      default:
        return null
    }
  }

  // Send certificates
  const handleSend = async () => {
    if (selectedIds.size === 0) {
      alert("Please select at least one attendee")
      return
    }

    if (!availableTemplates.has(selectedTemplate)) {
      alert("Selected template is not available. Please select another template.")
      return
    }

    setSending(true)
    setShowResults(false)
    setSendProgress({ current: 0, total: selectedIds.size })
    setSendResults([])

    const selectedAttendees = attendees.filter((a) => selectedIds.has(a.id))
    const results: SendResult[] = []

    for (let i = 0; i < selectedAttendees.length; i++) {
      const attendee = selectedAttendees[i]
      
      try {
        const response = await fetch("/api/send-direct-certificate", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            referenceId: attendee.reference_id,
            templateType: selectedTemplate
          }),
        })

        const data = await response.json()

        if (response.ok && data.success) {
          results.push({
            name: `${attendee.personal_name} ${attendee.last_name}`,
            email: attendee.email,
            status: "success"
          })
        } else {
          results.push({
            name: `${attendee.personal_name} ${attendee.last_name}`,
            email: attendee.email,
            status: "error",
            error: data.error || "Failed to send certificate"
          })
        }
      } catch (error: any) {
        results.push({
          name: `${attendee.personal_name} ${attendee.last_name}`,
          email: attendee.email,
          status: "error",
          error: error.message || "Network error"
        })
      }

      setSendProgress({ current: i + 1, total: selectedIds.size })
      setSendResults([...results])
    }

    setSending(false)
    setShowResults(true)
  }

  const successCount = sendResults.filter(r => r.status === "success").length
  const errorCount = sendResults.filter(r => r.status === "error").length
  const selectedTemplateInfo = TEMPLATE_TYPES.find(t => t.value === selectedTemplate)!

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-6xl max-h-[90vh] flex flex-col">
        <DialogHeader>
          <DialogTitle>Send Direct Certificate</DialogTitle>
          <DialogDescription>
            Select a certificate template and attendees to send certificates via email
          </DialogDescription>
        </DialogHeader>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 flex-1 overflow-hidden">
          {/* Left Column - Template Selection */}
          <div className="space-y-4">
            <div>
              <h3 className="font-semibold mb-3">Select Certificate Template</h3>
              <div className="space-y-2">
                {TEMPLATE_TYPES.map((type) => {
                  const Icon = type.icon
                  const isAvailable = availableTemplates.has(type.value)
                  
                  return (
                    <button
                      key={type.value}
                      onClick={() => isAvailable && setSelectedTemplate(type.value)}
                      disabled={!isAvailable || sending}
                      className={`w-full p-4 rounded-lg border-2 text-left transition-all ${
                        selectedTemplate === type.value
                          ? "border-primary bg-primary/5"
                          : isAvailable
                          ? "border-border hover:border-primary/50"
                          : "border-border opacity-50 cursor-not-allowed"
                      }`}
                    >
                      <div className="flex items-start gap-3">
                        <Icon className={`h-5 w-5 mt-0.5 ${
                          selectedTemplate === type.value ? "text-primary" : "text-muted-foreground"
                        }`} />
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2">
                            <span className="font-medium">{type.label}</span>
                            {isAvailable ? (
                              <CheckCircle2 className="h-4 w-4 text-green-600" />
                            ) : (
                              <XCircle className="h-4 w-4 text-gray-400" />
                            )}
                          </div>
                          <p className="text-xs text-muted-foreground mt-1">{type.description}</p>
                          {!isAvailable && (
                            <p className="text-xs text-red-600 mt-1">Template not configured</p>
                          )}
                        </div>
                      </div>
                    </button>
                  )
                })}
              </div>
            </div>

            {availableTemplates.size === 0 && (
              <Alert>
                <AlertDescription>
                  No certificate templates configured. Please set up templates first.
                </AlertDescription>
              </Alert>
            )}
          </div>

          {/* Right Column - Attendees List */}
          <div className="lg:col-span-2 flex flex-col space-y-4 overflow-hidden">
            <div>
              <h3 className="font-semibold mb-3">Select Attendees ({selectedIds.size} selected)</h3>
              
              {/* Search */}
              <div className="relative mb-3">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search by name or email..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-9"
                  disabled={sending}
                />
              </div>

              {/* Select All */}
              {filteredAttendees.length > 0 && (
                <div className="flex items-center space-x-2 pb-2 border-b mb-2">
                  <Checkbox
                    id="select-all"
                    checked={allSelected}
                    onCheckedChange={toggleSelectAll}
                    disabled={sending}
                  />
                  <label
                    htmlFor="select-all"
                    className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70 cursor-pointer"
                  >
                    Select All
                  </label>
                </div>
              )}
            </div>

            {/* Attendees List */}
            <div className="flex-1 overflow-y-auto space-y-2">
              {loading ? (
                <div className="flex items-center justify-center py-8">
                  <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
                </div>
              ) : filteredAttendees.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  {searchQuery ? "No attendees found matching your search" : "No attendees found"}
                </div>
              ) : (
                filteredAttendees.map((attendee) => {
                  const attendanceSummary = getAttendanceSummary(attendee.attendance)
                  const fullName = `${attendee.personal_name} ${attendee.middle_name || ""} ${attendee.last_name}`.trim()
                  
                  return (
                    <div
                      key={attendee.id}
                      className={`flex items-start space-x-3 p-3 rounded-lg border cursor-pointer transition-colors ${
                        selectedIds.has(attendee.id)
                          ? "border-primary bg-primary/5"
                          : "hover:bg-secondary"
                      }`}
                      onClick={() => !sending && toggleSelection(attendee.id)}
                    >
                      <Checkbox
                        checked={selectedIds.has(attendee.id)}
                        onCheckedChange={() => toggleSelection(attendee.id)}
                        disabled={sending}
                      />
                      <div className="flex-1 min-w-0">
                        <p className="font-medium truncate">{fullName}</p>
                        <p className="text-sm text-muted-foreground truncate">{attendee.email}</p>
                        
                        {/* Roles */}
                        {attendee.roles && Array.isArray(attendee.roles) && attendee.roles.length > 0 && (
                          <div className="flex flex-wrap gap-1 mt-2">
                            {attendee.roles.map((role, idx) => (
                              <span
                                key={idx}
                                className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs bg-blue-100 text-blue-700"
                              >
                                {getRoleIcon(role)}
                                {role}
                              </span>
                            ))}
                          </div>
                        )}
                        
                        {/* Attendance Summary */}
                        <div className="flex items-center gap-2 mt-2">
                          <span className="text-xs text-muted-foreground">
                            Attendance:
                          </span>
                          <span className={`text-xs font-medium ${
                            attendanceSummary.present === attendanceSummary.total
                              ? "text-green-600"
                              : attendanceSummary.present > 0
                              ? "text-yellow-600"
                              : "text-gray-600"
                          }`}>
                            {attendanceSummary.present}/{attendanceSummary.total} days
                          </span>
                        </div>
                      </div>
                    </div>
                  )
                })
              )}
            </div>
          </div>
        </div>

        {/* Sending Progress */}
        {sending && (
          <div className="space-y-2 pt-4 border-t">
            <div className="flex justify-between text-sm">
              <span>Sending certificates...</span>
              <span className="font-medium">
                {sendProgress.current} / {sendProgress.total}
              </span>
            </div>
            <Progress 
              value={(sendProgress.current / sendProgress.total) * 100} 
              className="h-2"
            />
          </div>
        )}

        {/* Results */}
        {showResults && sendResults.length > 0 && (
          <div className="space-y-3 pt-4 border-t max-h-60 overflow-y-auto">
            <div className="flex items-center justify-between">
              <h4 className="font-semibold text-sm">Send Results</h4>
              <div className="flex gap-3 text-xs">
                <span className="text-green-600">✓ {successCount} sent</span>
                {errorCount > 0 && <span className="text-red-600">✗ {errorCount} failed</span>}
              </div>
            </div>
            
            <div className="space-y-2">
              {sendResults.map((result, idx) => (
                <div 
                  key={idx} 
                  className={`flex items-start gap-2 text-sm p-2 rounded ${
                    result.status === "success" 
                      ? "bg-card border-l-2 border-green-500" 
                      : "bg-red-50 border-l-2 border-red-500"
                  }`}
                >
                  <div className="flex-shrink-0 mt-0.5">
                    {result.status === "success" ? (
                      <CheckCircle2 className="h-4 w-4 text-green-600" />
                    ) : (
                      <XCircle className="h-4 w-4 text-red-600" />
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="font-medium truncate">{result.name}</div>
                    <div className="text-xs text-muted-foreground truncate">{result.email}</div>
                    {result.error && (
                      <div className="text-xs text-red-600 mt-1">{result.error}</div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        <DialogFooter className="pt-4 border-t">
          <Button variant="outline" onClick={onClose} disabled={sending}>
            {showResults ? "Close" : "Cancel"}
          </Button>
          {!showResults && (
            <Button 
              onClick={handleSend} 
              disabled={selectedIds.size === 0 || sending || availableTemplates.size === 0}
            >
              {sending ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Sending...
                </>
              ) : (
                <>
                  <Send className="mr-2 h-4 w-4" />
                  Send {selectedIds.size > 0 ? `(${selectedIds.size})` : ""}
                </>
              )}
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}