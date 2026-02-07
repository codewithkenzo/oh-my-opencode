export type StartupTimingReport = {
  marks: Array<{
    label: string
    elapsedMs: number
    deltaMs: number
  }>
  totalMs: number
}

type StartupMark = {
  label: string
  timestamp: number
}

export function createStartupTimer(): {
  mark: (label: string) => void
  report: () => StartupTimingReport
  elapsed: () => number
} {
  const startedAt = performance.now()
  const marks: StartupMark[] = []

  const elapsed = (): number => performance.now() - startedAt

  const mark = (label: string): void => {
    marks.push({ label, timestamp: performance.now() })
  }

  const report = (): StartupTimingReport => {
    let previousTimestamp = startedAt

    const mappedMarks = marks.map((entry) => {
      const elapsedMs = entry.timestamp - startedAt
      const deltaMs = entry.timestamp - previousTimestamp
      previousTimestamp = entry.timestamp

      return {
        label: entry.label,
        elapsedMs,
        deltaMs,
      }
    })

    return {
      marks: mappedMarks,
      totalMs: elapsed(),
    }
  }

  return {
    mark,
    report,
    elapsed,
  }
}
