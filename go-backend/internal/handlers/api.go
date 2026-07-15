package handlers

import (
	"database/sql"
	"net/http"
	"os"
	"strings"

	"github.com/go-chi/chi/v5"
)

type API struct {
	DB *sql.DB
}

func (a *API) Router() http.Handler {
	if a.DB == nil {
		panic("handlers.API DB is nil — did you forget to ConnectDB and pass it in?")
	}
	r := chi.NewRouter()
	r.Use(cors)

	// Health (outside /api so Docker or Kubernetes health probes stay simple)
	r.Get("/healthz", a.Healthz) // liveness
	r.Get("/readyz", a.Readyz)   // readiness (DB ping)

	// All application APIs under /api
	r.Route("/api", func(api chi.Router) {
		api.Post("/auth/login", a.Login)
		api.Get("/auth/session", a.Session)
		api.Get("/profile", a.GetProfile)
		api.Put("/profile", a.SaveProfile)
		api.Get("/notifications", a.ListNotifications)
		api.Delete("/notifications", a.ClearNotifications)
		api.Delete("/notifications/{id}", a.DismissNotification)
		// Daily logs
		api.Get("/workout/today", a.GymVisitedToday)
		api.Post("/workout/today", a.AddWorkoutForDay)
		api.Get("/gym-visits", a.ListGymVisits)
		api.Delete("/gym-visits/{id}", a.DeleteGymVisit)
		api.Get("/gym-visits/{id}/exercises", a.GetGymVisitExercises)
		api.Post("/gym-visits/{id}/exercises", a.CreateGymVisitExercise)
		api.Post("/meditation/today", a.AddMeditationForDay)
		api.Post("/sport/today", a.AddSportForDay)

		// Transactions
		api.Route("/transactions", func(tx chi.Router) {
			tx.Get("/", a.ListTransactions)
			tx.Post("/", a.CreateTransaction)
		})

		// Vehicles
		api.Get("/vehicles", a.ListVehicles)
		api.Post("/vehicles", a.CreateVehicle) // create
		api.Get("/vehicle-air-fills/latest", a.ListLatestVehicleAirFills)

		api.Route("/vehicles/{id}", func(v chi.Router) {
			v.Get("/", a.GetVehicle)       // retrieve by id
			v.Put("/", a.UpdateVehicle)    // full/partial update
			v.Patch("/", a.UpdateVehicle)  // alias to update
			v.Delete("/", a.DeleteVehicle) // delete
			v.Post("/air-fills", a.CreateVehicleAirFill)
			v.Post("/fuel-fillups", a.CreateFuelFillup)
			v.Get("/history", a.VehicleHistory)
		})
	})

	return r
}

// cors permits the separately hosted Next.js development server to call the API.
// Set CORS_ALLOWED_ORIGINS to a comma-separated list in production.
func cors(next http.Handler) http.Handler {
	allowedOrigins := strings.Split(os.Getenv("CORS_ALLOWED_ORIGINS"), ",")
	if os.Getenv("CORS_ALLOWED_ORIGINS") == "" {
		allowedOrigins = []string{"http://localhost:3000"}
	}

	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		origin := r.Header.Get("Origin")
		for _, allowedOrigin := range allowedOrigins {
			if origin == strings.TrimSpace(allowedOrigin) {
				w.Header().Set("Access-Control-Allow-Origin", origin)
				w.Header().Set("Access-Control-Allow-Credentials", "true")
				w.Header().Set("Access-Control-Allow-Headers", "Content-Type")
				w.Header().Set("Access-Control-Allow-Methods", "GET, POST, PUT, PATCH, DELETE, OPTIONS")
				w.Header().Add("Vary", "Origin")
				break
			}
		}

		if r.Method == http.MethodOptions {
			w.WriteHeader(http.StatusNoContent)
			return
		}
		next.ServeHTTP(w, r)
	})
}
