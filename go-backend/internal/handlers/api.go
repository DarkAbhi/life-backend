package handlers

import (
	"database/sql"
	"net/http"

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

	// Health (outside /api so Docker or Kubernetes health probes stay simple)
	r.Get("/healthz", a.Healthz) // liveness
	r.Get("/readyz", a.Readyz)   // readiness (DB ping)

	// All application APIs under /api
	r.Route("/api", func(api chi.Router) {
		// Daily logs
		api.Post("/workout/today", a.AddWorkoutForDay)
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

		api.Route("/vehicles/{id}", func(v chi.Router) {
			v.Get("/", a.GetVehicle)       // retrieve by id
			v.Put("/", a.UpdateVehicle)    // full/partial update
			v.Patch("/", a.UpdateVehicle)  // alias to update
			v.Delete("/", a.DeleteVehicle) // delete
		})
	})

	return r
}
