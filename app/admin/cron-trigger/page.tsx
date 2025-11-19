"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"

export default function CronTrigger() {
  const [result, setResult] = useState(null)
  const [loading, setLoading] = useState(false)

  const runCron = async () => {
    setLoading(true)
    const res = await fetch("/api/cron/process-queue")
    const data = await res.json()
    setResult(data)
    setLoading(false)
  }

  return (
    <div className="p-8">
      <h1 className="text-2xl font-bold mb-4">Manual Cron Trigger</h1>
      <Button onClick={runCron} disabled={loading}>
        {loading ? "Processing..." : "Run Queue Processor Now"}
      </Button>
      {result && (
        <pre className="mt-4 p-4 bg-gray-100 rounded">
          {JSON.stringify(result, null, 2)}
        </pre>
      )}
    </div>
  )
}