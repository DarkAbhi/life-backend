"use client";

import Link from "next/link";
import { SubmitEvent, useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import ConfirmationDialog from "../../components/design-system/confirmation-dialog";
import { ArrowLeft, Trash2, Plus } from "lucide-react";

const apiBaseURL =
  process.env.NEXT_PUBLIC_API_BASE_URL ?? "http://localhost:8080";

type ExerciseSet = {
  id?: number;
  set_number?: number;
  reps: string;
  weight: string;
};

type SavedExercise = {
  id: number;
  name: string;
  sets: Array<{
    id: number;
    set_number: number;
    reps: number;
    weight: number | null;
  }>;
};

function newSet(): ExerciseSet {
  return { reps: "", weight: "" };
}

export default function GymVisit() {
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const visitID = params.id;
  const [exercises, setExercises] = useState<SavedExercise[]>([]);
  const [exerciseName, setExerciseName] = useState("");
  const [sets, setSets] = useState<ExerciseSet[]>([newSet()]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [isConfirmingDelete, setIsConfirmingDelete] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    async function loadVisit() {
      try {
        const sessionResponse = await fetch(`${apiBaseURL}/api/auth/session`, {
          credentials: "include",
        });
        if (!sessionResponse.ok) {
          router.replace("/");
          return;
        }

        const response = await fetch(
          `${apiBaseURL}/api/gym-visits/${visitID}/exercises`,
          {
            credentials: "include",
          },
        );
        if (response.status === 404) {
          router.replace("/dashboard");
          return;
        }
        if (!response.ok) {
          setError("We couldn't load this gym visit. Please try again.");
          return;
        }
        setExercises((await response.json()) as SavedExercise[]);
      } catch {
        setError("We couldn't reach the server. Please try again.");
      } finally {
        setIsLoading(false);
      }
    }

    void loadVisit();
  }, [router, visitID]);

  function updateSet(index: number, field: keyof ExerciseSet, value: string) {
    setSets((currentSets) =>
      currentSets.map((set, setIndex) =>
        setIndex === index ? { ...set, [field]: value } : set,
      ),
    );
  }

  async function saveExercise(event: SubmitEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    setIsSaving(true);

    const payloadSets = sets.map((set) => ({
      reps: Number(set.reps),
      weight: set.weight === "" ? null : Number(set.weight),
    }));
    try {
      const response = await fetch(
        `${apiBaseURL}/api/gym-visits/${visitID}/exercises`,
        {
          method: "POST",
          credentials: "include",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ name: exerciseName, sets: payloadSets }),
        },
      );
      const body = (await response.json()) as SavedExercise & {
        error?: string;
      };
      if (!response.ok) {
        setError(body.error ?? "We couldn't save that exercise.");
        return;
      }
      setExercises((currentExercises) => [...currentExercises, body]);
      setExerciseName("");
      setSets([newSet()]);
    } catch {
      setError("We couldn't reach the server. Please try again.");
    } finally {
      setIsSaving(false);
    }
  }

  async function deleteVisit() {
    setError("");
    setIsDeleting(true);
    try {
      const response = await fetch(`${apiBaseURL}/api/gym-visits/${visitID}`, {
        method: "DELETE",
        credentials: "include",
      });
      if (!response.ok) {
        setError("We couldn't delete this gym visit. Please try again.");
        return;
      }
      router.replace("/gym-visits");
    } catch {
      setError("We couldn't reach the server. Please try again.");
    } finally {
      setIsDeleting(false);
    }
  }

  return (
    <main className="min-h-screen bg-background px-6 py-10 text-foreground sm:px-10 lg:px-16">
      <div className="mx-auto grid max-w-6xl gap-10 lg:grid-cols-[1.15fr_0.85fr]">
        <section>
          <div className="flex items-start justify-between gap-4">
            <Link
              className="flex items-center gap-1 text-sm font-semibold text-primary transition hover:opacity-80"
              href="/dashboard"
            >
              <ArrowLeft className="h-4 w-4" /> Dashboard
            </Link>
            <button
              className="flex items-center gap-1 rounded-lg px-3 py-2 text-sm font-semibold text-destructive transition hover:bg-destructive/10"
              onClick={() => setIsConfirmingDelete(true)}
              type="button"
            >
              <Trash2 className="h-4 w-4" /> Delete visit
            </button>
          </div>
          <p className="mt-5 text-sm font-semibold tracking-[0.18em] text-primary">
            GYM VISIT
          </p>
          <h1 className="mt-3 text-3xl font-bold tracking-tight text-foreground sm:text-4xl">
            Today&apos;s workout
          </h1>
          <p className="mt-3 text-base text-muted-foreground">
            Capture what you did, one exercise and set at a time.
          </p>

          <div className="mt-8 space-y-4">
            {isLoading ? (
              <p className="text-muted-foreground">Loading exercises…</p>
            ) : exercises.length === 0 ? (
              <div className="rounded-2xl border border-dashed border-border bg-card p-8">
                <p className="font-semibold text-foreground">
                  No exercises saved yet.
                </p>
                <p className="mt-2 text-sm text-muted-foreground">
                  Add your first exercise using the form.
                </p>
              </div>
            ) : (
              exercises.map((exercise) => (
                <article
                  className="rounded-2xl border border-border bg-card p-6 shadow-sm"
                  key={exercise.id}
                >
                  <h2 className="text-xl font-semibold text-foreground">
                    {exercise.name}
                  </h2>
                  <div className="mt-4 overflow-hidden rounded-lg border border-border">
                    <table className="w-full text-left text-sm">
                      <thead className="bg-muted text-muted-foreground">
                        <tr>
                          <th className="px-4 py-3 font-medium">Set</th>
                          <th className="px-4 py-3 font-medium">Reps</th>
                          <th className="px-4 py-3 font-medium">Weight</th>
                        </tr>
                      </thead>
                      <tbody>
                        {exercise.sets.map((set) => (
                          <tr
                            className="border-t border-border"
                            key={set.id}
                          >
                            <td className="px-4 py-3 text-muted-foreground">{set.set_number}</td>
                            <td className="px-4 py-3 text-muted-foreground">{set.reps}</td>
                            <td className="px-4 py-3 text-muted-foreground">
                              {set.weight === null
                                ? "Bodyweight"
                                : `${set.weight} kg`}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </article>
              ))
            )}
          </div>
        </section>

        <aside className="h-fit rounded-2xl border border-border bg-card p-6 shadow-sm sm:p-8">
          <h2 className="text-xl font-semibold text-foreground">
            Add an exercise
          </h2>
          <form className="mt-6 space-y-5" onSubmit={saveExercise}>
            <div>
              <label
                className="mb-2 block text-sm font-medium text-muted-foreground"
                htmlFor="exercise-name"
              >
                Workout name
              </label>
              <input
                className="w-full rounded-lg border border-border bg-background text-foreground px-4 py-3 outline-none transition focus:border-primary focus:ring-4 focus:ring-primary/15"
                id="exercise-name"
                maxLength={100}
                onChange={(event) => setExerciseName(event.target.value)}
                placeholder="e.g. Barbell squat"
                required
                value={exerciseName}
              />
            </div>

            <fieldset className="space-y-3">
              <legend className="text-sm font-medium text-muted-foreground">
                Sets
              </legend>
              {sets.map((set, index) => (
                <div
                  className="grid grid-cols-[auto_1fr_1fr] items-end gap-2"
                  key={index}
                >
                  <span className="pb-3 text-sm font-semibold text-muted-foreground">
                    {index + 1}
                  </span>
                  <label className="text-xs font-medium text-muted-foreground">
                    Reps
                    <input
                      className="mt-1 w-full rounded-lg border border-border bg-background text-foreground px-3 py-2 text-sm outline-none focus:border-primary focus:ring-2 focus:ring-primary/15"
                      min="1"
                      onChange={(event) =>
                        updateSet(index, "reps", event.target.value)
                      }
                      required
                      type="number"
                      value={set.reps}
                    />
                  </label>
                  <label className="text-xs font-medium text-muted-foreground">
                    Weight (kg)
                    <input
                      className="mt-1 w-full rounded-lg border border-border bg-background text-foreground px-3 py-2 text-sm outline-none focus:border-primary focus:ring-2 focus:ring-primary/15"
                      min="0"
                      onChange={(event) =>
                        updateSet(index, "weight", event.target.value)
                      }
                      placeholder="Optional"
                      step="0.5"
                      type="number"
                      value={set.weight}
                    />
                  </label>
                </div>
              ))}
              <button
                className="flex items-center gap-1 text-sm font-semibold text-primary transition hover:opacity-80"
                onClick={() =>
                  setSets((currentSets) => [...currentSets, newSet()])
                }
                type="button"
              >
                <Plus className="h-4 w-4" /> Add another set
              </button>
            </fieldset>

            {error && (
              <p className="text-sm text-destructive" role="alert">
                {error}
              </p>
            )}
            <button
              className="w-full rounded-lg bg-primary px-4 py-3 text-sm font-semibold text-primary-foreground transition hover:bg-primary/90 disabled:cursor-not-allowed disabled:bg-muted disabled:text-muted-foreground"
              disabled={isSaving}
              type="submit"
            >
              {isSaving ? "Saving exercise…" : "Save exercise"}
            </button>
          </form>
        </aside>
      </div>

      <ConfirmationDialog
        isOpen={isConfirmingDelete}
        onClose={() => setIsConfirmingDelete(false)}
        onConfirm={() => void deleteVisit()}
        title="Delete this gym visit?"
        description="This permanently removes the visit and every exercise and set saved with it."
        confirmText="Delete visit"
        confirmLoadingText="Deleting…"
        isLoading={isDeleting}
        error={error}
        variant="destructive"
      />
    </main>
  );
}
