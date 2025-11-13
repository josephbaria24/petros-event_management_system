"use client"

import { useEffect, useState } from "react"
import { useParams } from "next/navigation"
import { supabase } from "@/lib/supabase-client"
import { Button } from "@/components/ui/button"
import { Textarea } from "@/components/ui/textarea"
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group"
import { Label } from "@/components/ui/label"
import { Loader2 } from "lucide-react"

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

const ratingLabels = ["Strongly Disagree", "Disagree", "Neutral", "Agree", "Strongly Agree"]

export default function EvaluationPage() {
  const params = useParams()
  const referenceId = decodeURIComponent(params.reference_id as string)

  const [loading, setLoading] = useState(true)
  const [submitting, setSubmitting] = useState(false)
  const [sendingCertificate, setSendingCertificate] = useState(false)
  const [attendee, setAttendee] = useState<any>(null)
  const [event, setEvent] = useState<any>(null)
  const [error, setError] = useState("")
  const [submitted, setSubmitted] = useState(false)

  // Form state
  const [overallRating, setOverallRating] = useState("")
  const [ratings, setRatings] = useState<Record<number, string>>({})
  const [likeMost, setLikeMost] = useState("")
  const [likeLeast, setLikeLeast] = useState("")
  const [futureTopic, setFutureTopic] = useState("")
  const [additionalComments, setAdditionalComments] = useState("")
  const [mailingList, setMailingList] = useState("")

  useEffect(() => {
    const fetchData = async () => {
      try {
        const { data: attendeeData, error: attendeeError } = await supabase
          .from("attendees")
          .select("*, events(name, start_date, end_date, venue)")
          .eq("reference_id", referenceId)
          .maybeSingle()

        if (attendeeError) {
          setError(`Database error: ${attendeeError.message}`)
          setLoading(false)
          return
        }

        if (!attendeeData) {
          setError("Attendee not found. Please check your evaluation link.")
          setLoading(false)
          return
        }

        if (attendeeData.hasevaluation) {
          setError("You have already submitted an evaluation for this event. Thank you!")
          setLoading(false)
          return
        }

        setAttendee(attendeeData)
        setEvent(attendeeData.events)
        setLoading(false)
      } catch (err: any) {
        console.error("Error fetching data:", err)
        setError("Failed to load evaluation form. Please try again later.")
        setLoading(false)
      }
    }

    if (referenceId) {
      fetchData()
    }
  }, [referenceId])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    // Validation - Overall Rating
    if (!overallRating) {
      alert("Please rate the overall event")
      return
    }

    // Validation - Rating Questions
    for (let i = 0; i < ratingQuestions.length; i++) {
      if (!ratings[i]) {
        alert(`Please answer question: "${ratingQuestions[i]}"`)
        return
      }
    }

    // Validation - Open-ended questions (all required)
    if (!likeMost.trim()) {
      alert("Please answer: What did you like MOST about the event?")
      return
    }

    if (!likeLeast.trim()) {
      alert("Please answer: What did you like LEAST about the event?")
      return
    }

    if (!futureTopic.trim()) {
      alert("Please suggest a future topic for event you would like to attend.")
      return
    }

    if (!additionalComments.trim()) {
      alert("Please provide additional comments about the webinar.")
      return
    }

    // Validation - Mailing List
    if (!mailingList) {
      alert("Please select if you want to be included in the mailing list")
      return
    }

    setSubmitting(true)

    try {
      // Prepare answers object
      const answers: any = {
        rate: overallRating,
        "like-most": likeMost,
        "like-least": likeLeast,
        suggest: futureTopic,
        comments: additionalComments,
        interested: mailingList === "yes" ? "yes" : "no"
      }

      ratingQuestions.forEach((_, index) => {
        answers[`satifactory-${index + 1}`] = ratings[index] || "0"
      })

      // Insert evaluation
      const { error: evalError } = await supabase
        .from("evaluations")
        .insert({
          refId: referenceId,
          answers
        })

      if (evalError) throw evalError

      // Update attendee to mark evaluation as complete
      const { error: updateError } = await supabase
        .from("attendees")
        .update({ hasevaluation: true })
        .eq("reference_id", referenceId)

      if (updateError) throw updateError

      // Success - now send certificate
      setSubmitted(true)
      setSendingCertificate(true)

      // Send certificate via API
      try {
        const response = await fetch("/api/send-certificate", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ referenceId })
        })

        if (!response.ok) {
          console.error("Failed to send certificate")
        }
      } catch (certError) {
        console.error("Error sending certificate:", certError)
      } finally {
        setSendingCertificate(false)
      }

    } catch (err: any) {
      console.error("Error submitting evaluation:", err)
      alert("❌ Failed to submit evaluation. Please try again.")
      setSubmitting(false)
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-blue-50 to-blue-100 dark:from-gray-900 dark:to-gray-800 flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-blue-600 dark:text-blue-400" />
      </div>
    )
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-blue-50 to-blue-100 dark:from-gray-900 dark:to-gray-800 flex items-center justify-center p-4">
        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg p-8 max-w-md w-full text-center border dark:border-gray-700">
          <h2 className="text-2xl font-bold text-red-600 dark:text-red-400 mb-4">Error</h2>
          <p className="text-gray-700 dark:text-gray-300">{error}</p>
        </div>
      </div>
    )
  }

  if (submitted) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-blue-50 to-blue-100 dark:from-gray-900 dark:to-gray-800 flex items-center justify-center p-4">
        <div className="max-w-md w-full bg-white dark:bg-gray-800 rounded-2xl shadow-xl p-12 border dark:border-gray-700">
          <div className="flex flex-col items-center text-center space-y-6">
            {/* Certificate icon */}
            <div className="relative">
              {sendingCertificate ? (
                <Loader2 className="h-20 w-20 animate-spin text-blue-600 dark:text-blue-400" />
              ) : (
                <svg className="w-20 h-20" viewBox="0 0 100 100" fill="none" xmlns="http://www.w3.org/2000/svg">
                  <rect x="15" y="20" width="60" height="45" rx="3" fill="#60A5FA" stroke="#3B82F6" strokeWidth="2"/>
                  <line x1="22" y1="32" x2="68" y2="32" stroke="white" strokeWidth="2" strokeLinecap="round"/>
                  <line x1="22" y1="40" x2="58" y2="40" stroke="white" strokeWidth="1.5" strokeLinecap="round"/>
                  <line x1="22" y1="48" x2="62" y2="48" stroke="white" strokeWidth="1.5" strokeLinecap="round"/>
                  <line x1="22" y1="56" x2="55" y2="56" stroke="white" strokeWidth="1.5" strokeLinecap="round"/>
                  <circle cx="70" cy="70" r="14" fill="#FCD34D" stroke="#F59E0B" strokeWidth="2"/>
                  <circle cx="70" cy="70" r="10" fill="#FBBF24"/>
                  <text x="70" y="75" fontSize="14" fontWeight="bold" fill="#92400E" textAnchor="middle">1</text>
                </svg>
              )}
            </div>

            {/* Success message */}
            <div className="space-y-4">
              <h2 className="text-2xl font-bold text-green-600 dark:text-green-400">
                Congratulations!
              </h2>
              
              <p className="text-gray-700 dark:text-gray-300 leading-relaxed">
                You have successfully submitted your evaluation!
              </p>
              
              {sendingCertificate ? (
                <p className="text-gray-600 dark:text-gray-400 leading-relaxed">
                  Sending your certificate to your email...
                </p>
              ) : (
                <p className="text-gray-700 dark:text-gray-300 leading-relaxed">
                  You may check your email to access{" "}
                  <span className="font-semibold text-blue-600 dark:text-blue-400">
                    your digital certificate
                  </span>.
                </p>
              )}
            </div>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-emerald-50 to-blue-100 dark:from-gray-900 dark:to-gray-800 py-4 sm:py-8 px-4">
      <form onSubmit={handleSubmit} className="max-w-3xl mx-auto space-y-4 sm:space-y-6">
        {/* Header */}
        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-md p-4 sm:p-8 border dark:border-gray-700">
          <h1 className="text-2xl sm:text-3xl font-bold text-gray-800 dark:text-gray-100 mb-2">Event Evaluation Form</h1>
          <p className="text-gray-600 dark:text-gray-400">
            {attendee?.personal_name} {attendee?.last_name}
          </p>
          <p className="text-base sm:text-lg font-medium text-gray-700 dark:text-gray-300 mt-4">{event?.name}</p>
        </div>

        {/* Overall Rating */}
        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-md p-4 sm:p-8 border dark:border-gray-700">
          <h3 className="text-base sm:text-lg font-semibold text-gray-800 dark:text-gray-100 mb-4 sm:mb-6">
            Overall, how do you rate the event? <span className="text-red-500">*</span>
          </h3>
          <RadioGroup value={overallRating} onValueChange={setOverallRating} required>
            {/* Desktop Layout */}
            <div className="hidden sm:flex justify-between items-center">
              <span className="text-sm text-gray-600 dark:text-gray-400">Very poor</span>
              <div className="flex gap-8">
                {[1, 2, 3, 4, 5].map((value) => (
                  <div key={value} className="flex flex-col items-center gap-2">
                    <span className="text-sm font-medium text-gray-700 dark:text-gray-300">{value}</span>
                    <RadioGroupItem 
                      value={value.toString()} 
                      id={`overall-${value}`}
                      className="h-6 w-6 border-2 border-gray-500 dark:border-gray-400"
                    />
                  </div>
                ))}
              </div>
              <span className="text-sm text-gray-600 dark:text-gray-400">Excellent</span>
            </div>

            {/* Mobile Layout */}
            <div className="flex sm:hidden flex-col gap-3">
              <div className="flex justify-between text-xs text-gray-600 dark:text-gray-400 mb-2">
                <span>Very poor</span>
                <span>Excellent</span>
              </div>
              <div className="flex justify-between">
                {[1, 2, 3, 4, 5].map((value) => (
                  <div key={value} className="flex flex-col items-center gap-2">
                    <span className="text-sm font-medium text-gray-700 dark:text-gray-300">{value}</span>
                    <RadioGroupItem 
                      value={value.toString()} 
                      id={`overall-mobile-${value}`}
                      className="h-6 w-6 border-2 border-gray-500 dark:border-gray-400"
                    />
                  </div>
                ))}
              </div>
            </div>
          </RadioGroup>
        </div>

        {/* Rating Questions */}
        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-md p-4 sm:p-8 border dark:border-gray-700">
          <h3 className="text-base sm:text-lg font-semibold text-gray-800 dark:text-gray-100 mb-4">
            Please rate your satisfaction with the content of the webinar by indicating your level
            of agreement or disagreement with each of the following statements. <span className="text-red-500">*</span>
          </h3>

          <div className="space-y-6">
            {/* Desktop Table Header */}
            <div className="hidden lg:grid grid-cols-[1fr_repeat(5,100px)] gap-4 text-sm font-medium text-gray-700 dark:text-gray-300 border-b border-gray-200 dark:border-gray-700 pb-3">
              <div></div>
              <div className="text-center">Strongly<br/>Disagree</div>
              <div className="text-center">Disagree</div>
              <div className="text-center">Neutral</div>
              <div className="text-center">Agree</div>
              <div className="text-center">Strongly<br/>Agree</div>
            </div>

            {ratingQuestions.map((question, index) => (
              <div key={index} className="border-b border-gray-200 dark:border-gray-700 pb-4 last:border-b-0">
                <div className="text-sm text-gray-700 dark:text-gray-300 mb-3 font-medium">{question}</div>
                <RadioGroup
                  value={ratings[index] || ""}
                  onValueChange={(value) => setRatings({ ...ratings, [index]: value })}
                  required
                >
                  {/* Desktop Layout */}
                  <div className="hidden lg:grid grid-cols-[1fr_repeat(5,100px)] gap-4">
                    <div></div>
                    {["1", "2", "3", "4", "5"].map((value) => (
                      <div key={value} className="flex justify-center">
                        <RadioGroupItem 
                          value={value} 
                          id={`q${index}-${value}`}
                          className="h-6 w-6 border-2 border-gray-500 dark:border-gray-400"
                        />
                      </div>
                    ))}
                  </div>

                  {/* Mobile/Tablet Layout */}
                  <div className="lg:hidden space-y-2">
                    {["1", "2", "3", "4", "5"].map((value, i) => (
                      <div key={value} className="flex items-center gap-3 py-2">
                        <RadioGroupItem 
                          value={value} 
                          id={`q${index}-mobile-${value}`}
                          className="h-5 w-5 border-2 border-gray-500 dark:border-gray-400 flex-shrink-0"
                        />
                        <Label 
                          htmlFor={`q${index}-mobile-${value}`}
                          className="text-sm cursor-pointer text-gray-700 dark:text-gray-300"
                        >
                          {ratingLabels[i]}
                        </Label>
                      </div>
                    ))}
                  </div>
                </RadioGroup>
              </div>
            ))}
          </div>
        </div>

        {/* Open-ended Questions */}
        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-md p-4 sm:p-8 border dark:border-gray-700 space-y-6">
          <div>
            <Label htmlFor="likeMost" className="text-sm sm:text-base font-semibold text-gray-800 dark:text-gray-100 mb-3 block">
              What did you like MOST about the event? <span className="text-red-500">*</span>
            </Label>
            <Textarea
              id="likeMost"
              placeholder="Answer"
              value={likeMost}
              onChange={(e) => setLikeMost(e.target.value)}
              required
              className="min-h-[80px] bg-white dark:bg-gray-900 border-gray-300 dark:border-gray-600 text-gray-900 dark:text-gray-100 placeholder:text-gray-500 dark:placeholder:text-gray-400"
            />
          </div>

          <div>
            <Label htmlFor="likeLeast" className="text-sm sm:text-base font-semibold text-gray-800 dark:text-gray-100 mb-3 block">
              What did you like LEAST about the event? <span className="text-red-500">*</span>
            </Label>
            <Textarea
              id="likeLeast"
              placeholder="Answer"
              value={likeLeast}
              onChange={(e) => setLikeLeast(e.target.value)}
              required
              className="min-h-[80px] bg-white dark:bg-gray-900 border-gray-300 dark:border-gray-600 text-gray-900 dark:text-gray-100 placeholder:text-gray-500 dark:placeholder:text-gray-400"
            />
          </div>

          <div>
            <Label htmlFor="futureTopic" className="text-sm sm:text-base font-semibold text-gray-800 dark:text-gray-100 mb-3 block">
              Suggest a future topic for event you would like to attend. <span className="text-red-500">*</span>
            </Label>
            <Textarea
              id="futureTopic"
              placeholder="Answer"
              value={futureTopic}
              onChange={(e) => setFutureTopic(e.target.value)}
              required
              className="min-h-[80px] bg-white dark:bg-gray-900 border-gray-300 dark:border-gray-600 text-gray-900 dark:text-gray-100 placeholder:text-gray-500 dark:placeholder:text-gray-400"
            />
          </div>

          <div>
            <Label htmlFor="comments" className="text-sm sm:text-base font-semibold text-gray-800 dark:text-gray-100 mb-3 block">
              Do you have any additional comments about the webinar? <span className="text-red-500">*</span>
            </Label>
            <Textarea
              id="comments"
              placeholder="Answer"
              value={additionalComments}
              onChange={(e) => setAdditionalComments(e.target.value)}
              required
              className="min-h-[80px] bg-white dark:bg-gray-900 border-gray-300 dark:border-gray-600 text-gray-900 dark:text-gray-100 placeholder:text-gray-500 dark:placeholder:text-gray-400"
            />
          </div>
        </div>

        {/* Mailing List */}
        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-md p-4 sm:p-8 border dark:border-gray-700">
          <h3 className="text-sm sm:text-base font-semibold text-gray-800 dark:text-gray-100 mb-4">
            I am interested in attending future events offered by Petrosphere and its partner(s).
            Please include me in the mailing list. <span className="text-red-500">*</span>
          </h3>
          <RadioGroup value={mailingList} onValueChange={setMailingList} required>
            <div className="flex flex-col gap-3">
              <div className="flex items-center space-x-2">
                <RadioGroupItem 
                  value="yes" 
                  id="mailing-yes"
                  className="h-5 w-5 border-2 border-gray-500 dark:border-gray-400"
                />
                <Label htmlFor="mailing-yes" className="cursor-pointer text-gray-700 dark:text-gray-300">Yes</Label>
              </div>
              <div className="flex items-center space-x-2">
                <RadioGroupItem 
                  value="no" 
                  id="mailing-no"
                  className="h-5 w-5 border-2 border-gray-500 dark:border-gray-400"
                />
                <Label htmlFor="mailing-no" className="cursor-pointer text-gray-700 dark:text-gray-300">No</Label>
              </div>
            </div>
          </RadioGroup>
        </div>

        {/* Submit Button */}
        <div className="flex justify-center pb-4 sm:pb-8">
          <Button
            type="submit"
            disabled={submitting}
            className="bg-indigo-900 hover:bg-indigo-800 dark:bg-indigo-600 dark:hover:bg-indigo-700 text-white px-8 sm:px-12 py-4 sm:py-6 text-base sm:text-lg rounded-lg w-full sm:w-auto"
          >
            {submitting ? (
              <>
                <Loader2 className="h-5 w-5 animate-spin mr-2" />
                Submitting...
              </>
            ) : (
              "Submit"
            )}
          </Button>
        </div>
      </form>
    </div>
  )
}