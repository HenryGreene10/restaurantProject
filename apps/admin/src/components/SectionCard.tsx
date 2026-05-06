import React from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'

export function SectionCard({
  title,
  subtitle,
  children,
}: {
  title: string
  subtitle?: string
  children: React.ReactNode
}) {
  return (
    <Card className="gap-0 border border-border/80 bg-card py-0 shadow-sm">
      <CardHeader className="gap-1 border-b border-border/70 px-6 py-5">
        <CardTitle>{title}</CardTitle>
        {subtitle ? <CardDescription>{subtitle}</CardDescription> : null}
      </CardHeader>
      <CardContent className="px-6 py-6">{children}</CardContent>
    </Card>
  )
}
