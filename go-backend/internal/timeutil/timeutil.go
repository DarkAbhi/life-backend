package timeutil

import "time"

const IndiaTimeZone = "Asia/Kolkata"

// DayBoundsIndia returns today's boundaries for the app's primary user timezone.
func DayBoundsIndia(t time.Time) (time.Time, time.Time) {
	location, err := time.LoadLocation(IndiaTimeZone)
	if err != nil {
		location = time.UTC
	}
	local := t.In(location)
	start := time.Date(local.Year(), local.Month(), local.Day(), 0, 0, 0, 0, location)
	return start.UTC(), start.AddDate(0, 0, 1).UTC()
}

// NextMonthDate returns the string formatted date ("YYYY-MM-DD") representing the first day of next month in India timezone.
func NextMonthDate() string {
	location, err := time.LoadLocation(IndiaTimeZone)
	if err != nil {
		location = time.UTC
	}
	if location == nil {
		location = time.UTC
	}
	now := time.Now().UTC().In(location)
	return time.Date(now.Year(), now.Month()+1, 1, 0, 0, 0, 0, location).Format("2006-01-02")
}
