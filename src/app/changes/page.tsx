import Navigation from "@/src/components/Navigation";
import { supabase } from "@/lib/supabaseClient";

export const dynamic = "force-dynamic";

type ChangeRow = {
  id: string;
  dataset: string;
  change_type: string;
  change_date: string;
  summary: string | null;
};

const DATASET_LABELS: Record<string, string> = {
  data_centers: "Data centers",
  epa_facilities: "EPA facilities",
  power_plants: "Power plants",
};

const CHANGE_META: Record<string, { verb: string; color: string }> = {
  added: { verb: "Added", color: "#51cf66" },
  removed: { verb: "Removed", color: "#ff6b6b" },
  imported: { verb: "Imported", color: "#4dabf7" },
  updated: { verb: "Updated", color: "#ffa94d" },
};

function humanizeDate(iso: string): string {
  // iso is YYYY-MM-DD; format without pulling in a date library.
  const [y, m, d] = iso.split("-").map(Number);
  const months = [
    "January", "February", "March", "April", "May", "June",
    "July", "August", "September", "October", "November", "December",
  ];
  if (!y || !m || !d) return iso;
  return `${months[m - 1]} ${d}, ${y}`;
}

export default async function ChangesPage() {
  const { data } = await supabase
    .from("changes")
    .select("id,dataset,change_type,change_date,summary")
    .order("change_date", { ascending: false })
    .limit(300);

  const rows = (data ?? []) as ChangeRow[];

  // Group by date (rows already sorted newest-first).
  const byDate: { date: string; items: ChangeRow[] }[] = [];
  for (const row of rows) {
    const last = byDate[byDate.length - 1];
    if (last && last.date === row.change_date) last.items.push(row);
    else byDate.push({ date: row.change_date, items: [row] });
  }

  return (
    <div className="min-h-screen bg-ground text-white">
      <Navigation />

      <section className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
        <h1 className="text-4xl font-bold mb-3">What&apos;s changed</h1>
        <p className="opacity-80 leading-relaxed mb-10">
          A plain-language log of what&apos;s moved on the map — when data centers and facilities
          appear, get approved, or disappear. It&apos;s how you catch what&apos;s changing near you
          over time, not just what&apos;s there today.
        </p>

        {byDate.length === 0 ? (
          <div className="border border-white/10 rounded-xl p-6 bg-white/5 text-sm opacity-80">
            Nothing logged yet. As the map refreshes, new and changed sites will show up here.
          </div>
        ) : (
          <div className="space-y-10">
            {byDate.map((group) => (
              <div key={group.date}>
                <h2 className="text-sm font-semibold opacity-60 mb-4">
                  {humanizeDate(group.date)}
                </h2>
                <div className="space-y-3">
                  {group.items.map((item) => {
                    const meta = CHANGE_META[item.change_type] ?? {
                      verb: item.change_type,
                      color: "#ffffff",
                    };
                    const dataset =
                      DATASET_LABELS[item.dataset] ?? item.dataset;
                    return (
                      <div
                        key={item.id}
                        className="border border-white/10 rounded-xl p-4 bg-white/5 flex gap-3"
                      >
                        <span
                          className="mt-1 inline-block w-2.5 h-2.5 rounded-full flex-shrink-0"
                          style={{ background: meta.color }}
                        />
                        <div>
                          <div className="text-sm">
                            <span className="font-medium">{meta.verb}</span>{" "}
                            <span className="opacity-70">· {dataset}</span>
                          </div>
                          {item.summary && (
                            <div className="text-sm opacity-80 mt-0.5">
                              {item.summary}
                            </div>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
