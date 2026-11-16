import { useState } from "react";
import { Plus, MessageSquare } from "lucide-react";
import { ScenarioOption } from "../types/session";

interface ScenarioGridProps {
  scenarios: ScenarioOption[];
  selectedId: string;
  onSelectScenario: (scenario: ScenarioOption) => void;
  onCreateCustomScenario: (scenario: ScenarioOption) => void;
}

function ScenarioThumbnail({
  src,
  alt,
  title,
}: {
  src: string;
  alt: string;
  title: string;
}) {
  const [failed, setFailed] = useState(false);

  if (failed || !src) {
    return (
      <div className="w-full h-full bg-gradient-to-br from-zinc-100 via-zinc-200/70 to-zinc-100 flex flex-col items-center justify-center p-4 text-center">
        <MessageSquare className="w-6 h-6 text-zinc-400 mb-2" />
        <span className="text-xs font-medium text-zinc-600">{title}</span>
      </div>
    );
  }

  return (
    <img
      src={src}
      alt={alt}
      referrerPolicy="no-referrer"
      onError={() => setFailed(true)}
      className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-[1.02]"
    />
  );
}

export function ScenarioGrid({
  scenarios,
  selectedId,
  onSelectScenario,
  onCreateCustomScenario,
}: ScenarioGridProps) {
  const [showCustomForm, setShowCustomForm] = useState(false);
  const [customTitle, setCustomTitle] = useState("");
  const [customRole, setCustomRole] = useState("");
  const [customPrompt, setCustomPrompt] = useState("");

  const handleCustomSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!customTitle.trim() || !customPrompt.trim()) return;

    const newScenario: ScenarioOption = {
      id: `custom-${Date.now()}`,
      title: customTitle.trim(),
      setting: "Custom Roleplay",
      partnerRole: customRole.trim() || "Local Partner",
      description: customPrompt.trim(),
      imageUrl: scenarios[0]?.imageUrl ?? "",
      objectives: [
        "Lead the scene naturally in your target language",
        "Ask at least two follow-up questions",
        "Keep the exchange flowing smoothly",
      ],
      promptContext: customPrompt.trim(),
    };

    onCreateCustomScenario(newScenario);
    setCustomTitle("");
    setCustomRole("");
    setCustomPrompt("");
    setShowCustomForm(false);
  };

  return (
    <section id="scenarios" className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4">
        <div>
          <h2 className="font-display text-2xl font-medium tracking-tight text-zinc-900">
            Conversation Scenarios
          </h2>
          <p className="text-sm text-zinc-500 mt-1">
            Choose an everyday setting or create a custom roleplay tailored to your goals.
          </p>
        </div>

        <button
          type="button"
          onClick={() => setShowCustomForm((prev) => !prev)}
          className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl border border-zinc-200 bg-white hover:bg-zinc-50 text-xs font-medium text-zinc-800 transition-colors whitespace-nowrap shrink-0 cursor-pointer"
        >
          <Plus className="w-3.5 h-3.5" />
          <span>{showCustomForm ? "Close Builder" : "Custom Scenario"}</span>
        </button>
      </div>

      {showCustomForm && (
        <form
          onSubmit={handleCustomSubmit}
          className="bg-white border border-zinc-200 rounded-2xl p-6 space-y-4"
        >
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label
                htmlFor="custom-title"
                className="block text-xs font-medium text-zinc-700 mb-1.5"
              >
                Scenario Title
              </label>
              <input
                id="custom-title"
                type="text"
                value={customTitle}
                onChange={(e) => setCustomTitle(e.target.value)}
                placeholder="e.g., Boutique Hotel Check-In"
                required
                className="w-full px-3.5 py-2.5 rounded-xl bg-zinc-50 border border-zinc-200 text-sm text-zinc-900 focus:outline-none focus:border-blue-600 focus:bg-white"
              />
            </div>

            <div>
              <label
                htmlFor="custom-role"
                className="block text-xs font-medium text-zinc-700 mb-1.5"
              >
                Partner Role
              </label>
              <input
                id="custom-role"
                type="text"
                value={customRole}
                onChange={(e) => setCustomRole(e.target.value)}
                placeholder="e.g., Concierge"
                className="w-full px-3.5 py-2.5 rounded-xl bg-zinc-50 border border-zinc-200 text-sm text-zinc-900 focus:outline-none focus:border-blue-600 focus:bg-white"
              />
            </div>
          </div>

          <div>
            <label
              htmlFor="custom-prompt"
              className="block text-xs font-medium text-zinc-700 mb-1.5"
            >
              Situation & Context
            </label>
            <textarea
              id="custom-prompt"
              rows={2}
              value={customPrompt}
              onChange={(e) => setCustomPrompt(e.target.value)}
              placeholder="Describe the situation—for example, asking about a quieter room, breakfast hours, and neighborhood dinner spots."
              required
              className="w-full px-3.5 py-2.5 rounded-xl bg-zinc-50 border border-zinc-200 text-sm text-zinc-900 focus:outline-none focus:border-blue-600 focus:bg-white"
            />
          </div>

          <div className="flex justify-end gap-2">
            <button
              type="button"
              onClick={() => setShowCustomForm(false)}
              className="px-4 py-2 rounded-xl border border-zinc-200 text-xs font-medium text-zinc-700 hover:bg-zinc-50 cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-4 py-2 rounded-xl bg-blue-700 hover:bg-blue-800 text-white text-xs font-medium cursor-pointer"
            >
              Load Scenario
            </button>
          </div>
        </form>
      )}

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
        {scenarios.map((item) => {
          const isSelected = item.id === selectedId;
          return (
            <button
              key={item.id}
              type="button"
              onClick={() => onSelectScenario(item)}
              className={`group text-left rounded-2xl border overflow-hidden transition-colors flex flex-col cursor-pointer ${
                isSelected
                  ? "bg-white border-blue-700 ring-1 ring-blue-700"
                  : "bg-white border-zinc-200 hover:border-zinc-300"
              }`}
            >
              <div className="aspect-[4/3] w-full overflow-hidden bg-zinc-100">
                <ScenarioThumbnail
                  src={item.imageUrl}
                  alt={`${item.title} scene`}
                  title={item.title}
                />
              </div>

              <div className="p-4 flex-1 flex flex-col justify-between gap-3">
                <div>
                  <div className="text-xs text-zinc-500 mb-1">
                    {item.setting}
                  </div>
                  <h3 className="font-display text-base font-medium text-zinc-900 leading-snug">
                    {item.title}
                  </h3>
                  <p className="text-xs text-zinc-600 mt-1.5 leading-relaxed line-clamp-3">
                    {item.description}
                  </p>
                </div>

                <div className="pt-2 border-t border-zinc-100 flex items-center justify-between text-xs">
                  <span className="text-zinc-500">
                    Role: {item.partnerRole}
                  </span>
                  <span
                    className={`font-medium ${
                      isSelected ? "text-blue-700" : "text-zinc-800"
                    }`}
                  >
                    {isSelected ? "Active" : "Practice"}
                  </span>
                </div>
              </div>
            </button>
          );
        })}
      </div>
    </section>
  );
}
