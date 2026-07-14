package handlers

import "time"

// Start and end of the given day in UTC.
func dayBoundsUTC(t time.Time) (time.Time, time.Time) {
	utc := t.UTC()
	start := time.Date(utc.Year(), utc.Month(), utc.Day(), 0, 0, 0, 0, time.UTC)
	end := start.Add(24 * time.Hour)
	return start, end
}

// dayBoundsIndia returns today's boundaries for the app's primary user timezone.
// Gym visits are a daily habit, so "today" should match the user's calendar day
// rather than the server's UTC date.
func dayBoundsIndia(t time.Time) (time.Time, time.Time) {
	location, err := time.LoadLocation("Asia/Kolkata")
	if err != nil {
		location = time.UTC
	}
	local := t.In(location)
	start := time.Date(local.Year(), local.Month(), local.Day(), 0, 0, 0, 0, location)
	return start.UTC(), start.AddDate(0, 0, 1).UTC()
}
