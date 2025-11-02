// components/template-debug.tsx
// Temporary component to debug certificate templates
"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"

export function TemplateDebug({ eventId }: { eventId: number }) {
  const [template, setTemplate] = useState<any>(null)
  const [loading, setLoading] = useState(false)

  const fetchTemplate = async () => {
    setLoading(true)
    try {
      const response = await fetch(`/api/certificate-template?eventId=${eventId}`)
      const data = await response.json()
      setTemplate(data.template)
      console.log("Template data:", data.template)
    } catch (error) {
      console.error("Error fetching template:", error)
    } finally {
      setLoading(false)
    }
  }

  return (
    <Card className="mt-4 border-yellow-300 bg-yellow-50">
      <CardHeader>
        <CardTitle className="text-sm">🐛 Debug: Certificate Template</CardTitle>
      </CardHeader>
      <CardContent>
        <Button onClick={fetchTemplate} disabled={loading} size="sm">
          {loading ? "Loading..." : "Check Saved Template"}
        </Button>

        {template && (
          <div className="mt-4 space-y-2 text-xs">
            <div>
              <strong>Event ID:</strong> {template.eventId}
            </div>
            <div>
              <strong>Image URL:</strong> 
              <div className="break-all text-blue-600">{template.imageUrl?.substring(0, 80)}...</div>
            </div>
            <div>
              <strong>Fields Count:</strong> {template.fields?.length || 0}
            </div>
            {template.fields?.map((field: any, i: number) => (
              <div key={i} className="ml-4 p-2 bg-white rounded border">
                <div><strong>Label:</strong> {field.label}</div>
                <div><strong>Value:</strong> {field.value}</div>
                <div><strong>Position:</strong> X: {field.x}, Y: {field.y}</div>
                <div><strong>Font:</strong> {field.fontSize}px, {field.fontWeight}</div>
                <div><strong>Color:</strong> {field.color}</div>
                <div><strong>Align:</strong> {field.align}</div>
              </div>
            ))}
          </div>
        )}

        {template === null && !loading && (
          <p className="mt-2 text-sm text-gray-500">Click button to check template</p>
        )}
      </CardContent>
    </Card>
  )
}

// Usage in your event details page:
// import { TemplateDebug } from "@/components/template-debug"
// 
// <TemplateDebug eventId={event.id} />