package handlers

import "time"

// Start and end of the given day in UTC.
func dayBoundsUTC(t time.Time) (time.Time, time.Time) {
	utc := t.UTC()
	start := time.Date(utc.Year(), utc.Month(), utc.Day(), 0, 0, 0, 0, time.UTC)
	end := start.Add(24 * time.Hour)
	return start, end
}