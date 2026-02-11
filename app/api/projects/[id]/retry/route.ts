import { NextRequest, NextResponse } from "next/server"
import { neon } from "@neondatabase/serverless"

const sql = neon(process.env.DATABASE_URL!)

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const { jobId, jobType } = await request.json()

    if (!jobId || !jobType) {
      return NextResponse.json(
        { error: "Missing jobId or jobType" },
        { status: 400 }
      )
    }

    // Reset the job to pending status
    await sql`
      UPDATE processing_jobs
      SET 
        status = 'pending',
        progress = 0,
        error_message = NULL,
        started_at = NULL,
        completed_at = NULL
      WHERE id = ${jobId} AND project_id = ${id}
    `

    // Update project status back to processing if it was failed
    await sql`
      UPDATE projects
      SET status = 'processing', updated_at = NOW()
      WHERE id = ${id} AND status = 'failed'
    `

    return NextResponse.json({ success: true, message: "Job queued for retry" })
  } catch (error) {
    console.error("Error retrying job:", error)
    return NextResponse.json(
      { error: "Failed to retry job" },
      { status: 500 }
    )
  }
}
