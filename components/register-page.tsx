"use client"

import { useEffect, useState } from "react"
import { useSearchParams } from "next/navigation"
import { supabase } from "@/lib/supabase-client"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Separator } from "@/components/ui/separator"
import { Loader2, CheckCircle2 } from "lucide-react"
import { useToast } from "@/hooks/use-toast"

interface EventData {
  id: number
  name: string
  price: number
  venue: string
  start_date: string
  end_date: string
}

export default function RegisterPage() {
  const [event, setEvent] = useState<EventData | null>(null)
  const [loading, setLoading] = useState(true)
  const [submitting, setSubmitting] = useState(false)
  const [submitted, setSubmitted] = useState(false)
  const { toast } = useToast()
  const [formData, setFormData] = useState({
    personal_name: "",
    middle_name: "",
    last_name: "",
    email: "",
    mobile_number: "",
    date_of_birth: "",
    address: "",
    company: "",
    position: "",
    company_address: "",
  })

  const searchParams = useSearchParams()
  const ref = searchParams.get("ref")

  useEffect(() => {
    const fetchEvent = async () => {
      if (!ref) {
        setLoading(false)
        return
      }
      
      const { data, error } = await supabase
        .from("events")
        .select("id, name, price, venue, start_date, end_date")
        .eq("magic_link", ref)
        .single()

      if (error) {
        console.error(error)
        toast({
          variant: "destructive",
          title: "Error",
          description: "Failed to load event details.",
        })
      }
      
      setEvent(data)
      setLoading(false)
    }

    fetchEvent()
  }, [ref, toast])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!event || submitting) return

    setSubmitting(true)

    try {
      // Generate unique reference ID
      const generateReferenceId = () => {
        const timestamp = Date.now().toString(36)
        const randomStr = Math.random().toString(36).substring(2, 15)
        const moreRandom = Math.random().toString(36).substring(2, 15)
        return `${timestamp}-${randomStr}-${moreRandom}`.toUpperCase()
      }

      // Don't include 'id' - let the database auto-generate it
      const insertData = {
        personal_name: formData.personal_name.trim(),
        middle_name: formData.middle_name.trim() || null,
        last_name: formData.last_name.trim(),
        email: formData.email.trim(),
        mobile_number: formData.mobile_number.trim(),
        date_of_birth: formData.date_of_birth,
        address: formData.address.trim(),
        company: formData.company.trim(),
        position: formData.position.trim(),
        company_address: formData.company_address.trim(),
        event_id: event.id,
        status: "Pending",
        reference_id: generateReferenceId(),
        hasevaluation: false,
        hassentevaluation: false,
      }

      console.log("📝 Attempting to insert:", insertData)
      console.log("🎫 Event ID:", event.id)

      const { data, error } = await supabase
        .from("attendees")
        .insert(insertData)
        .select()

      console.log("📊 Response data:", data)
      console.log("❌ Error object:", error)
      console.log("🔍 Error details:", {
        message: error?.message,
        details: error?.details,
        hint: error?.hint,
        code: error?.code,
      })

      if (error) {
        console.error("❌ Supabase error:", error)
        toast({
          variant: "destructive",
          title: "Registration Failed",
          description: error.message || error.details || "Unable to complete your registration. Please try again.",
        })
      } else {
        console.log("✅ Successfully inserted attendee:", data)
        if (data && data.length > 0) {
            const attendee = data[0]
            await fetch("/api/send-confirmation", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({
                email: attendee.email,
                name: `${attendee.personal_name} ${attendee.last_name}`,
                reference_id: attendee.reference_id,
                event_name: event.name,
                venue: event.venue,
                link: `${window.location.origin}/submission/${attendee.reference_id}`,
              }),
            })
          }
          
          setSubmitted(true)
          
      }
    } catch (err) {
      console.error("💥 Unexpected error:", err)
      console.error("💥 Error stack:", err instanceof Error ? err.stack : "No stack")
      toast({
        variant: "destructive",
        title: "Error",
        description: "An unexpected error occurred. Please try again.",
      })
    } finally {
      setSubmitting(false)
    }
  }

  if (loading) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-[#017C7C]/90">
        <Card className="w-full max-w-md">
          <CardContent className="flex items-center justify-center py-10">
            <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
          </CardContent>
        </Card>
      </main>
    )
  }

  if (!event) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-[#017C7C]/90 p-4">
        <Card className="w-full max-w-md">
          <CardHeader>
            <CardTitle className="text-destructive">Invalid Event Link</CardTitle>
            <CardDescription>
              The registration link you're trying to access is invalid or has expired.
            </CardDescription>
          </CardHeader>
        </Card>
      </main>
    )
  }

  // Success screen
  if (submitted) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-[#017C7C]/90 p-4">
        <Card className="w-full max-w-md">
          <CardContent className="pt-6">
            <div className="flex flex-col items-center space-y-6 text-center">
              <div className="rounded-full bg-green-500 p-6">
                <CheckCircle2 className="h-16 w-16 text-white" />
              </div>
              
              <div className="space-y-2">
                <h2 className="text-3xl font-bold text-foreground">Great!</h2>
                <p className="text-muted-foreground">
                  Your submission has been sent.
                </p>
                <p className="text-muted-foreground">
                  Please check your email for more details.
                </p>
                <p className="text-muted-foreground">
                  We'll see you soon!
                </p>
              </div>

              <Button
                onClick={() => setSubmitted(false)}
                variant="outline"
                className="mt-4"
              >
                Register Another Attendee
              </Button>
            </div>
          </CardContent>
        </Card>
      </main>
    )
  }

  return (
    <main className="flex min-h-screen flex-col items-center justify-center bg-[#017C7C]/90 p-4 sm:p-8">
      <Card className="w-full max-w-2xl">
        <CardHeader>
          <CardTitle className="text-3xl">{event.name}</CardTitle>
          <div className="flex items-center justify-between text-sm text-muted-foreground pt-2">
            <p>
              {new Date(event.start_date).toLocaleDateString()} –{" "}
              {new Date(event.end_date).toLocaleDateString()}
            </p>
            <p className="font-semibold">₱{Number(event.price).toLocaleString()}</p>
          </div>
          <CardDescription className="text-base">{event.venue}</CardDescription>
        </CardHeader>

        <Separator />

        <CardContent className="pt-6">
          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Personal Details */}
            <div className="space-y-4">
              <h2 className="text-lg font-semibold">Personal Details</h2>
              
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="personal_name">
                    First Name <span className="text-destructive">*</span>
                  </Label>
                  <Input
                    id="personal_name"
                    required
                    placeholder="Juan"
                    value={formData.personal_name}
                    onChange={(e) => setFormData({ ...formData, personal_name: e.target.value })}
                    disabled={submitting}
                  />
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="middle_name">Middle Name</Label>
                  <Input
                    id="middle_name"
                    placeholder="Dela"
                    value={formData.middle_name}
                    onChange={(e) => setFormData({ ...formData, middle_name: e.target.value })}
                    disabled={submitting}
                  />
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="last_name">
                    Last Name <span className="text-destructive">*</span>
                  </Label>
                  <Input
                    id="last_name"
                    required
                    placeholder="Cruz"
                    value={formData.last_name}
                    onChange={(e) => setFormData({ ...formData, last_name: e.target.value })}
                    disabled={submitting}
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="email">
                    Email <span className="text-destructive">*</span>
                  </Label>
                  <Input
                    id="email"
                    type="email"
                    required
                    placeholder="juan@example.com"
                    value={formData.email}
                    onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                    disabled={submitting}
                  />
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="mobile_number">
                    Mobile Number <span className="text-destructive">*</span>
                  </Label>
                  <Input
                    id="mobile_number"
                    type="tel"
                    required
                    placeholder="09123456789"
                    value={formData.mobile_number}
                    onChange={(e) => setFormData({ ...formData, mobile_number: e.target.value })}
                    disabled={submitting}
                  />
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="date_of_birth">
                    Date of Birth <span className="text-destructive">*</span>
                  </Label>
                  <Input
                    id="date_of_birth"
                    type="date"
                    required
                    value={formData.date_of_birth}
                    onChange={(e) => setFormData({ ...formData, date_of_birth: e.target.value })}
                    disabled={submitting}
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="address">
                  Address <span className="text-destructive">*</span>
                </Label>
                <Input
                  id="address"
                  required
                  placeholder="123 Main St, Quezon City"
                  value={formData.address}
                  onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                  disabled={submitting}
                />
              </div>
            </div>

            <Separator />

            {/* Employment Details */}
            <div className="space-y-4">
              <h2 className="text-lg font-semibold">Employment Details</h2>
              
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="company">
                    Company Name <span className="text-destructive">*</span>
                  </Label>
                  <Input
                    id="company"
                    required
                    placeholder="Acme Corporation"
                    value={formData.company}
                    onChange={(e) => setFormData({ ...formData, company: e.target.value })}
                    disabled={submitting}
                  />
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="position">
                    Position <span className="text-destructive">*</span>
                  </Label>
                  <Input
                    id="position"
                    required
                    placeholder="Manager"
                    value={formData.position}
                    onChange={(e) => setFormData({ ...formData, position: e.target.value })}
                    disabled={submitting}
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="company_address">
                  Company Address <span className="text-destructive">*</span>
                </Label>
                <Input
                  id="company_address"
                  required
                  placeholder="456 Business Ave, Makati City"
                  value={formData.company_address}
                  onChange={(e) => setFormData({ ...formData, company_address: e.target.value })}
                  disabled={submitting}
                />
              </div>
            </div>

            <Button 
              type="submit" 
              className="w-full bg-green-600 hover:bg-green-700" 
              size="lg"
              disabled={submitting}
            >
              {submitting ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Submitting...
                </>
              ) : (
                "Submit Registration"
              )}
            </Button>
          </form>
        </CardContent>
      </Card>
    </main>
  )
}